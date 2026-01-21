const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Socket');
const Relation = require('../models/Relations');
const { success, error } = require('../utils/response');
const { sendNotification } = require('../socket');

// Hide sender details when message is anonymous and viewer is not the sender
const maskAnonymous = (messageDoc, viewerId) => {
  if (!messageDoc) return null;
  const message = messageDoc.toObject({ virtuals: true });

  const senderId = message.sender?._id?.toString?.() || message.sender?.toString?.();
  if (message.isAnonymous && senderId && senderId !== viewerId) {
    message.sender = { id: null, name: 'Anonymous', email: '' };
  }

  return message;
};

// Ensure conversation exists between two users
const ensureConversation = async (userA, userB) => {
  const participants = [userA.toString(), userB.toString()].sort();
  let conversation = await Conversation.findOne({
    participants: { $size: 2, $all: participants }
  });

  if (!conversation) {
    conversation = await Conversation.create({ participants });
  }

  return conversation;
};

// Send a new message (supports anonymous + reply threading + optional share)
exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, content, isAnonymous = false, replyTo, shareToProfile = false } = req.body;

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return error(res, { key: 'invalid.receiver.id' }, null, 400);
  }

  if (!content || !content.trim()) {
    return error(res, { key: 'message.content.required' }, null, 400);
  }

  if (receiverId === senderId) {
    return error(res, { key: 'cannot.message.yourself' }, null, 400);
  }

  try {
    let parentMessage = null;
    let isReplyToAnonymous = false;
    let conversation = null;

    // Check if this is a reply to another message
    if (replyTo) {
      parentMessage = await Message.findById(replyTo);
      if (!parentMessage) {
        return error(res, { key: 'reply.target.not.found' }, null, 404);
      }
      // Check if parent is anonymous or reply to anonymous thread
      isReplyToAnonymous = parentMessage.isAnonymous || parentMessage.parentIsAnonymous;
    }

    // Don't create conversation for anonymous messages or replies to anonymous messages
    const shouldLinkConversation = !isAnonymous && !isReplyToAnonymous;
    if (shouldLinkConversation) {
      conversation = await ensureConversation(senderId, receiverId);
      // Validate conversation match only for non-anonymous threads
      if (replyTo && parentMessage) {
        if (!parentMessage.conversation || parentMessage.conversation.toString() !== conversation.id) {
          return error(res, { key: 'reply.target.not.in.conversation' }, null, 404);
        }
      }
    }

    const now = new Date();
    const message = await Message.create({
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
      conversation.lastMessage = message._id;
      await conversation.save();
    }

    // Populate message with sender and receiver data
    await message.populate('sender', 'name email avatar isOnline lastSeen');
    await message.populate('receiver', 'name email avatar isOnline lastSeen');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'id sender content createdAt',
        populate: { path: 'sender', select: 'name email' }
      });
    }

    // Create notification for receiver
    let senderName = 'Someone';
    if (message.sender && !isAnonymous) {
      senderName = message.sender.name || senderName;
    }

    const notify = await Notification.create({
      user: receiverId,
      from: senderId,
      type: replyTo ? 'reply' : 'message',
      text: isAnonymous ? 'New anonymous message' : `New message from ${senderName}`
    });
    sendNotification(receiverId, notify);

    // Send real-time message via socket with anonymous masking
    const { sendMessageToUser } = require('../socket');
    const messageForReceiver = maskAnonymous(message, receiverId);
    sendMessageToUser(receiverId, 'message.new', messageForReceiver);

    success(res, { key: 'message.sent' }, messageForReceiver, 201);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// List conversations for current user with last message
