const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middlewares/auth');
const { checkIfBlocked } = require('../middlewares/checkBlock');
const { handleValidationErrors } = require('../middlewares/validationResult');
const messageController = require('../controllers/messageController');

const router = express.Router();

// Send message (supports anonymous + reply + optional share)
router.post(
  '/messages',
  auth,
  checkIfBlocked,
  [
    body('receiverId').notEmpty().withMessage('receiverId is required').isMongoId(),
    body('content').notEmpty().withMessage('content is required').isLength({ max: 5000 }),
    body('isAnonymous').optional().isBoolean(),
    body('replyTo').optional().isMongoId(),
    body('shareToProfile').optional().isBoolean()
  ],
  handleValidationErrors,
  messageController.sendMessage
);

// List conversations for current user
router.get('/conversations', auth, messageController.listConversations);

// Get messages inside a conversation
router.get(
  '/conversations/:conversationId/messages',
  auth,
  [param('conversationId').isMongoId().withMessage('conversationId is invalid')],
  handleValidationErrors,
  messageController.getMessages
);

// Mark a message as read
router.put(
  '/messages/:id/read',
  auth,
  [param('id').isMongoId().withMessage('message id is invalid')],
  handleValidationErrors,
  messageController.markAsRead
);

// Toggle sharing a message to profile
router.put(
  '/messages/:id/share',
  auth,
  [
    param('id').isMongoId().withMessage('message id is invalid'),
    body('share').isBoolean().withMessage('share must be boolean')
  ],
  handleValidationErrors,
  messageController.toggleShare
);

// Get shared messages for a profile
router.get(
  '/messages/shared/:userId',
  auth,
  [param('userId').isMongoId().withMessage('userId is invalid')],
  handleValidationErrors,
  messageController.getSharedMessages
);

// Get anonymous messages for current user
router.get('/messages/anonymous', auth, messageController.getAnonymousMessages);

// Get anonymous messages sent by current user
router.get('/messages/sent-anonymous', auth, messageController.getSentAnonymousMessages);

// Get aggregated stats for current user
router.get('/messages/stats', auth, messageController.getStats);

module.exports = router;
