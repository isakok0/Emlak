const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    city: { type: String, default: 'Antalya', required: true },
    district: { type: String },
    neighborhood: { type: String },
    address: { type: String },
    // coordinates için forma bazen "undefined" veya hiç değer gelmeyebiliyor.
    // Mongoose'un alt belge bekleyip "Cast to Object failed" hatası atmaması için
    // Mixed tipine alıp default'u undefined bırakıyoruz.
    coordinates: { type: mongoose.Schema.Types.Mixed, default: undefined }
  },
  propertyType: {
    type: String,
    enum: ['1+0', '1+1', '2+1', '3+1', '4+1'],
    required: true
  },
  listingType: {
    type: String,
    enum: ['rent', 'rent_daily', 'rent_monthly', 'sale'],
    default: 'rent_daily',
    index: true
  },
  isFeatured: { type: Boolean, default: false, index: true },
  ownerVerified: { type: Boolean, default: false },
  size: {
    type: Number,
    required: true // metrekare
  },
  bedrooms: {
    type: Number,
    required: true
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  amenities: [{
    type: String
  }],
  images: [{
    url: { type: String, required: true },
    caption: { type: String }
  }],
  videoUrl: {
    type: String
  },
  pricing: {
    daily: { type: Number, required: true },
    weekly: { type: Number },
    monthly: { type: Number },
    seasonalRates: [{
      startDate: { type: Date },
      endDate: { type: Date },
      multiplier: { type: Number, default: 1 } // normal fiyatın kaç katı
    }]
  },
  availability: [{
    date: { type: Date, required: true },
    isAvailable: { type: Boolean, default: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    status: { 
      type: String, 
      enum: ['available', 'pending_request', 'confirmed'],
      default: 'available'
    }
  }],
  rules: [{
    type: String
  }],
  nearbyAttractions: [{
    name: { type: String },
    distance: { type: String },
    type: { type: String }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  views: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for search
propertySchema.index({ 'location.city': 1, 'location.district': 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ 'pricing.daily': 1 });
propertySchema.index({ listingType: 1 });
propertySchema.index({ isFeatured: 1 });

module.exports = mongoose.model('Property', propertySchema);

