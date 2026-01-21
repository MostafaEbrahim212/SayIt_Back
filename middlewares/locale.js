const { t } = require('../utils/i18n');

// Determine locale from header/query and attach to res.locals
module.exports = (req, res, next) => {
  const header = (req.headers['x-lang'] || req.headers['accept-language'] || '').toLowerCase();
  const query = (req.query.lang || '').toLowerCase();
  let locale = 'en';

  const val = query || header;
  if (val.includes('ar')) locale = 'ar-eg';
  else if (val.includes('en')) locale = 'en';
  else if (val === 'ar-eg' || val === 'ar' || val === 'ar-eg-masri') locale = 'ar-eg';

  res.locals.locale = locale;
  // helper to translate in controllers if needed
  res.locals.t = (key, params) => t(key, params, locale);
  next();
};