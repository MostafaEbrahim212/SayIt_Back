const BaseService = require('./BaseService');
const Message = require('../models/Message');
const ConversationService = require('./ConversationService');
const NotificationService = require('./NotificationService');
const { sendMessageToUser } = require('../socket');

/**
 * Message Service - Handles all message-related business logic
 */
class MessageService extends BaseService {
  constructor() {
    super(Message);
    this.conversationService = new ConversationService();
    this.notificationService = new NotificationService();
  }

  /**
   * Mask anonymous message sender details
   */
  maskAnonymous(messageDoc, viewerId) {
    if (!messageDoc) return null;
    const message = messageDoc.toObject ? messageDoc.toObject({ virtuals: true }) : messageDoc;

    const senderId = message.sender?._id?.toString?.() || message.sender?.toString?.();
    if (message.isAnonymous && senderId && senderId !== viewerId) {
      message.sender = { id: null, name: 'Anonymous', email: '' };
    }

    return message;
  }

  /**
   * Send a new message
   */
  async sendMessage(senderId, receiverId, data) {
    const { content, isAnonymous = false, replyTo, shareToProfile = false, parentIsAnonymous = false } = data;

    // Validate reply target if provided
    let parentMessage = null;
    let isReplyToAnonymous = false;
    
    if (replyTo) {
      parentMessage = await this.findById(replyTo);
      if (!parentMessage) {
        throw new Error('Reply target not found');
      }
      // Check if parent is anonymous or reply to anonymous thread
      isReplyToAnonymous = parentMessage.isAnonymous || parentMessage.parentIsAnonymous;
    }

    // Don't create conversation for anonymous messages or replies to anonymous messages
    const shouldLinkConversation = !isAnonymous && !isReplyToAnonymous;
    const conversation = shouldLinkConversation
      ? await this.conversationService.ensureConversation(senderId, receiverId)
      : null;

    // Validate conversation match only for non-anonymous threads
    if (shouldLinkConversation && replyTo && parentMessage) {
      if (!parentMessage.conversation || parentMessage.conversation.toString() !== conversation.id) {
        throw new Error('Reply target not found in this conversation');
      }
    }

    // Create message
    const now = new Date();
    console.log({
      conversation: conversation ? conversation.id : null,
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      isAnonymous: !!isAnonymous,
      parentIsAnonymous: isReplyToAnonymous || !!isAnonymous,
      replyTo: replyTo || undefined,
      isSharedToProfile: !!shareToProfile,
      sharedBy: shareToProfile ? senderId : undefined,
      sharedAt: shareToProfile ? now : undefined
    })
    const message = await this.create({
      conversation: conversation ? conversation.id : null,
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      isAnonymous: !!isAnonymous,
      parentIsAnonymous: isReplyToAnonymous || !!isAnonymous,
      replyTo: replyTo || undefined,
      isSharedToProfile: !!shareToProfile,
      sharedBy: shareToProfile ? senderId : undefined,
      sharedAt: shareToProfile ? now : undefined
    });

    // Update conversation only for non-anonymous messages
    if (conversation) {
      await this.conversationService.updateLastMessage(conversation.id, message._id);
    }

    // Populate message
    await message.populate('sender', 'name email');
    await message.populate('receiver', 'name email');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'id sender content createdAt',
        populate: { path: 'sender', select: 'name email' }
      });
    }

    // Create notification
    const senderName = (message.sender && !isAnonymous) ? message.sender.name : 'Someone';
    const notificationType = replyTo ? 'reply' : 'message';
    const notificationText = isAnonymous 
      ? 'New anonymous message' 
      : `New message from ${senderName}`;

    await this.notificationService.createNotification(
      receiverId,
      senderId,
      notificationType,
      notificationText
    );

    // Send real-time update via socket
    const messageForReceiver = this.maskAnonymous(message, receiverId);
    sendMessageToUser(receiverId, 'message.new', messageForReceiver);

    return messageForReceiver;
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId, userId) {
    const messages = await this.find(
      { conversation: conversationId },
      {
        sort: { createdAt: 1 },
        populate: [
          { path: 'sender', select: 'name email' },
          { path: 'receiver', select: 'name email' },
          {
            path: 'replyTo',
            select: 'id sender content createdAt',
            populate: { path: 'sender', select: 'name email' }
          }
        ]
      }
    );

    return messages.map(msg => this.maskAnonymous(msg, userId));
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, userId) {
    const message = await this.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.receiver.toString() !== userId) {
      throw new Error('Forbidden');
    }

    if (!message.readAt) {
      message.readAt = new Date();
      await message.save();

      // Send read receipt via socket
      sendMessageToUser(message.sender.toString(), 'message.read', {
        messageId: message.id,
        readAt: message.readAt,
        readBy: userId
      });
    }

    return { id: message.id, readAt: message.readAt };
  }

  /**
   * Toggle share to profile
   */
  async toggleShare(messageId, userId, share) {
    const message = await this.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    const isParticipant = [message.sender, message.receiver]
      .some(u => u.toString() === userId);
    
    if (!isParticipant) {
      throw new Error('Forbidden');
    }

    if (share) {
      message.isSharedToProfile = true;
      message.sharedBy = userId;
      message.sharedAt = new Date();
    } else {
      message.isSharedToProfile = false;
      message.sharedBy = null;
      message.sharedAt = null;
    }

    await message.save();
    return this.maskAnonymous(message, userId);
  }

  /**
   * Get shared messages for a user
   */
  async getSharedMessages(userId, requesterId) {
    const messages = await this.find(
      { isSharedToProfile: true, sharedBy: userId },
      {
        sort: { sharedAt: -1 },
        limit: 50,
        populate: [
          { path: 'sender', select: 'name email' },
          { path: 'receiver', select: 'name email' },
          {
            path: 'replyTo',
            select: 'id sender content createdAt',
            populate: { path: 'sender', select: 'name email' }
          }
        ]
      }
    );

    // Fetch replies to shared messages
    const messageIds = messages.map(m => m._id);
    const replies = await this.find(
      { replyTo: { $in: messageIds } },
      {
        populate: [
          { path: 'sender', select: 'name email' },
          { path: 'receiver', select: 'name email' }
        ]
      }
    );

    const allMessages = [...messages, ...replies];
    return allMessages.map(msg => this.maskAnonymous(msg, requesterId));
  }

  /**
   * Get anonymous messages received by user
   */
  async getAnonymousMessages(userId) {
    const messages = await this.find(
      { receiver: userId, isAnonymous: true },
      {
        sort: { createdAt: -1 },
        populate: [
          { path: 'sender', select: 'name email' },
          { path: 'receiver', select: 'name email' },
          {
            path: 'replyTo',
            select: 'id sender content createdAt',
            populate: { path: 'sender', select: 'name email' }
          }
        ]
      }
    );

    // Fetch replies to anonymous messages
    const messageIds = messages.map(m => m._id);
    const replies = await this.find(
      { replyTo: { $in: messageIds } },
      {
        sort: { createdAt: 1 },
        populate: [
          { path: 'sender', select: 'name email' },
          { path: 'receiver', select: 'name email' }
        ]
      }
    );

    return [...messages, ...replies];
  }
}

module.exports = MessageService;
