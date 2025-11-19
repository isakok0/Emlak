const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Latest reviews across properties
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const reviews = await Review.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Property, as: 'property', attributes: ['title', 'images', 'listingType', 'locationCity', 'locationDistrict', 'id'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    res.json(reviews);
  } catch (error) {
    console.error('Reviews latest error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    const bookingDoc = await Booking.findByPk(booking);
    if (!bookingDoc) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    if (bookingDoc.guestId !== req.user.id) {
      return res.status(403).json({ message: 'Bu rezervasyon size ait değil' });
    }

    if (bookingDoc.status !== 'completed') {
      return res.status(400).json({ message: 'Sadece tamamlanmış rezervasyonlar için yorum yapabilirsiniz' });
    }

    // Daha önce yorum yapılmış mı kontrol et
    const existingReview = await Review.findOne({ where: { bookingId: booking } });
    if (existingReview) {
      return res.status(400).json({ message: 'Bu rezervasyon için zaten yorum yaptınız' });
    }

    const review = await Review.create({
      propertyId: property,
      bookingId: booking,
      userId: req.user.id,
      ratingOverall: rating.overall,
      ratingCleanliness: rating.cleanliness,
      ratingLocation: rating.location,
      ratingValue: rating.value,
      ratingCommunication: rating.communication,
      comment,
      isVerified: true
    });
    
    await review.reload({
      include: [{ model: User, as: 'user', attributes: ['name'] }]
    });

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get reviews for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { propertyId: req.params.propertyId },
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get user's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { userId: req.user.id },
      include: [{ model: Property, as: 'property', attributes: ['title', 'images', 'locationCity', 'locationDistrict'] }],
      order: [['createdAt', 'DESC']]
    });

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
    let property = await Property.findOne({ where: { isActive: true } });
    if (!property) {
      // Eğer daire yoksa, ilk daireyi oluştur veya hata ver
      return res.status(400).json({ message: 'Henüz daire bulunmuyor. Lütfen önce daire ekleyin.' });
    }

    // Kullanıcıyı bul veya oluştur (geçici email ile)
    const tempEmail = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.com`;
    let user = await User.findOne({ 
      where: { 
        name: name, 
        email: { [Op.like]: 'guest_%@temp.com' }
      } 
    });
    if (!user) {
      // Geçici kullanıcı oluştur
      user = await User.create({
        name: name,
        email: tempEmail, // Geçici email
        password: 'temp123', // Geçici şifre
        role: 'user'
      });
    }

    // Guest yorumları için dummy booking bul veya oluştur
    // Bu booking tüm guest yorumları için kullanılacak
    // Admin notes alanında özel bir işaret kullanarak buluyoruz
    let dummyBooking = await Booking.findOne({ 
      where: { 
        requestType: 'manual',
        status: 'completed',
        adminNotes: { [Op.like]: '%GUEST_REVIEW_DUMMY%' }
      }
    });

    if (!dummyBooking) {
      // Dummy booking oluştur
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date(pastDate);
      futureDate.setDate(futureDate.getDate() + 1);

      dummyBooking = await Booking.create({
        propertyId: property.id,
        guestId: user.id,
        checkIn: pastDate,
        checkOut: futureDate,
        guestsAdults: 1,
        guestsChildren: 0,
        pricingDailyRate: 0,
        pricingTotalDays: 1,
        pricingSubtotal: 0,
        pricingServiceFee: 0,
        pricingTax: 0,
        pricingTotal: 0,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        status: 'completed',
        requestType: 'manual',
        guestInfo: JSON.stringify({ 
          name: 'Guest Review',
          email: 'guest@review.com',
          phone: '0000000000'
        }),
        adminNotes: 'GUEST_REVIEW_DUMMY - Bu rezervasyon misafir yorumları için kullanılmaktadır.',
        policiesAccepted: true,
        policiesAcceptedAt: new Date()
      });
    }

    const review = await Review.create({
      propertyId: property.id,
      bookingId: dummyBooking.id,
      userId: user.id,
      ratingOverall: rating || 5,
      ratingCleanliness: rating || 5,
      ratingLocation: rating || 5,
      ratingValue: rating || 5,
      ratingCommunication: rating || 5,
      comment: comment,
      isVerified: false // Misafir yorumu
    });
    
    await review.reload({
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Property, as: 'property', attributes: ['title'] }
      ]
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('[Guest Review] Hata:', error);
    console.error('[Guest Review] Hata detayı:', error.stack);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

module.exports = router;








