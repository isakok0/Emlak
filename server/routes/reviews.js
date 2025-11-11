const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Latest reviews across properties
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const reviews = await Review.find({})
      .populate('user', 'name')
      .populate('property', 'title images listingType location')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Create review (only by users who completed a booking)
router.post('/', auth, [
  body('property').notEmpty().withMessage('Daire gereklidir'),
  body('booking').notEmpty().withMessage('Rezervasyon gereklidir'),
  body('rating.overall').isInt({ min: 1, max: 5 }).withMessage('Genel puan 1-5 arası olmalıdır')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { property, booking, rating, comment } = req.body;

    // Booking kontrolü - sadece konaklamış kişiler yorum yapabilir
    const bookingDoc = await Booking.findById(booking);
    if (!bookingDoc) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    if (bookingDoc.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu rezervasyon size ait değil' });
    }

    if (bookingDoc.status !== 'completed') {
      return res.status(400).json({ message: 'Sadece tamamlanmış rezervasyonlar için yorum yapabilirsiniz' });
    }

    // Daha önce yorum yapılmış mı kontrol et
    const existingReview = await Review.findOne({ booking });
    if (existingReview) {
      return res.status(400).json({ message: 'Bu rezervasyon için zaten yorum yaptınız' });
    }

    const review = new Review({
      property,
      booking,
      user: req.user._id,
      rating,
      comment,
      isVerified: true
    });

    await review.save();
    await review.populate('user', 'name');

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get reviews for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get user's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('property', 'title images location')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Create guest review (for homepage - no booking required)
router.post('/guest', async (req, res) => {
  try {
    const { name, comment, rating } = req.body;

    if (!name || !comment) {
      return res.status(400).json({ message: 'İsim ve yorum gereklidir' });
    }

    // İlk aktif daireyi bul (veya varsayılan olarak kullan)
    const Property = require('../models/Property');
    const User = require('../models/User');
    
    let property = await Property.findOne({ isActive: true });
    if (!property) {
      // Eğer daire yoksa, ilk daireyi oluştur veya hata ver
      return res.status(400).json({ message: 'Henüz daire bulunmuyor. Lütfen önce daire ekleyin.' });
    }

    // Kullanıcıyı bul veya oluştur (geçici email ile)
    const tempEmail = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.com`;
    let user = await User.findOne({ name: name, email: { $regex: /^guest_.*@temp\.com$/ } });
    if (!user) {
      // Geçici kullanıcı oluştur
      user = new User({
        name: name,
        email: tempEmail, // Geçici email
        password: 'temp123', // Geçici şifre
        role: 'user'
      });
      await user.save();
    }

    // Sahte booking ID
    const mongoose = require('mongoose');
    const fakeBookingId = new mongoose.Types.ObjectId();

    const review = new Review({
      property: property._id,
      booking: fakeBookingId,
      user: user._id,
      rating: {
        overall: rating || 5,
        cleanliness: rating || 5,
        location: rating || 5,
        value: rating || 5,
        communication: rating || 5
      },
      comment: comment,
      isVerified: false // Misafir yorumu
    });

    await review.save();
    await review.populate('user', 'name');
    await review.populate('property', 'title');

    res.status(201).json(review);
  } catch (error) {
    console.error('[Guest Review] Hata:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

module.exports = router;








