const BaseService = require('./BaseService');
const Notification = require('../models/Socket');
const { sendNotification } = require('../socket');

/**
 * Notification Service - Handles notification-related business logic
 */
class NotificationService extends BaseService {
  constructor() {
    super(Notification);
  }

  /**
   * Create and send notification
   */
  async createNotification(userId, fromId, type, text) {
    const notification = await this.create({
      user: userId,
      from: fromId,
      type,
      text
    });

    // Send real-time notification via socket
    sendNotification(userId, notification);

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    const { limit = 50, skip = 0, unreadOnly = false } = options;
    
    const filter = { user: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    return await this.find(filter, {
      sort: { createdAt: -1 },
      limit,
      skip,
      populate: { path: 'from', select: 'name email' }
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await this.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.user.toString() !== userId) {
      throw new Error('Forbidden');
    }

    notification.isRead = true;
    return await notification.save();
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId) {
    await this.model.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
    
    return { success: true };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return await this.count({ user: userId, isRead: false });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.model.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}

module.exports = NotificationService;
