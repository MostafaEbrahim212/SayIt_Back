const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { success, error } = require('../utils/response');
const UserProfile = require('../models/UserProfile');
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // تحقق لو الإيميل موجود قبل كده
    const existingUser = await User.findOne({ email });
    if (existingUser) return error(res, { key: 'email.exists' }, null, 400);

    // إنشاء المستخدم
    const user = await User.create({ name, email, password });

    // إنشاء UserProfile فاضية تلقائيًا
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

    // إنشاء التوكن
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    success(res, { key: 'user.registered' }, { token, user: { id: user._id, name, email, avatar: user.avatar, isOnline: user.isOnline, lastSeen: user.lastSeen } });

  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};
// Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, { key: 'server.error' }, errors.array(), 400);

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return error(res, { key: 'invalid.credentials' }, null, 400);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return error(res, { key: 'invalid.credentials' }, null, 400);

    const token = generateToken(user);

    // Mark user as recently active
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    success(res, { key: 'login.success' }, { token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, isOnline: user.isOnline, lastSeen: user.lastSeen } });
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};

// Get current user
exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    success(res, { key: 'profile.retrieved' }, user);
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};

// update profile
exports.updateProfile = async (req, res) => {
  const { name, email, password, passwordConfirm, avatar } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (password) {
      if (password !== passwordConfirm) {
        return error(res, { key: 'server.error' }, null, 400);
      }
      user.password = password;
    }
    await user.save();
    success(res, { key: 'profile.updated' }, { id: user._id, name: user.name, email: user.email, avatar: user.avatar, isOnline: user.isOnline, lastSeen: user.lastSeen });
  } catch (err) {
    console.error(err);
    error(res, { key: 'server.error' }, null, 500);
  }
};
// Logout
const tokenBlackList = require('../blacklist');

exports.logout = (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  tokenBlackList.add(token); // الآن الـ has هيشتغل بدون مشاكل
  res.json({ message: 'Logged out successfully' });
};
