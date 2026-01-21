const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUser = process.env.DB_USER || 'user';
const dbPassword = process.env.DB_PASSWORD;
const dbCluster = process.env.DB_CLUSTER || 'learn-mongodb.lhfn80f.mongodb.net';
const dbName = process.env.DB_NAME || 'SayIt';
const uri = `mongodb+srv://${dbUser}:${dbPassword}@${dbCluster}/${dbName}?retryWrites=true&w=majority`;


mongoose.connect(uri)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

module.exports = mongoose;
