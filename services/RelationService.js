const BaseService = require('./BaseService');
const Relation = require('../models/Relations');
const NotificationService = require('./NotificationService');
const User = require('../models/User');

/**
 * Relation Service - Handles user relationships (follow/block)
 */
class RelationService extends BaseService {
  constructor() {
    super(Relation);
    this.notificationService = new NotificationService();
  }

  /**
   * Add or update relation
   */
  async addRelation(fromUserId, toUserId, type) {
    if (!['follow', 'block'].includes(type)) {
      throw new Error('Invalid relation type');
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot follow or block yourself');
    }

    let relation = await this.findOne({ from: fromUserId, to: toUserId });

    if (relation) {
      // Update existing relation
      relation.type = type;
      await relation.save();
    } else {
      // Create new relation
      relation = await this.create({ from: fromUserId, to: toUserId, type });

      // Send notification for follow
      if (type === 'follow') {
        const user = await User.findById(fromUserId).select('name');
        await this.notificationService.createNotification(
          toUserId,
          fromUserId,
          'follow',
          `${user.name} started following you.`
        );
      }
    }

    return relation;
  }

  /**
   * Remove relation
   */
  async removeRelation(relationId) {
    const result = await this.model.deleteOne({ _id: relationId });

    if (result.deletedCount === 0) {
      throw new Error('Relation not found');
    }

    return { success: true };
  }

  /**
   * Get user relations with status
   */
  async getUserRelations(fromUserId, toUserId = null) {
    const query = { from: fromUserId };
    if (toUserId) query.to = toUserId;

    const relations = await this.find(query);

    const followed = relations.some(r => r.type === 'follow');
    const blocked = relations.some(r => r.type === 'block');

    return { relations, followed, blocked };
  }

  /**
   * Get single relation
   */
  async getRelation(query) {
    const relation = await this.findOne(query);
    if (!relation) {
      throw new Error('Relation not found');
    }
    return relation;
  }

  /**
   * Check if user is followed by another user
   */
  async isFollowing(fromUserId, toUserId) {
    const relation = await this.findOne({
      from: fromUserId,
      to: toUserId,
      type: 'follow'
    });

    return !!relation;
  }

  /**
   * Check if user is blocked by another user
   */
  async isBlocked(fromUserId, toUserId) {
    const relation = await this.findOne({
      from: fromUserId,
      to: toUserId,
      type: 'block'
    });

    return !!relation;
  }

  /**
   * Check if users have blocked each other (bidirectional)
   */
  async hasBlockRelation(userA, userB) {
    const blockExists = await this.findOne({
      $or: [
        { from: userA, to: userB, type: 'block' },
        { from: userB, to: userA, type: 'block' }
      ]
    });

    return !!blockExists;
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId) {
    return await this.find(
      { to: userId, type: 'follow' },
      { populate: { path: 'from', select: 'name email' } }
    );
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId) {
    return await this.find(
      { from: userId, type: 'follow' },
      { populate: { path: 'to', select: 'name email' } }
    );
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId) {
    return await this.find(
      { from: userId, type: 'block' },
      { populate: { path: 'to', select: 'name email' } }
    );
  }

  /**
   * Unfollow user
   */
  async unfollow(fromUserId, toUserId) {
    const result = await this.model.deleteOne({
      from: fromUserId,
      to: toUserId,
      type: 'follow'
    });

    if (result.deletedCount === 0) {
      throw new Error('Relation not found');
    }

    return { success: true };
  }

  /**
   * Unblock user
   */
  async unblock(fromUserId, toUserId) {
    const result = await this.model.deleteOne({
      from: fromUserId,
      to: toUserId,
      type: 'block'
    });

    if (result.deletedCount === 0) {
      throw new Error('Relation not found');
    }

    return { success: true };
  }
}

module.exports = RelationService;
