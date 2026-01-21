const { validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const locale = res.locals?.locale || 'en';
    const { t } = require('../utils/i18n');
    // نرجع مصفوفة رسائل واضحة لكل حقل
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    return res.status(400).json({
      success: false,
      message: t('validation.failed', {}, locale),
      errors: extractedErrors
    });
  }
  next();
};

exports.handleValidationErrors = handleValidationErrors;