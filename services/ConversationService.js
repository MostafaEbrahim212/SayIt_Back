const BaseService = require('./BaseService');
const Conversation = require('../models/Conversation');

/**
 * Conversation Service - Handles conversation-related business logic
 */
class ConversationService extends BaseService {
  constructor() {
    super(Conversation);
  }

  /**
   * Ensure conversation exists between two users
   */
  async ensureConversation(userA, userB) {
    const participants = [userA.toString(), userB.toString()].sort();
    
    let conversation = await this.findOne({
      participants: { $size: 2, $all: participants }
    });

    if (!conversation) {
      conversation = await this.create({ participants });
    }

    return conversation;
  }

  /**
   * Update last message in conversation
   */
  async updateLastMessage(conversationId, messageId) {
    return await this.updateById(conversationId, { lastMessage: messageId });
  }

  /**
   * Get user conversations with last message
   */
  async getUserConversations(userId) {
    return await this.find(
      { participants: userId },
      {
        sort: { updatedAt: -1 },
        populate: [
          { path: 'participants', select: 'name email avatar isOnline lastSeen' },
          {
            path: 'lastMessage',
            populate: [
              { path: 'sender', select: 'name email avatar isOnline lastSeen' },
              { path: 'receiver', select: 'name email avatar isOnline lastSeen' }
            ]
          }
        ]
      }
    );
  }

  /**
   * Check if user is participant in conversation
   */
  async isParticipant(conversationId, userId) {
    const conversation = await this.findById(conversationId);
    if (!conversation) return false;
    
    return conversation.participants.some(p => p.toString() === userId);
  }
}

module.exports = ConversationService;
