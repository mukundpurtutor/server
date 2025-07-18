 const mongoose = require('mongoose');

const oldBookSchema = new mongoose.Schema({
  title: { 
    type: String,
    required: [true, 'Title is required'],
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 'Other']
  },
  classLevel: {
    type: String,
    required: [true, 'Class level is required'],
    enum: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'JEE', 'NEET', 'College', 'Other']
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['New', 'Like New', 'Good', 'Acceptable', 'Worn Out'],
    default: 'Good'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(v) {
        return this.originalPrice ? v < this.originalPrice : true;
      },
      message: 'Selling price must be lower than original price'
    }
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative']
  },
  photos: {
    type: [String],
    required: [true, 'Photos are required'],
    validate: {
      validator: function(arr) {
        return arr.length >= 1 && arr.length <= 4 && arr.every(url =>
          typeof url === 'string' &&
          url.includes('res.cloudinary.com')
        );
      },
      message: '1 to 4 valid Cloudinary photo URLs are required'
    }
  },
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    validate: {
      validator: function(v) {
        return /^(\+91|91)?[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid WhatsApp number!`
    }
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    enum: ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Other']
  },
  views: {
    type: Number,
    default: 0
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Sold'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
oldBookSchema.virtual('discount').get(function () {
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Text search & performance indexes
oldBookSchema.index({ title: 'text', description: 'text' });
oldBookSchema.index({ createdAt: -1 });
oldBookSchema.index({ subject: 1, classLevel: 1 });
oldBookSchema.index({ price: 1 });
oldBookSchema.index({ location: 1 });

// Pre-save hook for status
oldBookSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory = [{
      status: 'Pending'
    }];
  }
  next();
});

module.exports = mongoose.model('OldBook', oldBookSchema);
