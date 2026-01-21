/**
 * Success response
 * @param {object} res - express response object
 * @param {string} message - success message
 * @param {object} data - optional data
 * @param {number} status - HTTP status code (default 200)
 */
const { t } = require('./i18n');

const resolveMessage = (res, message) => {
  const locale = res.locals?.locale || 'en';
  if (!message) return '';
  // If message is a key object
  if (typeof message === 'object' && message.key) {
    return t(message.key, message.params || {}, locale);
  }
  // If string, assume it's a key if exists, otherwise return as-is
  const translated = t(message, {}, locale);
  return translated || message;
};

const success = (res, message, data = null, status = 200) => {
  res.status(status).json({
    success: true,
    message: resolveMessage(res, message),
    data
  });
};

/**
 * Error response
 * @param {object} res - express response object
 * @param {string} message - error message
 * @param {object} errors - optional validation errors
 * @param {number} status - HTTP status code (default 400)
 */
const error = (res, message, errors = null, status = 400) => {
  res.status(status).json({
    success: false,
    message: resolveMessage(res, message),
    errors
  });
};

module.exports = { success, error };
