const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }

}, { timestamps: true });

conversationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

conversationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;

    const { id, ...rest } = ret;
    return { id, ...rest };
  },
});

module.exports = mongoose.model('Conversation', conversationSchema);
