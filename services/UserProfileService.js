const BaseService = require('./BaseService');
const UserProfile = require('../models/UserProfile');
const User = require('../models/User');

/**
 * User Profile Service - Handles user profile operations
 */
class UserProfileService extends BaseService {
  constructor() {
    super(UserProfile);
  }

  /**
   * Format profile for API response
   */
  formatProfile(profile) {
    if (!profile) return null;
    
    return {
      id: profile.user?.id || profile.user,
      name: profile.user?.name || '',
      email: profile.user?.email || '',
      avatar: profile.avatar || profile.user?.avatar || '',
      isOnline: profile.user?.isOnline || false,
      lastSeen: profile.user?.lastSeen || null,
      address: profile.address || '',
      university: profile.university || '',
      bio: profile.bio || '',
      socialLinks: {
        facebook: profile.socialLinks?.facebook || '',
        instagram: profile.socialLinks?.instagram || '',
        twitter: profile.socialLinks?.twitter || '',
        linkedin: profile.socialLinks?.linkedin || ''
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const profile = await this.findOne(
      { user: userId },
      { populate: { path: 'user', select: 'name email avatar isOnline lastSeen' } }
    );

    return this.formatProfile(profile);
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(userId, profileData) {
    const { address, university, bio, socialLinks, avatar } = profileData;

    let profile = await this.findOne(
      { user: userId },
      { populate: { path: 'user', select: 'name email avatar isOnline lastSeen' } }
    );

    if (profile) {
      // Update existing profile
      if (address !== undefined) profile.address = address;
      if (university !== undefined) profile.university = university;
      if (bio !== undefined) profile.bio = bio;
      if (socialLinks !== undefined) {
        profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
      }
      if (avatar !== undefined) profile.avatar = avatar;

      await profile.save();
      if (avatar !== undefined) {
        await User.findByIdAndUpdate(userId, { avatar });
        await profile.populate('user', 'name email avatar isOnline lastSeen');
      }
    } else {
      // Create new profile
      profile = await this.create({
        user: userId,
        address,
        university,
        bio,
        socialLinks,
        avatar
      });

      await profile.populate('user', 'name email avatar isOnline lastSeen');
    }

    return this.formatProfile(profile);
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query, options = {}) {
    const { limit = 100 } = options;

    const profiles = await this.find({}, {
      limit,
      populate: { path: 'user', select: 'name email' }
    });

    const searchLower = query.toLowerCase();
    const filtered = profiles.filter(p => {
      const nameMatch = p.user?.name?.toLowerCase().includes(searchLower);
      const emailMatch = p.user?.email?.toLowerCase().includes(searchLower);
      return nameMatch || emailMatch;
    });

    return filtered.map(p => this.formatProfile(p));
  }

  /**
   * Update profile avatar (for future implementation)
   */
  async updateAvatar(userId, avatarUrl) {
    const profile = await this.findOne({ user: userId });
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    profile.avatar = avatarUrl;
    await profile.save();
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });
    await profile.populate('user', 'name email avatar isOnline lastSeen');

    return this.formatProfile(profile);
  }

  /**
   * Get profile stats (for future implementation)
   */
  async getProfileStats(userId) {
    // Could include: follower count, following count, message count, etc.
    const profile = await this.findOne({ user: userId });
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      profileCreated: profile.createdAt,
      lastUpdated: profile.updatedAt,
      hasAvatar: !!profile.avatar,
      hasCompleteBio: !!(profile.bio && profile.university)
    };
  }
}

module.exports = UserProfileService;
