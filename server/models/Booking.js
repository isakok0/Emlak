const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  guests: {
    adults: { type: Number, required: true, default: 1 },
    children: { type: Number, default: 0 }
  },
  pricing: {
    dailyRate: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'cash', 'deposit'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  status: {
    type: String,
    enum: ['pending_request', 'confirmed', 'cancelled', 'completed'],
    default: 'pending_request'
  },
  requestType: {
    type: String,
    enum: ['web', 'manual'],
    default: 'web'
  },
  guestInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    notes: { type: String }
  },
  adminNotes: {
    type: String
  },
  communicationLog: [{
    date: { type: Date, default: Date.now },
    type: { 
      type: String, 
      enum: ['call', 'email', 'sms', 'note'],
      default: 'note'
    },
    note: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  policiesAccepted: {
    type: Boolean,
    default: false
  },
  policiesAcceptedAt: {
    type: Date
  },
  cancellationPolicy: {
    type: String,
    default: 'flexible'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total days
bookingSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffTime = Math.abs(new Date(this.checkOut) - new Date(this.checkIn));
    this.pricing.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);

