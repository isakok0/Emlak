const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    location: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 }
  },
  comment: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: true // Sadece konaklamış kişiler yorum yapabilir
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Property rating'i güncelle
reviewSchema.post('save', async function() {
  const Property = mongoose.model('Property');
  const reviews = await mongoose.model('Review').find({ property: this.property });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating.overall, 0) / reviews.length;
  
  await Property.findByIdAndUpdate(this.property, {
    'rating.average': avgRating,
    'rating.count': reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);














