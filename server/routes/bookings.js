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
      console.error('Booking validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { property, checkIn, checkOut, guests, guestInfo, payment, policiesAccepted } = req.body;
    
    // Debug log
    console.log('Booking request received:', {
      property,
      checkIn,
      checkOut,
      guests,
      guestInfo: guestInfo ? { name: guestInfo.name, email: guestInfo.email, phone: guestInfo.phone } : null,
      policiesAccepted
    });

    // Property kontrolü
    const propertyDoc = await Property.findByPk(property);
    if (!propertyDoc) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }
    // toJSON() çağrılmadan önce raw data'yı al (pricingDaily için)
    const propertyRaw = propertyDoc.get({ plain: true });
    const propertyData = propertyDoc.toJSON ? propertyDoc.toJSON() : propertyRaw;

    // Tarih kontrolü
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    // Not: Geçmiş tarih seçimi frontend'de engelleniyor; sunucuda ayrıca engelleme yapılmıyor

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır' });
    }

    // Müsaitlik kontrolü - frontend'de zaten dolu tarihler seçilemez
    // Backend'de sadece log tutulur, hata döndürülmez
    const normalizeAvailability = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return [...value];
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      }
      if (typeof value === 'object') {
        // Sequelize JSON alanı bazı sürümlerde plain object veya { '0': {...} } şeklinde dönebiliyor
        if (value.date || value.isAvailable !== undefined) {
          return [ { ...value } ];
        }
        return Object.values(value).map((item) => ({ ...item }));
      }
      return [];
    };

    let availability = normalizeAvailability(propertyData.availability);
    if (availability.length === 0) {
      availability = normalizeAvailability(propertyRaw?.availability);
    }
  const bookingDates = [];
  for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
    bookingDates.push(moment.utc(d).format('YYYY-MM-DD'));
  }

    // Log için kontrol (hata döndürülmez)
    const existingConfirmedBookings = await Booking.findAll({
      where: {
        propertyId: property,
        status: 'confirmed'
      }
    });

    for (const booking of existingConfirmedBookings) {
      const existingCheckIn = moment.utc(booking.checkIn).startOf('day');
      const existingCheckOut = moment.utc(booking.checkOut).startOf('day');
      const requestedCheckIn = moment.utc(checkInDate).startOf('day');
      const requestedCheckOut = moment.utc(checkOutDate).startOf('day');

    const overlapsOnStart = requestedCheckIn.isBefore(existingCheckOut) || requestedCheckIn.isSame(existingCheckOut);
    if (overlapsOnStart && requestedCheckOut.isAfter(existingCheckIn)) {
        // Çakışma var ama hata döndürülmez, sadece log
        console.log(`Uyarı: Rezervasyon çakışması tespit edildi (Property: ${property}, Booking: ${booking.id})`);
      }
    }

    // Misafir sayısı kontrolü
    // Fiyat hesaplama
    const totalDays = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const safeTotalDaysForPricing = totalDays > 0 ? totalDays : 1;
    const parseDecimal = (value) => {
      if (value === undefined || value === null) return undefined;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return Number.isFinite(num) ? num : undefined;
    };
    
    // Fiyat alanı eksikse kullanıcıya anlaşılır hata dön
    // propertyData toJSON() çağrılmış, nested pricing objesi var
    // propertyRaw ise direkt pricingDaily alanı var
    const listingType = propertyData.listingType || propertyRaw?.listingType || 'rent_daily';
    const isSale = listingType === 'sale';
    const isMonthly = listingType === 'rent_monthly';
    let pricingDaily;
    
    const findDailyFromPricing = () => {
      const dailyFromJson = parseDecimal(propertyData.pricing?.daily);
      if (dailyFromJson !== undefined) return dailyFromJson;
      const dailyFromRaw = parseDecimal(propertyRaw?.pricingDaily);
      if (dailyFromRaw !== undefined) return dailyFromRaw;
      return undefined;
    };

    // Satılık veya aylık kiralık daireler için özel mantık
    if (isSale || isMonthly) {
      const monthlyOrSalePrice = parseDecimal(propertyData.pricing?.monthly) ?? parseDecimal(propertyRaw?.pricingMonthly);
      if (monthlyOrSalePrice !== undefined && monthlyOrSalePrice > 0) {
        pricingDaily = monthlyOrSalePrice / safeTotalDaysForPricing;
        console.log(`${listingType} için toplam fiyat günlük fiyata bölündü:`, pricingDaily, 'toplam gün:', safeTotalDaysForPricing, 'toplam fiyat:', monthlyOrSalePrice);
      } else {
        const fallbackDaily = findDailyFromPricing();
        if (fallbackDaily !== undefined) {
          pricingDaily = fallbackDaily;
        }
      }
    } else {
      const dailyValue = findDailyFromPricing();
      if (dailyValue !== undefined) {
        pricingDaily = dailyValue;
        console.log('Fiyat bulundu:', pricingDaily);
      }
    }
    
    // Fiyat bulunamadıysa hata dön
    if (pricingDaily === undefined || pricingDaily === null) {
      console.error('Fiyat bilgisi bulunamadı:', {
        propertyId: property,
        listingType,
        isSale,
        hasPropertyDataPricing: !!propertyData.pricing,
        propertyDataPricingDaily: propertyData.pricing?.daily,
        propertyDataPricingMonthly: propertyData.pricing?.monthly,
        hasPropertyRaw: !!propertyRaw,
        propertyRawPricingDaily: propertyRaw?.pricingDaily,
        propertyRawPricingMonthly: propertyRaw?.pricingMonthly
      });
      return res.status(400).json({ message: 'Bu daire için fiyat bilgisi eksik. Lütfen yönetici ile iletişime geçin.' });
    }
    
    // Fiyat geçerli bir sayı mı kontrol et (satılık daireler için 0 kabul edilebilir)
    if (!Number.isFinite(pricingDaily) || isNaN(pricingDaily) || (!isSale && pricingDaily <= 0)) {
      console.error('Fiyat parse hatası:', {
        propertyId: property,
        listingType,
        isSale,
        pricingDaily,
        isFinite: Number.isFinite(pricingDaily),
        isNaN: isNaN(pricingDaily),
        propertyDataPricing: propertyData.pricing,
        propertyRawPricingDaily: propertyRaw?.pricingDaily,
        propertyRawPricingDailyType: typeof propertyRaw?.pricingDaily
      });
      return res.status(400).json({ message: 'Bu daire için fiyat bilgisi eksik. Lütfen yönetici ile iletişime geçin.' });
    }
    
    let dailyRate = pricingDaily;

    // Sezonsal fiyat kontrolü
    // propertyData toJSON() çağrılmış olabilir, bu durumda pricing.seasonalRates kullanılmalı
    const seasonalRates = propertyData?.pricing?.seasonalRates || propertyData?.seasonalRates || [];
    if (Array.isArray(seasonalRates) && seasonalRates.length > 0) {
      for (const rate of seasonalRates) {
        if (rate.startDate && rate.endDate && rate.multiplier) {
          if (checkInDate >= new Date(rate.startDate) && checkOutDate <= new Date(rate.endDate)) {
            dailyRate = dailyRate * Number(rate.multiplier);
            break;
          }
        }
      }
    }

    const settings = await Settings.findOne();
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
    const guestId = req.user ? req.user.id : null;

    // guestInfo kontrolü - allowNull: false olduğu için boş olamaz
    if (!guestInfo || typeof guestInfo !== 'object' || Object.keys(guestInfo).length === 0) {
      return res.status(400).json({ message: 'Misafir bilgileri gereklidir' });
    }

    // Decimal değerleri güvenli şekilde hesapla
    const safeDailyRate = Number.isFinite(Number(dailyRate)) ? Number(dailyRate) : 0;
    const safeTotalDays = Number.isFinite(Number(totalDays)) ? Number(totalDays) : 1;
    const safeSubtotal = Number.isFinite(Number(subtotal)) ? Number(subtotal) : 0;
    const safeServiceFee = Number.isFinite(Number(serviceFee)) ? Number(serviceFee) : 0;
    const safeTax = Number.isFinite(Number(tax)) ? Number(tax) : 0;
    const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;

    // Booking oluştur
    const booking = await Booking.create({
      propertyId: property,
      guestId: guestId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestsAdults: guests?.adults || 1,
      guestsChildren: guests?.children || 0,
      guestInfo: guestInfo, // Sequelize otomatik olarak JSON'a çevirir
      pricingDailyRate: safeDailyRate,
      pricingTotalDays: safeTotalDays,
      pricingSubtotal: safeSubtotal,
      pricingServiceFee: safeServiceFee,
      pricingTax: safeTax,
      pricingTotal: safeTotal,
      policiesAccepted: policiesAccepted === true,
      policiesAcceptedAt: policiesAccepted === true ? new Date() : null,
      paymentMethod: 'cash', // Ödeme sadece teslimatta/ofiste nakit olarak yapılacak
      paymentStatus: 'pending', // Ödeme durumu admin tarafından manuel güncellenir
      status: 'pending_request', // Rezervasyon durumu - onay bekliyor
      requestType: 'web' // Web'den gelen rezervasyon
    });

    // Müsaitliği "pending_request" olarak işaretle (henüz kesin rezervasyon değil)
    for (const date of bookingDates) {
      const existingSlot = availability.findIndex(a => {
        // Date objesi veya string olabilir
        const slotDate = a.date ? moment.utc(a.date).format('YYYY-MM-DD') : null;
        return slotDate === date;
      });
      
      if (existingSlot >= 0) {
        availability[existingSlot].isAvailable = false;
        availability[existingSlot].bookingId = booking.id;
        availability[existingSlot].status = 'pending_request';
        // Date'i ISO string'e çevir (eğer Date objesi ise)
        if (availability[existingSlot].date instanceof Date) {
          availability[existingSlot].date = moment.utc(availability[existingSlot].date).toISOString();
        }
      } else {
        // Date objesi yerine ISO string kullan (JSON serialization için)
        availability.push({
          date: moment.utc(date, 'YYYY-MM-DD').toISOString(),
          isAvailable: false,
          bookingId: booking.id,
          status: 'pending_request'
        });
      }
    }

    // Availability'yi güncelle
    try {
      await propertyDoc.update({ availability: availability });
    } catch (updateError) {
      console.error('Property availability update error:', updateError);
      // Availability güncelleme hatası rezervasyon oluşturmayı engellemez
    }

    // Booking'i ilişkilerle birlikte yeniden yükle (hata olursa da devam et)
    try {
      await booking.reload({
        include: [
          { model: Property, as: 'property', attributes: ['title', 'locationCity', 'locationDistrict', 'images'] },
          { model: User, as: 'guest', attributes: ['name', 'email'] }
        ]
      });
    } catch (reloadError) {
      console.error('Booking reload error:', reloadError);
      // Reload hatası rezervasyon oluşturmayı engellemez, booking zaten oluşturuldu
    }

    // E-posta bildirimleri gönder
    try {
      // Sequelize'de JSON alanlarına doğrudan erişim
      const guestInfoRaw = booking.get('guestInfo');
      const guestInfoParsed = typeof guestInfoRaw === 'string' 
        ? JSON.parse(guestInfoRaw) 
        : guestInfoRaw;
      
      const guestEmail = guestInfoParsed?.email || guestInfo?.email;
      const guestName = guestInfoParsed?.name || guestInfo?.name;
      
      if (guestEmail && guestName) {
        // Booking data'yı güvenli şekilde oluştur
        let bookingData;
        try {
          bookingData = booking.toJSON ? booking.toJSON() : booking;
        } catch (toJSONError) {
          console.error('toJSON error:', toJSONError);
          // toJSON hatası durumunda manuel oluştur
          bookingData = {
            _id: booking.id,
            propertyId: booking.propertyId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: {
              adults: booking.guestsAdults,
              children: booking.guestsChildren
            },
            guestInfo: guestInfoParsed,
            pricing: {
              dailyRate: parseFloat(booking.pricingDailyRate) || 0,
              totalDays: booking.pricingTotalDays || 0,
              subtotal: parseFloat(booking.pricingSubtotal) || 0,
              serviceFee: parseFloat(booking.pricingServiceFee) || 0,
              tax: parseFloat(booking.pricingTax) || 0,
              total: parseFloat(booking.pricingTotal) || 0
            },
            status: booking.status,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
          };
        }
        
        await emailService.sendRequestReceivedEmail(
          guestEmail,
          guestName,
          bookingData
        );
        
        // Admin'e bildirim gönder
        const admins = await User.findAll({ where: { role: 'admin' } });
        for (const admin of admins) {
          await emailService.notifyAdminNewRequest(admin.email, bookingData);
        }
      }
    } catch (emailError) {
      console.error('E-posta gönderme hatası:', emailError);
      // E-posta hatası rezervasyon oluşturmayı engellemez
    }

    // Booking'i JSON formatına çevir ve döndür
    let bookingResponse;
    try {
      bookingResponse = booking.toJSON ? booking.toJSON() : booking;
    } catch (toJSONError) {
      console.error('Response toJSON error:', toJSONError);
      // toJSON hatası durumunda manuel oluştur
      const guestInfoRaw = booking.get('guestInfo');
      const guestInfoParsed = typeof guestInfoRaw === 'string' 
        ? JSON.parse(guestInfoRaw) 
        : guestInfoRaw;
      
      bookingResponse = {
        _id: booking.id,
        propertyId: booking.propertyId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: {
          adults: booking.guestsAdults,
          children: booking.guestsChildren
        },
        guestInfo: guestInfoParsed,
        pricing: {
          dailyRate: parseFloat(booking.pricingDailyRate) || 0,
          totalDays: booking.pricingTotalDays || 0,
          subtotal: parseFloat(booking.pricingSubtotal) || 0,
          serviceFee: parseFloat(booking.pricingServiceFee) || 0,
          tax: parseFloat(booking.pricingTax) || 0,
          total: parseFloat(booking.pricingTotal) || 0
        },
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      };
    }
    
    res.status(201).json(bookingResponse);
  } catch (error) {
    console.error('Booking creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get bookings (public - for availability check)
router.get('/', async (req, res) => {
  try {
    const { property, status } = req.query;
    const filter = {};
    
    if (property) filter.propertyId = property;
    if (status) filter.status = status;
    else filter.status = 'confirmed'; // Default olarak sadece confirmed booking'leri döndür
    
    const bookings = await Booking.findAll({
      where: filter,
      attributes: ['checkIn', 'checkOut', 'status', 'paymentStatus'],
      order: [['checkIn', 'ASC']]
    });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    // Property model zaten import edilmiş
    const bookings = await Booking.findAll({ 
      where: { guestId: req.user.id },
      include: [
        { model: Property, as: 'property', attributes: ['title', 'locationCity', 'locationDistrict', 'images', 'pricingDaily', 'pricingWeekly', 'pricingMonthly'] }
      ],
      order: [['createdAt', 'DESC']]
    });

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

    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    // Sadece admin veya property sahibi iletişim kaydı ekleyebilir
    const property = await Property.findByPk(booking.propertyId);
    if (req.user.role !== 'admin' && property.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const bookingData = booking.toJSON();
    const communicationLog = bookingData.communicationLog || [];
    communicationLog.push({
      type: req.body.type,
      note: req.body.note,
      admin: req.user.id,
      date: new Date()
    });

    await booking.update({ communicationLog: communicationLog });
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Property ve User modelleri zaten import edilmiş
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Property, as: 'property' },
        { model: User, as: 'guest', attributes: ['name', 'email'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    const bookingData = booking.toJSON();
    // Sadece booking sahibi veya property sahibi görebilir
    if (bookingData.guest !== req.user.id && 
        bookingData.property.owner !== req.user.id &&
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
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === 'completed') {
        updateData.paymentPaidAt = new Date();
        updateData.status = 'confirmed';
      }
    }

    await booking.update(updateData);

    const property = await Property.findByPk(booking.propertyId);
    if (property) {
      const propertyData = property.toJSON();
      const availability = (() => {
        if (Array.isArray(propertyData.availability)) {
          return propertyData.availability;
        }
        if (typeof propertyData.availability === 'string') {
          try {
            const parsed = JSON.parse(propertyData.availability);
            return Array.isArray(parsed) ? parsed : [];
          } catch (_) {
            return [];
          }
        }
        if (propertyData.availability && typeof propertyData.availability === 'object') {
          return Object.values(propertyData.availability);
        }
        return [];
      })();
      const checkInMoment = moment.utc(booking.checkIn).startOf('day');
      const checkOutMoment = moment.utc(booking.checkOut).startOf('day');
      const dateRange = [];

      for (let m = checkInMoment.clone(); m.isBefore(checkOutMoment); m.add(1, 'day')) {
        dateRange.push(m.clone());
      }

      const findSlot = (m) => availability.find(a =>
        moment.utc(a.date).format('YYYY-MM-DD') === m.format('YYYY-MM-DD') &&
        a.bookingId?.toString() === booking.id.toString()
      );

      const ensureSlot = (m) => {
        let slot = findSlot(m);
        if (!slot) {
          slot = {
            date: m.toDate(),
            isAvailable: false,
            bookingId: booking.id,
            status: 'pending_request'
          };
          availability.push(slot);
        }
        return slot;
      };

      if (paymentStatus) {
        dateRange.forEach((m) => {
          const slot = ensureSlot(m);
          slot.bookingId = booking.id;
          slot.isAvailable = false;
          slot.status = paymentStatus === 'completed' ? 'confirmed' : 'pending_request';
        });
      }

      if (status === 'confirmed') {
        dateRange.forEach((m) => {
          const slot = ensureSlot(m);
          slot.bookingId = booking.id;
          slot.isAvailable = false;
          const bookingData = booking.toJSON();
          slot.status = bookingData.payment?.status === 'completed' ? 'confirmed' : 'pending_request';
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

      await property.update({ availability: availability });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;

