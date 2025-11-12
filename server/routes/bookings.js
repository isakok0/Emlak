const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { auth } = require('../middleware/auth');
const moment = require('moment');
const emailService = require('../services/emailService');

const router = express.Router();

// Create booking (anonim kullanıcılar için açık)
router.post('/', [
  body('property').notEmpty().withMessage('Daire seçilmelidir'),
  body('checkIn').isISO8601().withMessage('Geçerli bir giriş tarihi giriniz'),
  body('checkOut').isISO8601().withMessage('Geçerli bir çıkış tarihi giriniz'),
  body('guests.adults').isInt({ min: 1 }).withMessage('En az 1 yetişkin olmalıdır'),
  body('guestInfo.name').notEmpty().withMessage('İsim gereklidir'),
  body('guestInfo.email').isEmail().withMessage('Geçerli bir e-posta giriniz'),
  body('guestInfo.phone').notEmpty().withMessage('Telefon gereklidir'),
  body('policiesAccepted').custom(value => value === true).withMessage('Rezervasyon öncesinde kullanım koşullarını, gizlilik politikasını ve iptal/iade şartlarını kabul etmelisiniz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { property, checkIn, checkOut, guests, guestInfo, payment, policiesAccepted } = req.body;

    // Property kontrolü
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    // Tarih kontrolü
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    // Not: Geçmiş tarih seçimi frontend'de engelleniyor; sunucuda ayrıca engelleme yapılmıyor

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır' });
    }

    // Müsaitlik kontrolü - frontend'de zaten dolu tarihler seçilemez
    // Backend'de sadece log tutulur, hata döndürülmez
    const availability = propertyDoc.availability || [];
    const bookingDates = [];
    for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
      bookingDates.push(moment.utc(d).format('YYYY-MM-DD'));
    }

    // Log için kontrol (hata döndürülmez)
    const existingConfirmedBookings = await Booking.find({
      property: property,
      status: 'confirmed'
    });

    for (const booking of existingConfirmedBookings) {
      const existingCheckIn = moment.utc(booking.checkIn).startOf('day');
      const existingCheckOut = moment.utc(booking.checkOut).startOf('day');
      const requestedCheckIn = moment.utc(checkInDate).startOf('day');
      const requestedCheckOut = moment.utc(checkOutDate).startOf('day');

      if (requestedCheckIn.isBefore(existingCheckOut) && requestedCheckOut.isAfter(existingCheckIn)) {
        // Çakışma var ama hata döndürülmez, sadece log
        console.log(`Uyarı: Rezervasyon çakışması tespit edildi (Property: ${property}, Booking: ${booking._id})`);
      }
    }

    // Misafir sayısı kontrolü
    // Fiyat hesaplama
    const totalDays = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    // Fiyat alanı eksikse kullanıcıya anlaşılır hata dön
    const pricingDaily = propertyDoc?.pricing?.daily;
    if (typeof pricingDaily !== 'number' || Number.isNaN(pricingDaily)) {
      return res.status(400).json({ message: 'Bu daire için fiyat bilgisi eksik. Lütfen yönetici ile iletişime geçin.' });
    }
    let dailyRate = pricingDaily;

    // Sezonsal fiyat kontrolü
    if (propertyDoc.pricing.seasonalRates && propertyDoc.pricing.seasonalRates.length > 0) {
      for (const rate of propertyDoc.pricing.seasonalRates) {
        if (checkInDate >= new Date(rate.startDate) && checkOutDate <= new Date(rate.endDate)) {
          dailyRate = dailyRate * rate.multiplier;
          break;
        }
      }
    }

    const settings = await Settings.findOne().lean();
    const includedAdults = typeof settings?.includedAdultsCount === 'number' ? settings.includedAdultsCount : 2;
    const includedChildren = typeof settings?.includedChildrenCount === 'number' ? settings.includedChildrenCount : 1;
    const extraPerAdult = typeof settings?.extraAdultPrice === 'number' ? settings.extraAdultPrice : 150;
    const extraPerChild = typeof settings?.extraChildPrice === 'number' ? settings.extraChildPrice : 75;
    const extraAdults = Math.max(0, (guests?.adults || 1) - includedAdults);
    const extraChildren = Math.max(0, (guests?.children || 0) - includedChildren);
    const extraPerDay = (extraAdults * extraPerAdult) + (extraChildren * extraPerChild);
    const subtotal = (dailyRate + extraPerDay) * totalDays;
    // KDV ve servis ücreti alınmıyor; toplam sadece gecelik + kişi farkı
    const serviceFee = 0;
    const tax = 0;
    const total = subtotal;

    // Guest ID - eğer auth varsa kullan, yoksa null
    const guestId = req.user ? req.user._id : null;

    // Booking oluştur
    const booking = new Booking({
      property,
      guest: guestId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      guestInfo: guestInfo || {},
      pricing: {
        dailyRate,
        totalDays,
        subtotal,
        serviceFee,
        tax,
        total
      },
      policiesAccepted: policiesAccepted === true,
      policiesAcceptedAt: policiesAccepted === true ? new Date() : undefined,
      payment: {
        method: 'cash', // Ödeme sadece teslimatta/ofiste nakit olarak yapılacak
        status: 'pending' // Ödeme durumu admin tarafından manuel güncellenir
      }
    });

    await booking.save();

    // Müsaitliği "pending_request" olarak işaretle (henüz kesin rezervasyon değil)
    for (const date of bookingDates) {
      const existingSlot = availability.findIndex(a => 
        moment.utc(a.date).format('YYYY-MM-DD') === date
      );
      
      if (existingSlot >= 0) {
        availability[existingSlot].isAvailable = false;
        availability[existingSlot].bookingId = booking._id;
        availability[existingSlot].status = 'pending_request';
      } else {
        availability.push({
          date: moment.utc(date, 'YYYY-MM-DD').toDate(),
          isAvailable: false,
          bookingId: booking._id,
          status: 'pending_request'
        });
      }
    }

    propertyDoc.availability = availability;
    await propertyDoc.save();

    await booking.populate('property', 'title location images');
    await booking.populate('guest', 'name email');

    // E-posta bildirimleri gönder
    try {
      await emailService.sendRequestReceivedEmail(
        booking.guestInfo.email,
        booking.guestInfo.name,
        booking
      );
      
      // Admin'e bildirim gönder
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await emailService.notifyAdminNewRequest(admin.email, booking);
      }
    } catch (emailError) {
      console.error('E-posta gönderme hatası:', emailError);
      // E-posta hatası rezervasyon oluşturmayı engellemez
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get bookings (public - for availability check)
router.get('/', async (req, res) => {
  try {
    const { property, status } = req.query;
    const filter = {};
    
    if (property) filter.property = property;
    if (status) filter.status = status;
    else filter.status = 'confirmed'; // Default olarak sadece confirmed booking'leri döndür
    
    const bookings = await Booking.find(filter)
      .select('checkIn checkOut status payment.status')
      .sort({ checkIn: 1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate('property', 'title location images pricing')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Add communication log to booking
router.post('/:id/communication', auth, [
  body('note').notEmpty().withMessage('Not gereklidir'),
  body('type').isIn(['call', 'email', 'sms', 'note']).withMessage('Geçerli bir iletişim tipi seçiniz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    // Sadece admin veya property sahibi iletişim kaydı ekleyebilir
    const property = await Property.findById(booking.property);
    if (req.user.role !== 'admin' && property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    booking.communicationLog.push({
      type: req.body.type,
      note: req.body.note,
      admin: req.user._id
    });

    await booking.save();
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property')
      .populate('guest', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    // Sadece booking sahibi veya property sahibi görebilir
    if (booking.guest._id.toString() !== req.user._id.toString() && 
        booking.property.owner.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update booking status (payment confirmation, cancellation, etc.)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    if (status) {
      booking.status = status;
    }

    if (paymentStatus) {
      booking.payment.status = paymentStatus;
      if (paymentStatus === 'completed') {
        booking.payment.paidAt = new Date();
        booking.status = 'confirmed';
      }
    }

    await booking.save();

    const property = await Property.findById(booking.property);
    if (property) {
      const availability = property.availability || [];
      const checkInMoment = moment.utc(booking.checkIn).startOf('day');
      const checkOutMoment = moment.utc(booking.checkOut).startOf('day');
      const dateRange = [];

      for (let m = checkInMoment.clone(); m.isBefore(checkOutMoment); m.add(1, 'day')) {
        dateRange.push(m.clone());
      }

      const findSlot = (m) => availability.find(a =>
        moment.utc(a.date).format('YYYY-MM-DD') === m.format('YYYY-MM-DD') &&
        a.bookingId?.toString() === booking._id.toString()
      );

      const ensureSlot = (m) => {
        let slot = findSlot(m);
        if (!slot) {
          slot = {
            date: m.toDate(),
            isAvailable: false,
            bookingId: booking._id,
            status: 'pending_request'
          };
          availability.push(slot);
        }
        return slot;
      };

      if (paymentStatus) {
        dateRange.forEach((m) => {
          const slot = ensureSlot(m);
          slot.bookingId = booking._id;
          slot.isAvailable = false;
          slot.status = paymentStatus === 'completed' ? 'confirmed' : 'pending_request';
        });
      }

      if (status === 'confirmed') {
        dateRange.forEach((m) => {
          const slot = ensureSlot(m);
          slot.bookingId = booking._id;
          slot.isAvailable = false;
          slot.status = booking.payment?.status === 'completed' ? 'confirmed' : 'pending_request';
        });
      }

      if (status === 'cancelled') {
        dateRange.forEach((m) => {
          const slot = findSlot(m);
          if (slot) {
            slot.isAvailable = true;
            slot.bookingId = null;
            slot.status = 'available';
          }
        });
      }

      if (status === 'completed') {
        const today = moment.utc().startOf('day');
        dateRange.forEach((m) => {
          const slot = findSlot(m);
          if (slot && m.isSameOrAfter(today)) {
            slot.isAvailable = true;
            slot.bookingId = null;
            slot.status = 'available';
          }
        });
      }

      property.availability = availability;
      await property.save();
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;

