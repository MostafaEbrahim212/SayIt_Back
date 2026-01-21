const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const { success, error } = require('../utils/response');
const Notification = require("../models/Socket");
const UserProfileService = require('../services/UserProfileService');
const profileService = new UserProfileService();
// Helper: format profile
const formatProfile = (profile) => ({
  id: profile.user.id,
  name: profile.user.name,
  email: profile.user.email,
  avatar: profile.avatar || profile.user.avatar || "",
  isOnline: profile.user.isOnline || false,
  lastSeen: profile.user.lastSeen || null,
  address: profile.address || "",
  university: profile.university || "",
  bio: profile.bio || "",
  socialLinks: {
    facebook: profile.socialLinks?.facebook || "",
    instagram: profile.socialLinks?.instagram || "",
    twitter: profile.socialLinks?.twitter || "",
    linkedin: profile.socialLinks?.linkedin || ""
  },
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

// Create or Update Profile
exports.upsertProfile = async (req, res) => {
  const userId = req.user.id;
  const { address, university, bio, socialLinks, avatar } = req.body;

  try {
    let profile = await UserProfile.findOne({ user: userId }).populate('user', 'name email avatar isOnline lastSeen');
    
    if (profile) {
      // Update existing profile
      if (address !== undefined) profile.address = address;
      if (university !== undefined) profile.university = university;
      if (bio !== undefined) profile.bio = bio;
      if (socialLinks !== undefined) profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
      if (avatar !== undefined) profile.avatar = avatar;
      
      await profile.save();
      if (avatar !== undefined) {
        await User.findByIdAndUpdate(userId, { avatar });
        await profile.populate('user', 'name email avatar isOnline lastSeen');
      }
      return success(res, { key: 'profile.updated' }, formatProfile(profile));
    }

    // Create new profile
    profile = new UserProfile({
      user: userId,
      address,
      university,
      bio,
      socialLinks,
      avatar
    });

    await profile.save();
    await profile.populate('user', 'name email avatar isOnline lastSeen');

    success(res, { key: 'profile.created' }, formatProfile(profile));

  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};

// Upload avatar (expects multer to have attached req.file)
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return error(res, 'Avatar file is required', null, 400);
  }

  const relativePath = `/uploads/avatars/${req.file.filename}`;
  const host = `${req.protocol}://${req.get('host')}`;
  const avatarUrl = `${host}${relativePath}`;

  try {
    const profile = await profileService.updateAvatar(req.user.id, avatarUrl);
    return success(res, 'Avatar uploaded', { avatar: avatarUrl, profile });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return error(res, 'Server error', null, 500);
  }
};

// Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user.id }).populate('user', 'name email avatar isOnline lastSeen');
    if (!profile) return success(res, { key: 'no.profile' }, null);

    success(res, { key: 'profile.retrieved' }, formatProfile(profile));
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

const mongoose = require('mongoose');
const Relation = require('../models/Relations');
const { sendNotification } = require('../socket');

// Get profile by user ID
exports.getProfileByUserId = async (req, res) => {
  const userId = req.params.userId;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return error(res, { key: 'invalid.user.id' }, null, 400);
  }

  try {
    const profile = await UserProfile.findOne({ user: userId }).populate('user', 'name email avatar isOnline lastSeen');
    
    if (!profile) {
      return error(res, { key: 'user.profile.not.found' }, null, 404);
    }

    success(res, { key: 'profile.retrieved' }, formatProfile(profile));
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};



// user by name or email search

exports.searchUsers = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return error(res, { key: 'search.required' }, null, 400);
  }

  try {
    const profiles = await UserProfile.find()
      .limit(100)
      .populate('user', 'name email avatar isOnline lastSeen');

    const filteredProfiles = profiles.filter(p => {
      const nameMatch = p.user.name.toLowerCase().includes(query.toLowerCase());
      const emailMatch = p.user.email.toLowerCase().includes(query.toLowerCase());
      return nameMatch || emailMatch;
    });

    if (!filteredProfiles.length) {
      return success(res, { key: 'no.profile' }, []);
    }

    const formattedProfiles = filteredProfiles.map(formatProfile);
    success(res, { key: 'search.results' }, formattedProfiles);

  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};






// handle user relations follow and block
// Follow or block a user
exports.addRelation = async (req, res) => {
  const fromUserId = req.user.id;
  const { toUserId, type } = req.body;
  if (!['follow', 'block'].includes(type)) {
    return error(res, { key: 'invalid.relation.type' }, null, 400);
  }

  if (fromUserId === toUserId) {
    return error(res, { key: 'cannot.follow.or.block.self' }, null, 400);
  }

  try {

    let relation = await Relation.findOne({ from: fromUserId, to: toUserId });

    if (relation) {
      relation.type = type;
      await relation.save();
      return success(res, { key: 'relation.updated' }, relation);
    }

    relation = new Relation({ from: fromUserId, to: toUserId, type });
    await relation.save();
    if(type === 'follow'){
      const user = await User.findById(fromUserId).select('name');
      const notify = await Notification.create({
        user: toUserId,
        from: fromUserId,
        type: 'follow',
        text: `${user.name} started following you.`
      });
      sendNotification(toUserId, notify);
    }
    success(res, { key: 'relation.created' }, relation);
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};

// Remove relation
exports.removeRelation = async (req, res) => {
const id = req.params.id;
  try {
    const result = await Relation.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return error(res, { key: 'relation.not.found' }, null, 404);
    }

    success(res, { key: 'relation.removed' }, null);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// Get user relations
exports.getUserRelations = async (req, res) => {
  const to  = req.query.to;
  const from =  req.params.userId;
  const query = {};
  try {
    if (from) query.from = from;
    if (to) query.to = to;
    const relations = await Relation.find(query);

    let followed = false;
    let blocked = false;
    if (relations.length) {
      followed = relations.some(r => r.type === 'follow');
      blocked = relations.some(r => r.type === 'block');
    }
    success(res, { key: 'relations.retrieved' }, { relations, followed, blocked });
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

exports.getRelation = async (req, res) => {
  const query = req.query;

  try {
    const relation = await Relation.findOne(query);

    if (!relation) {
      return error(res, { key: 'relation.not.found' }, null, 404);
    }
    success(res, { key: 'relation.retrieved' }, relation);
  }
  catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};


exports.getAllNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    success(res, { key: 'relations.retrieved' }, notifications);
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
}
// Mark all notifications as read for current user
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;
  try {
    await Notification.updateMany({ user: userId }, { isRead: true });
    success(res, { key: 'relations.retrieved' }, null);
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return error(res, { key: 'relation.not.found' }, null, 404);
    }
    success(res, { key: 'relation.retrieved' }, notification);
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};
