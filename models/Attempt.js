 const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  phone: String,
  ip: String,
  score: Number,
  startTime: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attempt', attemptSchema);
