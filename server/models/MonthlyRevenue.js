const mongoose = require('mongoose');

const monthlyRevenueSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  total: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

monthlyRevenueSchema.index({ year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyRevenue', monthlyRevenueSchema);


