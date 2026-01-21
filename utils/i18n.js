const fs = require('fs');
const path = require('path');

const localesCache = {};

const loadLocale = (locale) => {
  const normalized = (locale || 'en').toLowerCase();
  const fileMap = {
    en: 'en.json',
    'en-us': 'en.json',
    'ar-eg': 'ar-eg.json',
    ar: 'ar-eg.json',
    'ar-eg-masri': 'ar-eg.json'
  };
  const fileName = fileMap[normalized] || fileMap.en;
  const filePath = path.join(__dirname, '..', 'locales', fileName);
  if (!localesCache[fileName]) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      localesCache[fileName] = JSON.parse(raw);
    } catch (err) {
      localesCache[fileName] = {};
    }
  }
  return localesCache[fileName];
};

const format = (str, params = {}) => {
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
};

const t = (key, params = {}, locale = 'en') => {
  const dict = loadLocale(locale);
  const val = dict[key] || key; // fallback to key
  return typeof val === 'string' ? format(val, params) : val;
};

module.exports = { t };
