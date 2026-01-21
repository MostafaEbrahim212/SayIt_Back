const jwt = require('jsonwebtoken');
const tokenBlackList = require('../blacklist')
const { error } = require('../utils/response');

const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, { key: 'auth.no.token' }, null, 401);

  const token = authHeader.split(' ')[1];
  if (tokenBlackList.has(token)) return error(res, { key: 'auth.token.logged.out' }, null, 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, { key: 'auth.invalid.token' }, null, 401);
  }
};

module.exports = auth;
