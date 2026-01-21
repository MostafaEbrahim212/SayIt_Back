const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

// Register
router.post(
  '/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  authController.register
);

// Login
router.post(
  '/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  authController.login
);

// Get current user
router.get('/profile', auth, authController.profile);

// update profile
router.put(
  '/profile',
  auth,
  body('name').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('passwordConfirm').optional().custom((value, { req }) => value === req.body.password),
  body('avatar').optional().isString(),
  authController.updateProfile
);

// Logout
router.post('/logout', auth, authController.logout);

module.exports = router;
