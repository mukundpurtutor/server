const express = require('express');
const router = express.Router();
const Tutor = require('../models/Tutor');
const cloudinary = require('../utlis/cloudinaryConfig');
const multer = require('multer');
const fs = require('fs');

// Multer config (temporary file save)
const upload = multer({ dest: 'uploads/' });

// POST: Create Tutor
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Create new tutor
    const tutor = new Tutor({
      name: req.body.name,
      subjects: req.body.subjects.split(',').map(s => s.trim()),
      classes: req.body.classes.split(',').map(c => c.trim()),
      rating: parseFloat(req.body.rating),
      experience: req.body.experience,
      bio: req.body.bio,
      image: result.secure_url,
      price: req.body.price,
    });

    await tutor.save();
    res.status(201).json(tutor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: All Tutors with Filters
router.get('/', async (req, res) => {
  try {
    const { subject, class: className, search } = req.query;
    const query = {};

    if (subject) query.subjects = subject;
    if (className) query.classes = className;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { subjects: { $regex: search, $options: 'i' } },
      ];
    }

    const tutors = await Tutor.find(query);
    res.json(tutors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
