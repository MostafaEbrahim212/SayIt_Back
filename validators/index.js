const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware wrapper
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    next();
  };
};

/**
 * Auth Validators
 */
const authValidators = {
  register: validate([
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]),

  login: validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ]),

  updateProfile: validate([
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('passwordConfirm')
      .optional()
      .custom((value, { req }) => {
        if (req.body.password && value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ])
};

/**
 * Message Validators
 */
const messageValidators = {
  sendMessage: validate([
    body('receiverId')
      .notEmpty().withMessage('Receiver ID is required')
      .isMongoId().withMessage('Invalid receiver ID'),
    body('content')
      .trim()
      .notEmpty().withMessage('Message content is required')
      .isLength({ min: 1, max: 5000 }).withMessage('Message must be between 1 and 5000 characters'),
    body('isAnonymous')
      .optional()
      .isBoolean().withMessage('isAnonymous must be boolean'),
    body('replyTo')
      .optional()
      .isMongoId().withMessage('Invalid reply ID'),
    body('shareToProfile')
      .optional()
      .isBoolean().withMessage('shareToProfile must be boolean')
  ]),

  conversationId: validate([
    param('conversationId')
      .isMongoId().withMessage('Invalid conversation ID')
  ]),

  messageId: validate([
    param('id')
      .isMongoId().withMessage('Invalid message ID')
  ]),

  toggleShare: validate([
    param('id')
      .isMongoId().withMessage('Invalid message ID'),
    body('share')
      .isBoolean().withMessage('share must be boolean')
  ]),

  userId: validate([
    param('userId')
      .isMongoId().withMessage('Invalid user ID')
  ])
};

/**
 * User Profile Validators
 */
const profileValidators = {
  upsertProfile: validate([
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
    body('university')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('University must be less than 100 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('socialLinks.facebook')
      .optional()
      .trim()
      .isURL().withMessage('Invalid Facebook URL'),
    body('socialLinks.instagram')
      .optional()
      .trim()
      .isURL().withMessage('Invalid Instagram URL'),
    body('socialLinks.twitter')
      .optional()
      .trim()
      .isURL().withMessage('Invalid Twitter URL'),
    body('socialLinks.linkedin')
      .optional()
      .trim()
      .isURL().withMessage('Invalid LinkedIn URL')
  ]),

  userId: validate([
    param('userId')
      .isMongoId().withMessage('Invalid user ID')
  ]),

  searchUsers: validate([
    query('query')
      .trim()
      .notEmpty().withMessage('Search query is required')
      .isLength({ min: 1, max: 50 }).withMessage('Query must be between 1 and 50 characters')
  ])
};

/**
 * Relation Validators
 */
const relationValidators = {
  addRelation: validate([
    body('toUserId')
      .notEmpty().withMessage('Target user ID is required')
      .isMongoId().withMessage('Invalid user ID'),
    body('type')
      .notEmpty().withMessage('Relation type is required')
      .isIn(['follow', 'block']).withMessage('Type must be either follow or block')
  ]),

  relationId: validate([
    param('id')
      .isMongoId().withMessage('Invalid relation ID')
  ]),

  userId: validate([
    param('userId')
      .isMongoId().withMessage('Invalid user ID')
  ])
};

/**
 * Notification Validators
 */
const notificationValidators = {
  notificationId: validate([
    param('id')
      .isMongoId().withMessage('Invalid notification ID')
  ])
};

module.exports = {
  validate,
  authValidators,
  messageValidators,
  profileValidators,
  relationValidators,
  notificationValidators
};
