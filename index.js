const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const mongoose = require('./db'); // استيراد ملف الاتصال بقاعدة البيانات
const { initSocket } = require('./socket');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(require('./middlewares/locale'));
app.use(cors({ origin: [
  "https://say-it-back-blush.vercel.app"
], credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✨ API routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/', require('./routes/userProfile'));
app.use('/api/v1/', require('./routes/messages'));



// LOG
app.use((err, req, res, next) => {
  console.error('🔥 ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// HTTP server
const server = http.createServer(app);


initSocket(server);


server.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


