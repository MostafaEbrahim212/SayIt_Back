const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: false,
    default: null
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Optional parent message for threaded replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  parentIsAnonymous: {
    type: Boolean,
    default: false
  },

  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  isAnonymous: {
    type: Boolean,
    default: false
  },

  readAt: {
    type: Date
  },

  // Share to profile toggle
  isSharedToProfile: {
    type: Boolean,
    default: false
  },

  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  sharedAt: {
    type: Date
  }

}, { timestamps: true });

messageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

messageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;

    const { id, ...rest } = ret;
    return { id, ...rest };
  },
});

module.exports = mongoose.model('Message', messageSchema);
