const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const mongoose = require('./db');
const { initSocket } = require('./socket');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== Middleware ====================
app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:3001", 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API Routes ====================
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/messages', require('./routes/message.routes'));
app.use('/api/v1', require('./routes/userProfile.routes'));

// ==================== Health Check ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== HTTP Server ====================
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║   Server running on port ${PORT}       ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}           ║
    ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
