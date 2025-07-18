const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const OldBook = require('../models/Book');
const cloudinary = require('../utlis/cloudinaryConfig');
const multer = require('multer');

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ------------------ POST: Create a new book ------------------
router.post('/create', upload.array('photos', 4), async (req, res) => {
  try {
    const photoUrls = [];

    // Upload photos to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file =>
        cloudinary.uploader.upload(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`)
      );
      const results = await Promise.all(uploadPromises);
      results.forEach(r => photoUrls.push(r.secure_url));
    }

    const bookData = {
      ...req.body,
      photos: photoUrls,
    };

    // Convert prices to numbers
    bookData.price = Number(bookData.price);
    bookData.originalPrice = Number(bookData.originalPrice);

    // Validate and assign seller
    if (req.body.sellerId && mongoose.Types.ObjectId.isValid(req.body.sellerId)) {
      bookData.seller = req.body.sellerId;
    }

    const book = new OldBook(bookData);
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while creating book listing' });
  }
});

// ------------------ GET: All books with full details ------------------
router.get('/', async (req, res) => {
  try {
    const { subject, classLevel, minPrice, maxPrice, location, search, page = 1, limit = 20 } = req.query;

    const query = {}; // ✅ no isApproved now

    if (subject) query.subject = subject;
    if (classLevel) query.classLevel = classLevel;
    if (location) query.location = location;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const books = await OldBook.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await OldBook.countDocuments(query);

    res.json({
      books,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching books' });
  }
});


// ------------------ GET: Single book with full info ------------------
router.get('/:id', async (req, res) => {
  try {
    const book = await OldBook.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller');

    if (!book) return res.status(404).json({ error: 'Book not found' });

    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching book' });
  }
});

// ------------------ PUT: Update book with optional new photos ------------------
router.put('/:id', upload.array('photos', 4), async (req, res) => {
  try {
    const book = await OldBook.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Upload new photos if provided
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file =>
        cloudinary.uploader.upload(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`)
      );
      const cloudinaryResults = await Promise.all(uploadPromises);
      book.photos = cloudinaryResults.map(r => r.secure_url);
    }

    // Update all other fields
    Object.keys(req.body).forEach(field => {
      if (['price', 'originalPrice'].includes(field)) {
        book[field] = Number(req.body[field]);
      } else {
        book[field] = req.body[field];
      }
    });

    // Update sellerId if valid
    if (req.body.sellerId && mongoose.Types.ObjectId.isValid(req.body.sellerId)) {
      book.seller = req.body.sellerId;
    }

    await book.save();
    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating book' });
  }
});

// ------------------ DELETE: Book and its photos ------------------
router.delete('/:id', async (req, res) => {
  try {
    const book = await OldBook.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Optional: delete images from Cloudinary
    const deletePromises = book.photos.map(photoUrl => {
      const publicId = photoUrl.split('/').pop().split('.')[0];
      return cloudinary.uploader.destroy(publicId);
    });

    await Promise.all(deletePromises);

    res.json({ message: 'Book listing removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting book' });
  }
});

// ------------------ PATCH: Approve book ------------------
router.patch('/:id/approve', async (req, res) => {
  try {
    const book = await OldBook.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        $push: {
          statusHistory: {
            status: 'Approved',
            changedBy: 'system'
          }
        }
      },
      { new: true }
    );

    if (!book) return res.status(404).json({ error: 'Book not found' });

    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error approving book' });
  }
});

// ------------------ GET: Books by seller ------------------
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ error: 'Invalid seller ID' });
    }

    const books = await OldBook.find({ seller: sellerId }).populate('seller');
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching seller books' });
  }
});

module.exports = router;
