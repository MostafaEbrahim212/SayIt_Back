const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  avatar: {
    type: String,
    default: ''
  },

  isOnline: {
    type: Boolean,
    default: false
  },

  lastSeen: {
    type: Date,
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Virtual id
userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// toJSON transform: hide password, _id, reorder so id comes first
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;

    // ضع id أول حقل
    const { id, ...rest } = ret;
    return { id, ...rest };
  },
});


module.exports = mongoose.model('User', userSchema);
