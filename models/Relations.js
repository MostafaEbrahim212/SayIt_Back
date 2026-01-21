const mongoose = require('mongoose');

const relationSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  type: {
    type: String,
    enum: ['follow', 'block'],
    required: true
  }

}, { timestamps: true });

relationSchema.index({ from: 1, to: 1 }, { unique: true });

relationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

relationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;

    const { id, ...rest } = ret;
    return { id, ...rest };
  },
});

module.exports = mongoose.model('Relation', relationSchema);
