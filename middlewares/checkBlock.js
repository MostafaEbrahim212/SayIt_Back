// Middleware to check if user is blocked
const Relation = require('../models/Relations');
const { error } = require('../utils/response');

exports.checkIfBlocked = async (req, res, next) => {
  try {
    const fromUserId = req.user.id;
    const toUserId = req.params.userId || req.body.userId || req.body.toUserId || req.body.receiverId;

    if (!toUserId) {
      return next();
    }

    // Check if current user blocked the target user OR target user blocked current user
    const blockedRelation = await Relation.findOne({
      $or: [
        { from: fromUserId, to: toUserId, type: 'block' },
        { from: toUserId, to: fromUserId, type: 'block' }
      ]
    });

    if (blockedRelation) {
      const isBlockedBy = blockedRelation.from.toString() === toUserId;
      if (isBlockedBy) {
        return error(res, { key: 'user.blocked.you' }, null, 403);
      } else {
        return error(res, { key: 'you.blocked.user' }, null, 403);
      }
    }

    next();
  } catch (err) {
    console.error(err);
    error(res, 'Server error', null, 500);
  }
};
