const { UserProfileService, RelationService, NotificationService } = require('../services');
const { success, error } = require('../utils/response');

const profileService = new UserProfileService();
const relationService = new RelationService();
const notificationService = new NotificationService();

/**
 * User Profile Controller - Handles HTTP requests for user profiles
 */
class UserProfileController {
  /**
   * Create or update profile
   */
  async upsertProfile(req, res) {
    try {
      const profile = await profileService.upsertProfile(req.user.id, req.body);
      return success(res, 'Profile saved successfully', profile);
    } catch (err) {
      console.error('Upsert profile error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const profile = await profileService.getUserProfile(req.user.id);
      if (!profile) {
        return success(res, 'No profile found', null);
      }
      return success(res, 'Profile retrieved successfully', profile);
    } catch (err) {
      console.error('Get profile error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(req, res) {
    try {
      const { userId } = req.params;
      const profile = await profileService.getUserProfile(userId);
      
      if (!profile) {
        return error(res, 'User profile not found', null, 404);
      }
      
      return success(res, 'Profile retrieved successfully', profile);
    } catch (err) {
      console.error('Get profile by ID error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const profiles = await profileService.searchUsers(query);
      
      if (!profiles.length) {
        return success(res, 'No users found', []);
      }
      
      return success(res, 'Search results', profiles);
    } catch (err) {
      console.error('Search users error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Add or update relation (follow/block)
   */
  async addRelation(req, res) {
    try {
      const { toUserId, type } = req.body;
      const relation = await relationService.addRelation(req.user.id, toUserId, type);
      return success(res, 'Relation saved successfully', relation);
    } catch (err) {
      console.error('Add relation error:', err);
      if (err.message === 'Invalid relation type' || err.message === 'Cannot follow or block yourself') {
        return error(res, err.message, null, 400);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Remove relation
   */
  async removeRelation(req, res) {
    try {
      const { id } = req.params;
      await relationService.removeRelation(id);
      return success(res, 'Relation removed successfully', null);
    } catch (err) {
      console.error('Remove relation error:', err);
      if (err.message === 'Relation not found') {
        return error(res, err.message, null, 404);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get user relations
   */
  async getUserRelations(req, res) {
    try {
      const { userId } = req.params;
      const { to } = req.query;
      
      const result = await relationService.getUserRelations(userId, to);
      return success(res, 'Relations retrieved successfully', result);
    } catch (err) {
      console.error('Get relations error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get single relation
   */
  async getRelation(req, res) {
    try {
      const relation = await relationService.getRelation(req.query);
      return success(res, 'Relation retrieved successfully', relation);
    } catch (err) {
      console.error('Get relation error:', err);
      if (err.message === 'Relation not found') {
        return error(res, err.message, null, 404);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get all notifications for current user
   */
  async getAllNotifications(req, res) {
    try {
      const notifications = await notificationService.getUserNotifications(req.user.id);
      return success(res, 'Notifications retrieved successfully', notifications);
    } catch (err) {
      console.error('Get notifications error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      await notificationService.markAllAsRead(req.user.id);
      return success(res, 'All notifications marked as read', null);
    } catch (err) {
      console.error('Mark all as read error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user.id);
      return success(res, 'Notification marked as read', notification);
    } catch (err) {
      console.error('Mark as read error:', err);
      if (err.message === 'Notification not found') {
        return error(res, err.message, null, 404);
      }
      if (err.message === 'Forbidden') {
        return error(res, err.message, null, 403);
      }
      return error(res, 'Server error', null, 500);
    }
  }
}

// Export controller instance
module.exports = new UserProfileController();
