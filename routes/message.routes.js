const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { messageValidators } = require('../validators');
const auth = require('../middlewares/auth');
const { checkIfBlocked } = require('../middlewares/checkBlock');

/**
 * @route   POST /api/v1/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post(
  '/',
  auth,
  checkIfBlocked,
  messageValidators.sendMessage,
  messageController.sendMessage
);

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get user conversations
 * @access  Private
 */
router.get('/conversations', auth, messageController.listConversations);

/**
 * @route   GET /api/v1/messages/conversations/:conversationId/messages
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get(
  '/conversations/:conversationId/messages',
  auth,
  messageValidators.conversationId,
  messageController.getMessages
);

/**
 * @route   PUT /api/v1/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put(
  '/:id/read',
  auth,
  messageValidators.messageId,
  messageController.markAsRead
);

/**
 * @route   PUT /api/v1/messages/:id/share
 * @desc    Toggle share to profile
 * @access  Private
 */
router.put(
  '/:id/share',
  auth,
  messageValidators.toggleShare,
  messageController.toggleShare
);

/**
 * @route   GET /api/v1/messages/shared/:userId
 * @desc    Get shared messages for a user
 * @access  Private
 */
router.get(
  '/shared/:userId',
  auth,
  messageValidators.userId,
  messageController.getSharedMessages
);

/**
 * @route   GET /api/v1/messages/anonymous
 * @desc    Get anonymous messages received
 * @access  Private
 */
router.get('/anonymous', auth, messageController.getAnonymousMessages);

module.exports = router;
