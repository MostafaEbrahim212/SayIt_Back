const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { checkIfBlocked } = require('../middlewares/checkBlock');
const userProfileController = require('../controllers/userProfileController');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validationResult');
const { query, param } = require('express-validator');
const uploadAvatar = require('../middlewares/uploadAvatar');

// Create or Update profile
router.post(
  '/profile',
  auth,
  [
    body('avatar').optional().isString().withMessage('Avatar must be a string URL'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('university').optional().isString().withMessage('University must be a string'),
    body('bio').optional().isString().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
    body('socialLinks.facebook').optional().isString(),
    body('socialLinks.instagram').optional().isString(),
    body('socialLinks.twitter').optional().isString(),
    body('socialLinks.linkedin').optional().isString(),
  ],
  handleValidationErrors,
  userProfileController.upsertProfile
);

// Upload avatar (multipart/form-data, field name: avatar)

router.post('/profile/avatar', auth, uploadAvatar.uploadAvatar, uploadAvatar.resizeAvatar, userProfileController.uploadAvatar);

// Get current user's profile
router.get('/profile', auth, userProfileController.getProfile);

// Get Profile by user ID (with block check)
router.get('/profile/user/:userId', auth,  userProfileController.getProfileByUserId);

// Search users by name or email
router.get('/search-profiles', auth, userProfileController.searchUsers);

// Add or update relation (follow/block)
router.post(
  '/relation',
  auth,
  [
    body('toUserId').notEmpty().withMessage('toUserId is required'),
    body('type').isIn(['follow', 'block']).withMessage('Type must be follow or block'),
  ],
  handleValidationErrors,
  userProfileController.addRelation
);

// Remove relation
router.delete('/relation/:id', auth, userProfileController.removeRelation);

// Get user relations
router.get(
  '/relations/:userId',
  auth,
  [
    param('userId')
      .notEmpty().withMessage('User ID is required')
      .isMongoId().withMessage('Invalid User ID format'),
    query('to')
      .optional()
      .isMongoId().withMessage('Invalid To User ID format'),
    query('type')
      .optional()
      .isIn(['follow', 'block']).withMessage('Type must be either follow or block')
  ],
  handleValidationErrors,
  userProfileController.getUserRelations
);

router.get(
  '/relation/:id',
  auth,
  userProfileController.getRelation
);

// Get all notifications for current user
router.get(
  '/notifications',
  auth,
  userProfileController.getAllNotifications
);

// Mark all notifications as read
router.put(
  '/notifications/mark-all-read',
  auth,
  userProfileController.markAllAsRead
);

// Mark single notification as read
router.put(
  '/notifications/:id/mark-read',
  auth,
  userProfileController.markAsRead
);

module.exports = router;
