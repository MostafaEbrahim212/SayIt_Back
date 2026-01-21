const { MessageService, ConversationService } = require('../services');
const { success, error } = require('../utils/response');
const mongoose = require('mongoose');

const messageService = new MessageService();
const conversationService = new ConversationService();

/**
 * Message Controller - Handles HTTP requests for messages
 */
class MessageController {
  /**
   * Send a new message
   */
  async sendMessage(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.body;

      if (receiverId === senderId) {
        return error(res, 'Cannot message yourself', null, 400);
      }

      const message = await messageService.sendMessage(senderId, receiverId, req.body);
      return success(res, 'Message sent', message, 201);
    } catch (err) {
      console.error('Send message error:', err);
      if (err.message === 'Reply target not found in this conversation') {
        return error(res, err.message, null, 404);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * List user conversations
   */
  async listConversations(req, res) {
    try {
      const userId = req.user.id;
      const conversations = await conversationService.getUserConversations(userId);

      // Mask anonymous messages in last message
      const shaped = conversations.map(conv => {
        const data = conv.toObject({ virtuals: true });
        if (conv.lastMessage) {
          data.lastMessage = messageService.maskAnonymous(conv.lastMessage, userId);
        }
        return data;
      });

      return success(res, 'Conversations loaded', shaped);
    } catch (err) {
      console.error('List conversations error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      // Verify user is participant
      const isParticipant = await conversationService.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return error(res, 'Forbidden', null, 403);
      }

      const messages = await messageService.getConversationMessages(conversationId, userId);
      return success(res, 'Messages loaded', messages);
    } catch (err) {
      console.error('Get messages error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const result = await messageService.markAsRead(id, req.user.id);
      return success(res, 'Message marked as read', result);
    } catch (err) {
      console.error('Mark as read error:', err);
      if (err.message === 'Message not found') {
        return error(res, err.message, null, 404);
      }
      if (err.message === 'Forbidden') {
        return error(res, err.message, null, 403);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Toggle share to profile
   */
  async toggleShare(req, res) {
    try {
      const { id } = req.params;
      const { share } = req.body;
      const result = await messageService.toggleShare(id, req.user.id, share);
      return success(res, 'Share preference updated', result);
    } catch (err) {
      console.error('Toggle share error:', err);
      if (err.message === 'Message not found') {
        return error(res, err.message, null, 404);
      }
      if (err.message === 'Forbidden') {
        return error(res, err.message, null, 403);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get shared messages for a user
   */
  async getSharedMessages(req, res) {
    try {
      const { userId } = req.params;
      const messages = await messageService.getSharedMessages(userId, req.user.id);
      return success(res, 'Shared messages', messages);
    } catch (err) {
      console.error('Get shared messages error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get anonymous messages
   */
  async getAnonymousMessages(req, res) {
    try {
      const messages = await messageService.getAnonymousMessages(req.user.id);
      return success(res, 'Anonymous messages loaded', messages);
    } catch (err) {
      console.error('Get anonymous messages error:', err);
      return error(res, 'Server error', null, 500);
    }
  }
}

// Export controller instance
module.exports = new MessageController();
