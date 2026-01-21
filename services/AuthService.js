const BaseService = require('./BaseService');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Auth Service - Handles authentication and user management
 */
class AuthService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { name, email, password } = userData;

    // Check if user exists
    const existingUser = await this.findOne({ email });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Create user
    const user = await this.create({ name, email, password });

    // Create empty user profile
    await UserProfile.create({
      user: user._id,
      address: '',
      university: '',
      bio: '',
      socialLinks: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      }
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    };
  }

  /**
   * Login user
   */
  async login(credentials) {
    const { email, password } = credentials;

    // Find user
    const user = await this.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await this.findById(userId, { select: '-password' });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const { name, email, password, passwordConfirm } = updates;
    
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await this.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Email already in use');
      }
      user.email = email;
    }
    
    if (password) {
      if (password !== passwordConfirm) {
        throw new Error('Passwords do not match');
      }
      user.password = password;
    }

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('Invalid old password');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { success: true };
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query, currentUserId, options = {}) {
    const { limit = 10, skip = 0 } = options;
    
    const searchRegex = new RegExp(query, 'i');
    const users = await this.find(
      {
        _id: { $ne: currentUserId },
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      },
      {
        select: 'name email',
        limit,
        skip
      }
    );

    return users;
  }
}

module.exports = AuthService;
