const { AuthService } = require('../services');
const { success, error } = require('../utils/response');
const tokenBlackList = require('../blacklist');

const authService = new AuthService();

/**
 * Auth Controller - Handles HTTP requests for authentication
 */
class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return success(res, 'User registered successfully', result);
    } catch (err) {
      console.error('Register error:', err);
      if (err.message === 'Email already exists') {
        return error(res, err.message, null, 400);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return success(res, 'Login successful', result);
    } catch (err) {
      console.error('Login error:', err);
      if (err.message === 'Invalid credentials') {
        return error(res, err.message, null, 400);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Get current user profile
   */
  async profile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      return success(res, 'User retrieved successfully', user);
    } catch (err) {
      console.error('Profile error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const result = await authService.updateProfile(req.user.id, req.body);
      return success(res, 'Profile updated successfully', result);
    } catch (err) {
      console.error('Update profile error:', err);
      if (err.message === 'Passwords do not match' || err.message === 'Email already in use') {
        return error(res, err.message, null, 400);
      }
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Logout user
   */
  logout(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return error(res, 'No token provided', null, 401);
      }

      const token = authHeader.split(' ')[1];
      tokenBlackList.add(token);

      return success(res, 'Logged out successfully', null);
    } catch (err) {
      console.error('Logout error:', err);
      return error(res, 'Server error', null, 500);
    }
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const users = await authService.searchUsers(query, req.user.id);
      return success(res, 'Search results', users);
    } catch (err) {
      console.error('Search error:', err);
      return error(res, 'Server error', null, 500);
    }
  }
}

// Export controller instance
module.exports = new AuthController();
