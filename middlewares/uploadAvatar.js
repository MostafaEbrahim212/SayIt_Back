const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

// multer storage فقط مؤقت (في الذاكرة) بدل ما يخزن الصورة الكبيرة مباشرة
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single('avatar'); // أو array حسب حاجتك

// middleware بعد multer لتصغير الصورة
const resizeAvatar = async (req, res, next) => {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname || '').toLowerCase() || '.png';
  const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
  const base = req.user?.id || req.user?._id || 'user';
  const filename = `${base}_${Date.now()}${safeExt}`;
  const filepath = path.join(uploadDir, filename);

  try {
    // تصغير الصورة إلى 512x512 أو أقل مع المحافظة على aspect ratio
    await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .toFormat('png') // ممكن تخلي ext زي ما هي لو حابب
      .toFile(filepath);

    // هتضيف اسم الصورة للـ req عشان تستخدمه بعد كده
    req.file.filename = filename;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadAvatar,
  resizeAvatar,
};