exports.listConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: [
          { path: 'sender', select: 'name email avatar isOnline lastSeen' },
          { path: 'receiver', select: 'name email avatar isOnline lastSeen' }
        ]
      });

    const shaped = conversations.map(conv => {
      const data = conv.toObject({ virtuals: true });
      if (conv.lastMessage) {
        data.lastMessage = maskAnonymous(conv.lastMessage, userId);
      }
      return data;
    });

    success(res, 'Conversations loaded', shaped);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return error(res, { key: 'invalid.conversation.id' }, null, 400);
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return error(res, { key: 'conversation.not.found' }, null, 404);

    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) return error(res, { key: 'forbidden' }, null, 403);

    const messages = await Message.find({ 
      conversation: conversationId,
      isAnonymous: false,
      parentIsAnonymous: false
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar isOnline lastSeen')
      .populate('receiver', 'name email avatar isOnline lastSeen')
      .populate({
        path: 'replyTo',
        select: 'id sender content createdAt',
        populate: { path: 'sender', select: 'name email avatar isOnline lastSeen' }
      });

    const shaped = messages.map(msg => maskAnonymous(msg, userId));
    success(res, { key: 'messages.loaded' }, shaped);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Mark message as read and notify sender
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return error(res, { key: 'invalid.message.id' }, null, 400);
  }

  try {
    const message = await Message.findById(id);
    if (!message) return error(res, { key: 'message.not.found' }, null, 404);
    if (message.receiver.toString() !== userId) return error(res, { key: 'forbidden' }, null, 403);

    if (!message.readAt) {
      message.readAt = new Date();
      await message.save();
      
      // Send real-time read receipt to sender
      const { sendMessageToUser } = require('../socket');
      sendMessageToUser(message.sender.toString(), 'message.read', { 
        messageId: message.id, 
        readAt: message.readAt,
        readBy: userId 
      });
    }

    success(res, { key: 'message.marked.read' }, { id: message.id, readAt: message.readAt });
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Toggle share to profile for this message
exports.toggleShare = async (req, res) => {
  const { id } = req.params;
  const { share } = req.body;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return error(res, { key: 'invalid.message.id' }, null, 400);
  }

  if (typeof share !== 'boolean') {
    return error(res, { key: 'share.must.be.boolean' }, null, 400);
  }

  try {
    const message = await Message.findById(id);
    if (!message) return error(res, { key: 'message.not.found' }, null, 404);

    const isParticipant = [message.sender, message.receiver].some(u => u.toString() === userId);
    if (!isParticipant) return error(res, { key: 'forbidden' }, null, 403);

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
    success(res, { key: 'share.preference.updated' }, maskAnonymous(message, userId));
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Get shared messages for a specific user profile
exports.getSharedMessages = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return error(res, { key: 'invalid.user.id' }, null, 400);
  }

  try {
    const messages = await Message.find({ isSharedToProfile: true, sharedBy: userId })
      .sort({ sharedAt: -1 })
      .limit(50)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate({
        path: 'replyTo',
        select: 'id sender content createdAt',
        populate: { path: 'sender', select: 'name email' }
      });

    // Also fetch replies to shared messages
    const messageIds = messages.map(m => m._id);
    const replies = await Message.find({
      replyTo: { $in: messageIds }
    })
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    const allMessages = [...messages, ...replies];

    const shaped = allMessages.map(msg => maskAnonymous(msg, req.user.id));
    success(res, { key: 'shared.messages' }, shaped);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Get anonymous messages received by current user (with replies)
exports.getAnonymousMessages = async (req, res) => {
  const userId = req.user.id;

  try {
    const messages = await Message.find({
      receiver: userId,
      isAnonymous: true
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate({
        path: 'replyTo',
        select: 'id sender content createdAt',
        populate: { path: 'sender', select: 'name email' }
      });

    // Also fetch replies to these anonymous messages
    const messageIds = messages.map(m => m._id);
    const replies = await Message.find({
      replyTo: { $in: messageIds }
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    const allMessages = [...messages, ...replies];
    success(res, { key: 'anonymous.messages.loaded' }, allMessages);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Get anonymous messages SENT by current user (with replies)
exports.getSentAnonymousMessages = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find ALL anonymous messages sent by the user (root + replies)
    const sentMessages = await Message.find({
      sender: userId,
      $or: [
        { isAnonymous: true },
        { parentIsAnonymous: true }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate({
        path: 'replyTo',
        select: 'id sender content createdAt isAnonymous',
        populate: { path: 'sender', select: 'name email' }
      });

    // Find root anonymous messages sent by user to fetch replies from others
    const rootMessageIds = sentMessages
      .filter(m => !m.replyTo)
      .map(m => m._id);

    // Fetch replies from OTHERS to user's anonymous messages
    const repliesFromOthers = rootMessageIds.length > 0 
      ? await Message.find({
          replyTo: { $in: rootMessageIds },
          sender: { $ne: userId }
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'name email')
        .populate('receiver', 'name email')
      : [];

    const allMessages = [...sentMessages, ...repliesFromOthers];
    
    // Remove duplicates and sort by createdAt
    const uniqueMessages = Array.from(
      new Map(allMessages.map(m => [m.id, m])).values()
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    success(res, { key: 'sent.anonymous.messages.loaded' }, uniqueMessages);
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};

// Get aggregated stats for current user: followers, following, messages sent/received, anonymous sent/received
exports.getStats = async (req, res) => {
  const userId = req.user.id;

  try {
    const [
      followers,
      following,
      messagesSent,
      messagesReceived,
      anonymousSent,
      anonymousReceived
    ] = await Promise.all([
      Relation.countDocuments({ to: userId, type: 'follow' }),
      Relation.countDocuments({ from: userId, type: 'follow' }),
      Message.countDocuments({ sender: userId }),
      Message.countDocuments({ receiver: userId }),
      Message.countDocuments({ sender: userId, isAnonymous: true }),
      Message.countDocuments({ receiver: userId, isAnonymous: true })
    ]);

    success(res, 'Stats', {
      followers,
      following,
      messagesSent,
      messagesReceived,
      anonymousSent,
      anonymousReceived
    });
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};


