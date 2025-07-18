 // models/Tutor.js
const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema({
  name: String,
  subjects: [String], // Good
  classes: [String],  // Good
  rating: Number,
  experience: String,
  bio: String,
  image: String, // Cloudinary image URL
  price: String,
});

module.exports = mongoose.model('Tutor', tutorSchema);
