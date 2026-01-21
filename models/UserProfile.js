const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true
  },

  avatar: { type: String, default: '' },

  address: { type: String, default: "" },
  university: { type: String, default: "" },
  bio: { type: String, maxlength: 500, default: "" },

  socialLinks: {
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" }
  }

}, { timestamps: true });

// Virtual id بدل _id
userProfileSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// إعداد JSON: حذف _id و __v، رجع id
userProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;

    // لو populate فشل والمستخدم مش موجود
    if (!ret.user || typeof ret.user === 'string') {
      ret.user = { id: ret.user || null, name: "Deleted User", email: "", avatar: ret.avatar || "", isOnline: false, lastSeen: null };
    } else {
      ret.user = {
        id: ret.user._id ? ret.user._id.toString() : null,
        name: ret.user.name || "Deleted User",
        email: ret.user.email || "",
        avatar: ret.user.avatar || ret.avatar || "",
        isOnline: ret.user.isOnline || false,
        lastSeen: ret.user.lastSeen || null
      };
    }

    return ret;
  },
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
