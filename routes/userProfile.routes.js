const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfile.controller');
const { profileValidators, relationValidators, notificationValidators } = require('../validators');
const auth = require('../middlewares/auth');

// ==================== Profile Routes ====================

/**
 * @route   POST /api/v1/profile
 * @desc    Create or update user profile
 * @access  Private
 */
router.post(
  '/',
  auth,
  profileValidators.upsertProfile,
  userProfileController.upsertProfile
);

/**
 * @route   GET /api/v1/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', auth, userProfileController.getProfile);

/**
 * @route   GET /api/v1/profile/user/:userId
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get(
  '/user/:userId',
  auth,
  profileValidators.userId,
  userProfileController.getProfileByUserId
);

/**
 * @route   GET /api/v1/profile/search
 * @desc    Search users
 * @access  Private
 */
router.get(
  '/search',
  auth,
  profileValidators.searchUsers,
  userProfileController.searchUsers
);

// ==================== Relation Routes ====================

/**
 * @route   POST /api/v1/relation
 * @desc    Add or update relation (follow/block)
 * @access  Private
 */
router.post(
  '/relation',
  auth,
  relationValidators.addRelation,
  userProfileController.addRelation
);

/**
 * @route   DELETE /api/v1/relation/:id
 * @desc    Remove relation
 * @access  Private
 */
router.delete(
  '/relation/:id',
  auth,
  relationValidators.relationId,
  userProfileController.removeRelation
);

/**
 * @route   GET /api/v1/relations/:userId
 * @desc    Get user relations
 * @access  Private
 */
router.get(
  '/relations/:userId',
  auth,
  relationValidators.userId,
  userProfileController.getUserRelations
);

/**
 * @route   GET /api/v1/relation
 * @desc    Get single relation
 * @access  Private
 */
router.get('/relation', auth, userProfileController.getRelation);

// ==================== Notification Routes ====================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get all notifications
 * @access  Private
 */
router.get('/notifications', auth, userProfileController.getAllNotifications);

/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/notifications/mark-all-read', auth, userProfileController.markAllAsRead);

/**
 * @route   PUT /api/v1/notifications/:id/mark-read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/notifications/:id/mark-read',
  auth,
  notificationValidators.notificationId,
  userProfileController.markAsRead
);

module.exports = router;
