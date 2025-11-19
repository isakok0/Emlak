const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, admin, superAdmin } = require('../middleware/auth');
const { Op, Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const ContactMessage = require('../models/ContactMessage');
const Settings = require('../models/Settings');
const MonthlyRevenue = require('../models/MonthlyRevenue');
const moment = require('moment');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const router = express.Router();

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || '';
const PAGESPEED_SITE_URL = process.env.PAGESPEED_SITE_URL || process.env.PUBLIC_SITE_URL || '';

// Simple uploader for brand logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'server/uploads/'),
  filename: (req, file, cb) => cb(null, `logo-${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (/^image\//i.test(file.mimetype)) return cb(null, true);
  cb(new Error('Sadece görsel dosyası yükleyin'));
}});

// All admin routes require authentication and admin role
router.use(auth);
router.use(admin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalProperties = await Property.count();
    const totalBookings = await Booking.count();
    const pendingRequests = await Booking.count({ where: { status: 'pending_request' } });
    
    const totalRevenueResult = await Booking.findAll({
      where: {
        paymentStatus: 'completed',
        status: 'confirmed'
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('pricing_total')), 'total']
      ],
      raw: true
    });
    const totalRevenue = parseFloat(totalRevenueResult[0]?.total || 0);

    const recentBookings = await Booking.findAll({
      include: [
        { model: Property, as: 'property', attributes: ['title'] },
        { model: User, as: 'guest', attributes: ['name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      stats: {
        totalUsers,
        totalProperties,
        totalBookings,
        pendingRequests,
        totalRevenue: totalRevenue || 0
      },
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Admin: contact messages list/update
router.get('/messages', async (req, res) => {
  try {
    const msgs = await ContactMessage.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(msgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Delete a booking (admin)
router.delete('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    // Release property availability if necessary
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
          // Sequelize JSON field bazen object dönebiliyor; değerleri arraye çevir
          return Object.values(propertyData.availability);
        }
        return [];
      })();
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = moment.utc(d).format('YYYY-MM-DD');
        const slot = availability.find(a => 
          moment.utc(a.date).format('YYYY-MM-DD') === dateStr && 
          a.bookingId?.toString() === booking.id.toString()
        );
        if (slot) {
          slot.isAvailable = true;
          slot.bookingId = null;
          slot.status = 'available';
        }
      }
      await property.update({ availability: availability });
    }

    // Booking'e bağlı yorumlar varsa önce sil (FK kısıtını ihlal etmesin)
    try {
      await Review.destroy({ where: { bookingId: booking.id } });
    } catch (reviewDeleteError) {
      console.error('Booking silme - review temizleme hatası:', reviewDeleteError);
      return res.status(500).json({ message: 'İlişkili yorumlar silinemedi' });
    }

    await booking.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin Booking Delete] Hata:', error);
    try {
      const logPath = path.join(__dirname, '..', '..', 'server-log.txt');
      const logMessage = `\n[${new Date().toISOString()}] Admin booking delete error (id: ${req.params.id}): ${error.message}\n${error.stack || ''}\n`;
      fs.appendFileSync(logPath, logMessage);
    } catch (logError) {
      console.error('Admin booking delete log yazılamadı:', logError);
    }
    res.status(500).json({ message: `Sunucu hatası: ${error.message}` });
  }
});

// Reviews - list all (latest first)
router.get('/reviews', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    
    // Debug: Tüm yorumları say
    const totalCount = await Review.count();
    console.log(`[Admin Reviews] Toplam yorum sayısı: ${totalCount}`);
    
    // Önce tüm yorumları al (populate olmadan)
    const allReviews = await Review.findAll({
      order: [['createdAt', 'DESC']],
      limit: limit,
      raw: false
    });
    
    console.log(`[Admin Reviews] Bulunan yorum sayısı: ${allReviews.length}`);
    
    // Her yorum için populate işlemini manuel yap
    const reviews = await Promise.all(allReviews.map(async (review) => {
      try {
        const reviewObj = review.toJSON ? review.toJSON() : { ...review.get() }; // Yeni obje oluştur
        
        // User populate
        if (review.userId) {
          const user = await User.findByPk(review.userId, { attributes: ['name', 'email'] });
          reviewObj.user = user ? user.toJSON() : { name: 'Silinmiş Kullanıcı', email: '' };
        } else {
          reviewObj.user = { name: 'Bilinmeyen Kullanıcı', email: '' };
        }
        
        // Property populate
        if (review.propertyId) {
          const property = await Property.findByPk(review.propertyId, { attributes: ['title'] });
          reviewObj.property = property ? property.toJSON() : { title: 'Silinmiş Daire' };
        } else {
          reviewObj.property = { title: 'Bilinmeyen Daire' };
        }
        
        return reviewObj;
      } catch (err) {
        console.error(`[Admin Reviews] Yorum populate hatası (${review.id || review._id}):`, err);
        // Hata durumunda fallback değerler
        const reviewObj = review.toJSON ? review.toJSON() : { ...review.get() };
        if (!reviewObj.user || typeof reviewObj.user === 'string') {
          reviewObj.user = { name: 'Bilinmeyen Kullanıcı', email: '' };
        }
        if (!reviewObj.property || typeof reviewObj.property === 'string') {
          reviewObj.property = { title: 'Bilinmeyen Daire' };
        }
        return reviewObj;
      }
    }));
    
    console.log(`[Admin Reviews] Döndürülen yorum sayısı: ${reviews.length}`);
    
    // Debug parametresi varsa debug bilgisi ekle
    if (req.query.debug === 'true') {
      res.json({
        reviews: reviews,
        debug: {
          totalCount: totalCount,
          foundCount: allReviews.length,
          returnedCount: reviews.length
        }
      });
    } else {
      res.json(reviews);
    }
  } catch (error) {
    console.error('[Admin Reviews] Hata:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Reviews - delete
router.delete('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    // _id veya id olarak gelebilir, her ikisini de kontrol et
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Yorum bulunamadı' });
    }
    // Veritabanından sil
    await review.destroy();
    console.log(`[Admin Reviews] Yorum silindi: ${reviewId}`);
    res.json({ success: true, message: 'Yorum başarıyla silindi' });
  } catch (error) {
    console.error('[Admin Reviews] Silme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Reviews - delete all and create random reviews
router.post('/reviews/seed', async (req, res) => {
  try {
    const Review = require('../models/Review');
    const User = require('../models/User');
    const Property = require('../models/Property');
    const Booking = require('../models/Booking');

    // Türkçe yorum örnekleri
    const sampleComments = [
      'Harika bir konum, denize çok yakın. Daire temiz ve ferah. Kesinlikle tekrar geliriz!',
      'Çok güzel bir daireydi. Sahibi çok ilgiliydi. Her şey tam olarak tarif edildiği gibiydi.',
      'Tatilimiz çok güzeldi. Daire çok temiz ve konforluydu. Öneririm!',
      'Mükemmel bir deneyim. Hem konum hem de daire çok iyiydi. Teşekkürler!',
      'Çok memnun kaldık. Daire çok şık ve modern. Kesinlikle tavsiye ederim.',
      'Harika bir tatil geçirdik. Daire çok temiz ve düzenliydi. Tekrar gelmek isteriz.',
      'Çok güzel bir yer. Denize yakın, temiz ve konforlu. Her şey mükemmeldi!',
      'Daire çok beğendik. Sahibi çok yardımcıydı. Kesinlikle tekrar geliriz.',
      'Mükemmel bir konum. Daire çok temiz ve ferah. Çok memnun kaldık!',
      'Harika bir deneyim. Her şey çok iyiydi. Kesinlikle öneririm!',
      'Çok güzel bir daire. Temiz, konforlu ve denize yakın. Teşekkürler!',
      'Tatilimiz çok güzeldi. Daire çok beğendik. Tekrar gelmek isteriz.',
      'Mükemmel bir yer. Hem konum hem de daire çok iyiydi. Öneririm!',
      'Çok memnun kaldık. Daire çok şık ve modern. Her şey mükemmeldi!',
      'Harika bir tatil geçirdik. Daire çok temiz ve düzenliydi. Teşekkürler!'
    ];

    function getRandomRating() {
      const rand = Math.random();
      if (rand < 0.7) return Math.floor(Math.random() * 2) + 4; // 4 veya 5
      else if (rand < 0.9) return 3;
      else return Math.floor(Math.random() * 2) + 1; // 1 veya 2
    }

    function getRandomSubRating() {
      return Math.floor(Math.random() * 3) + 3; // 3-5
    }

    function getRandomElement(array) {
      return array[Math.floor(Math.random() * array.length)];
    }

    // 1. Tüm yorumları sil
    const deletedCount = await Review.destroy({ where: {} });
    console.log(`[Seed Reviews] ${deletedCount} yorum silindi`);

    // 2. Kullanıcı ve daireleri al
    let users = await User.findAll({ where: { role: 'user' }, limit: 30 });
    let properties = await Property.findAll({ where: { isActive: true }, limit: 30 });

    // Eğer kullanıcı yoksa, admin kullanıcısını kullan
    if (users.length === 0) {
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      if (adminUser) {
        users = [adminUser];
        console.log('[Seed Reviews] Admin kullanıcısı kullanılıyor');
      }
    }

    // Eğer daire yoksa hata ver
    if (properties.length === 0) {
      return res.status(400).json({ 
        message: 'Daire bulunamadı. Önce daireler oluşturulmalı.',
        usersCount: users.length,
        propertiesCount: 0
      });
    }

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Kullanıcı bulunamadı. Önce kullanıcılar oluşturulmalı.',
        usersCount: 0,
        propertiesCount: properties.length
      });
    }

    console.log(`[Seed Reviews] ${users.length} kullanıcı ve ${properties.length} daire bulundu`);

    // 3. Tek bir dummy booking oluştur (tüm yorumlar için kullanılacak)
    // Mevcut dummy booking'i bul veya oluştur
    let dummyBooking = await Booking.findOne({ 
      where: { 
        requestType: 'manual',
        status: 'completed',
        adminNotes: { [Op.like]: '%REVIEW_SEED_DUMMY%' }
      }
    });

    if (!dummyBooking) {
      // Dummy booking oluştur - ilk property ve ilk user ile
      const firstProperty = properties[0];
      const firstUser = users[0];
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date(pastDate);
      futureDate.setDate(futureDate.getDate() + 1);

      dummyBooking = await Booking.create({
        propertyId: firstProperty.id,
        guestId: firstUser.id,
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
          name: 'Seed Review Dummy',
          email: 'dummy@seed.review',
          phone: '0000000000'
        }),
        adminNotes: 'REVIEW_SEED_DUMMY - Bu rezervasyon seed yorumları için kullanılmaktadır.',
        policiesAccepted: true,
        policiesAcceptedAt: new Date()
      });
      console.log('[Seed Reviews] Dummy booking oluşturuldu');
    }

    // 4. Rastgele yorumlar oluştur (booking oluşturulmadan)
    const reviewCount = parseInt(req.body.count, 10) || 30;
    const reviewsToCreate = [];

    console.log(`[Seed Reviews] ${reviewCount} yorum oluşturulacak`);

    // Türkçe isimler
    const turkishNames = [
      'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Şahin', 'Ali Çelik',
      'Zeynep Arslan', 'Mustafa Özdemir', 'Elif Yıldız', 'Burak Doğan', 'Selin Avcı',
      'Can Öztürk', 'Derya Kılıç', 'Emre Yücel', 'Gizem Aydın', 'Hakan Taş',
      'İrem Çakır', 'Kemal Bulut', 'Leyla Güneş', 'Murat Aktaş', 'Nazlı Deniz',
      'Cem Özkan', 'Deniz Yıldırım', 'Ebru Karaca', 'Furkan Şen', 'Gökhan Aydın',
      'Hilal Çetin', 'İlker Kaya', 'Jale Arslan', 'Kaan Yılmaz', 'Lale Özdemir'
    ];

    for (let i = 0; i < reviewCount && i < 50; i++) {
      // Her yorum için farklı bir rastgele isim kullan
      const randomName = getRandomElement(turkishNames);
      const tempEmail = `guest_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}@temp.com`;
      
      // Bu isimle kullanıcı var mı kontrol et
      let user = await User.findOne({ 
        where: { 
          name: randomName, 
          email: { [Op.like]: 'guest_%@temp.com' }
        } 
      });
      
      // Eğer yoksa yeni kullanıcı oluştur
      if (!user) {
        user = await User.create({
          name: randomName,
          email: tempEmail,
          password: 'temp123',
          role: 'user'
        });
        console.log(`[Seed Reviews] Yeni kullanıcı oluşturuldu: ${randomName}`);
      }

      const property = getRandomElement(properties);
      const rating = getRandomRating();

      // Tüm yorumlar için aynı dummy booking'i kullan
      const review = {
        propertyId: property.id,
        bookingId: dummyBooking.id, // Tek bir dummy booking kullan
        userId: user.id,
        ratingOverall: rating,
        ratingCleanliness: getRandomSubRating(),
        ratingLocation: getRandomSubRating(),
        ratingValue: getRandomSubRating(),
        ratingCommunication: getRandomSubRating(),
        comment: getRandomElement(sampleComments),
        isVerified: Math.random() > 0.3, // %70 verified
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      };

      reviewsToCreate.push(review);
    }

    console.log(`[Seed Reviews] ${reviewsToCreate.length} yorum bulkCreate ile kaydedilecek`);
    await Review.bulkCreate(reviewsToCreate);
    const finalCount = await Review.count();
    console.log(`[Seed Reviews] Toplam yorum sayısı: ${finalCount}`);

    res.json({
      success: true,
      message: `${reviewsToCreate.length} yorum oluşturuldu`,
      deleted: deletedCount,
      created: reviewsToCreate.length,
      total: finalCount
    });
  } catch (error) {
    console.error('[Seed Reviews] Hata:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Calendar data (next 60 days)
router.get('/calendar', async (req, res) => {
  try {
    const now = new Date();
    const until = new Date(Date.now() + 60*24*60*60*1000);
    const bookings = await Booking.findAll({
      where: {
        checkIn: { [Op.lte]: until },
        checkOut: { [Op.gte]: now }
      },
      include: [{
        model: Property,
        as: 'property',
        attributes: ['id', 'title', 'locationCity', 'locationDistrict', 'locationNeighborhood']
      }]
    });
    res.json(bookings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Finance - monthly revenue list (and upsert current month)
router.get('/finance', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Compute current month total from bookings and upsert
    const monthStart = new Date(year, month-1, 1);
    const nextMonthStart = new Date(year, month, 1);
    const agg = await Booking.findAll({
      where: {
        status: { [Op.in]: ['confirmed', 'completed'] },
        checkIn: { [Op.gte]: monthStart, [Op.lt]: nextMonthStart }
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('pricing_total')), 'revenue']
      ],
      raw: true
    });
    const total = parseFloat(agg[0]?.revenue || 0);
    
    await MonthlyRevenue.upsert({ 
      year, 
      month, 
      total, 
      updatedAt: new Date() 
    });

    const list = await MonthlyRevenue.findAll({
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Delete a month record
router.delete('/finance/:id', async (req, res) => {
  try {
    await MonthlyRevenue.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Kayıt silindi' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});
router.patch('/messages/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }
    const msg = await ContactMessage.findByPk(req.params.id);
    if (msg) {
      await msg.update({ status });
    }
    if (!msg) return res.status(404).json({ message: 'Mesaj bulunamadı' });
    res.json(msg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Delete contact message
router.delete('/messages/:id', async (req, res) => {
  try {
    const del = await ContactMessage.findByPk(req.params.id);
    if (del) {
      await del.destroy();
    }
    if (!del) return res.status(404).json({ message: 'Mesaj bulunamadı' });
    res.json({ message: 'Mesaj silindi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/performance', async (req, res) => {
  try {
    const targetUrl = req.query.url || PAGESPEED_SITE_URL;

    if (!targetUrl) {
      return res.status(400).json({ message: 'Analiz edilecek URL belirtilmedi. url parametresi gönderin veya PAGESPEED_SITE_URL ortam değişkenini ayarlayın.' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (_) {
      return res.status(400).json({ message: 'Geçersiz URL formatı. Lütfen https:// ile başlayan geçerli bir adres girin.' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const disallowedHosts = ['localhost', '127.0.0.1', '::1'];
    if (disallowedHosts.includes(hostname) || hostname.endsWith('.local')) {
      return res.status(400).json({ message: 'Google PageSpeed yalnızca herkese açık (internet üzerinden erişilebilir) URL’leri analiz edebilir. Lütfen canlı sitenizin adresini kullanın.' });
    }

    const strategies = ['mobile', 'desktop'];
    const metrics = {};

    const mapAudit = (audit) => {
      if (!audit) return null;
      return {
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || null,
        numericValue: typeof audit.numericValue === 'number' ? audit.numericValue : null,
        numericUnit: audit.numericUnit || null,
        score: typeof audit.score === 'number' ? audit.score : null
      };
    };

    const mapFieldMetric = (metricsObj = {}, key) => {
      const metric = metricsObj[key];
      if (!metric) return null;
      return {
        percentile: metric.percentile || null,
        category: metric.category || null,
        distributions: metric.distributions || []
      };
    };

    for (const strategy of strategies) {
      const params = new URLSearchParams({ url: parsedUrl.toString(), strategy, category: 'performance' });
      if (PAGESPEED_API_KEY) {
        params.append('key', PAGESPEED_API_KEY);
      }

      let response;
      let data;
      try {
        response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            data = {};
          }
        } else {
          data = {};
        }
      } catch (networkError) {
        return res.status(502).json({ message: `PageSpeed servisine ulaşılamadı: ${networkError.message}` });
      }

      if (!response.ok) {
        const apiMessage = data?.error?.message || `PageSpeed API (${strategy}) hatası`;
        return res.status(response.status >= 400 && response.status < 500 ? 400 : 502).json({
          message: apiMessage,
          details: data?.error || null
        });
      }

      const lighthouse = data?.lighthouseResult || {};
      const audits = lighthouse?.audits || {};
      const categories = lighthouse?.categories || {};
      const loadingExperience = data?.loadingExperience || {};

      metrics[strategy] = {
        score: typeof categories?.performance?.score === 'number' ? Math.round(categories.performance.score * 100) : null,
        lighthouseVersion: lighthouse?.lighthouseVersion || null,
        fetchTime: lighthouse?.fetchTime || data?.analysisUTCTimestamp || null,
        coreWebVitalsAssessment: loadingExperience?.overall_category || null,
        audits: {
          lcp: mapAudit(audits['largest-contentful-paint']),
          fcp: mapAudit(audits['first-contentful-paint']),
          cls: mapAudit(audits['cumulative-layout-shift']),
          inp: mapAudit(audits['experimental-interaction-to-next-paint'] || audits['max-potential-fid']),
          tbt: mapAudit(audits['total-blocking-time']),
          si: mapAudit(audits['speed-index'])
        },
        fieldData: {
          lcp: mapFieldMetric(loadingExperience.metrics, 'LARGEST_CONTENTFUL_PAINT_MS'),
          fcp: mapFieldMetric(loadingExperience.metrics, 'FIRST_CONTENTFUL_PAINT_MS'),
          cls: mapFieldMetric(loadingExperience.metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
          inp: mapFieldMetric(loadingExperience.metrics, 'INTERACTION_TO_NEXT_PAINT'),
          ttfb: mapFieldMetric(loadingExperience.metrics, 'EXPERIMENTAL_TIME_TO_FIRST_BYTE')
        }
      };
    }

    res.json({
      url: parsedUrl.toString(),
      fetchedAt: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    console.error('PageSpeed monitoring hatası:', error);
    res.status(500).json({ message: 'Sayfa hız verileri alınamadı', error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const bookings = await Booking.findAll({
      where: filter,
      include: [
        { model: Property, as: 'property', attributes: ['title', 'locationCity', 'locationDistrict', 'images', 'listingType'] },
        { model: User, as: 'guest', attributes: ['name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get pending requests
router.get('/bookings/pending', async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { status: 'pending_request' },
      include: [
        { model: Property, as: 'property', attributes: ['title', 'locationCity', 'locationDistrict', 'images', 'pricingDaily', 'pricingWeekly', 'pricingMonthly', 'listingType'] },
        { model: User, as: 'guest', attributes: ['name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Approve booking request
router.post('/bookings/:id/approve', async (req, res) => {
  try {
    const { paymentInfo } = req.body;
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Property, as: 'property' },
        { model: User, as: 'guest', attributes: ['name', 'email'] }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    if (booking.status !== 'pending_request') {
      return res.status(400).json({ message: 'Sadece bekleyen talepler onaylanabilir' });
    }

    // Status'u confirmed yap
    const updateData = { status: 'confirmed' };
    if (req.body.adminNotes) {
      updateData.adminNotes = req.body.adminNotes;
    }
    await booking.update(updateData);
    
    // Booking'i yeniden yükle (güncellenmiş veriler için)
    await booking.reload();

    // Property müsaitliğini güncelle
    try {
      const property = await Property.findByPk(booking.propertyId);
      if (property) {
        const propertyData = property.toJSON ? property.toJSON() : property;
        const availability = Array.isArray(propertyData.availability) ? [...propertyData.availability] : [];
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        
        // Onaylama işleminde her zaman 'confirmed' olmalı
        const desiredStatus = 'confirmed';
        
        for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
          const dayMoment = moment.utc(d);
          const dateStr = dayMoment.format('YYYY-MM-DD');
          const slot = availability.find(a => {
            if (!a || !a.date) return false;
            const slotDateStr = moment.utc(a.date).format('YYYY-MM-DD');
            return slotDateStr === dateStr && 
                   a.bookingId?.toString() === booking.id.toString();
          });
          
          if (slot) {
            slot.status = desiredStatus;
            slot.isAvailable = false;
            slot.bookingId = booking.id;
          } else {
            availability.push({
              date: dayMoment.toDate(),
              isAvailable: false,
              bookingId: booking.id,
              status: desiredStatus
            });
          }
        }
        await property.update({ availability: availability });
      }
    } catch (availabilityError) {
      console.error('Property availability güncelleme hatası:', availabilityError);
      // Availability hatası işlemi durdurmamalı, sadece logla
    }

    // E-posta gönder
    try {
      // Sequelize'de JSON alanlarına doğrudan erişim
      const guestInfoRaw = booking.get('guestInfo');
      const guestInfo = typeof guestInfoRaw === 'string' 
        ? JSON.parse(guestInfoRaw) 
        : guestInfoRaw;
      
      if (guestInfo && guestInfo.email && guestInfo.name) {
        const bookingData = booking.toJSON ? booking.toJSON() : booking;
        await emailService.sendRequestApprovedEmail(
          guestInfo.email,
          guestInfo.name,
          bookingData,
          paymentInfo
        );
      }
    } catch (emailError) {
      console.error('E-posta gönderme hatası:', emailError);
      // E-posta hatası işlemi durdurmamalı
    }

    const bookingResponse = booking.toJSON ? booking.toJSON() : booking;
    res.json(bookingResponse);
  } catch (error) {
    console.error('Onaylama hatası:', error);
    console.error('Hata detayı:', error.message);
    console.error('Hata stack:', error.stack);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reject/Cancel booking request
router.post('/bookings/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: User, as: 'guest', attributes: ['name', 'email'] }]
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    const updateData = { status: 'cancelled' };
    if (req.body.adminNotes) {
      updateData.adminNotes = req.body.adminNotes;
    }
    await booking.update(updateData);
    
    // Booking'i yeniden yükle (güncellenmiş veriler için)
    await booking.reload();

    // Property müsaitliğini geri aç
    try {
      const property = await Property.findByPk(booking.propertyId);
      if (property) {
        const propertyData = property.toJSON ? property.toJSON() : property;
        const availability = Array.isArray(propertyData.availability) ? [...propertyData.availability] : [];
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        
        for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
          const dayMoment = moment.utc(d);
          const dateStr = dayMoment.format('YYYY-MM-DD');
          const slot = availability.find(a => {
            if (!a || !a.date) return false;
            const slotDateStr = moment.utc(a.date).format('YYYY-MM-DD');
            return slotDateStr === dateStr && 
                   a.bookingId?.toString() === booking.id.toString();
          });
          
          if (slot) {
            slot.isAvailable = true;
            slot.bookingId = null;
            slot.status = 'available';
          }
        }
        await property.update({ availability: availability });
      }
    } catch (availabilityError) {
      console.error('Property availability güncelleme hatası:', availabilityError);
      // Availability hatası işlemi durdurmamalı, sadece logla
    }

    // E-posta gönder
    try {
      // Sequelize'de JSON alanlarına doğrudan erişim
      const guestInfoRaw = booking.get('guestInfo');
      const guestInfo = typeof guestInfoRaw === 'string' 
        ? JSON.parse(guestInfoRaw) 
        : guestInfoRaw;
      
      if (guestInfo && guestInfo.email && guestInfo.name) {
        const bookingData = booking.toJSON ? booking.toJSON() : booking;
        await emailService.sendRequestCancelledEmail(
          guestInfo.email,
          guestInfo.name,
          bookingData,
          reason
        );
      }
    } catch (emailError) {
      console.error('E-posta gönderme hatası:', emailError);
      // E-posta hatası işlemi durdurmamalı
    }

    const bookingResponse = booking.toJSON ? booking.toJSON() : booking;
    res.json(bookingResponse);
  } catch (error) {
    console.error('Reddetme hatası:', error);
    console.error('Hata detayı:', error.message);
    console.error('Hata stack:', error.stack);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create manual booking (admin)
router.post('/bookings/manual', [
  body('property').notEmpty().withMessage('Daire seçilmelidir'),
  body('checkIn').isISO8601().withMessage('Geçerli bir giriş tarihi giriniz'),
  body('checkOut').isISO8601().withMessage('Geçerli bir çıkış tarihi giriniz'),
  body('guestInfo.name').notEmpty().withMessage('Müşteri adı gereklidir'),
  body('guestInfo.email').isEmail().withMessage('Geçerli bir e-posta giriniz'),
  body('guestInfo.phone').notEmpty().withMessage('Telefon gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { property, checkIn, checkOut, guests, guestInfo, pricing, payment } = req.body;

    // Property kontrolü
    const propertyDoc = await Property.findByPk(property);
    if (!propertyDoc) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    // Tarih kontrolü
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır' });
    }

    // Müsaitlik kontrolü
    const availability = propertyDoc.availability || [];
    const bookingDates = [];
    for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
      bookingDates.push(moment.utc(d).format('YYYY-MM-DD'));
    }

    for (const date of bookingDates) {
      const availableSlot = availability.find(a => 
        moment.utc(a.date).format('YYYY-MM-DD') === date
      );
      if (availableSlot && availableSlot.status === 'confirmed') {
        return res.status(400).json({ 
          message: `${date} tarihinde kesin rezervasyon var` 
        });
      }
    }

    // Fiyat hesaplama
    const totalDays = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const propertyData = propertyDoc.toJSON ? propertyDoc.toJSON() : propertyDoc;
    const propertyPricing = propertyData.pricing || {};
    let dailyRate = pricing?.dailyRate || propertyPricing.daily || propertyData.pricingDaily || 0;
    
    const subtotal = pricing?.subtotal || (dailyRate * totalDays);
    const serviceFee = pricing?.serviceFee || (subtotal * 0.10);
    const tax = pricing?.tax || (subtotal * 0.08);
    const total = pricing?.total || (subtotal + serviceFee + tax);

    // Guest kullanıcı varsa bul, yoksa null (misafir rezervasyon)
    let guestUser = null;
    if (guestInfo.email) {
      guestUser = await User.findOne({ where: { email: guestInfo.email } });
    }

    // Booking oluştur
    const booking = await Booking.create({
      propertyId: property,
      guestId: guestUser ? guestUser.id : null,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || { adults: 1, children: 0 },
      guestInfo,
      pricing: {
        dailyRate,
        totalDays,
        subtotal,
        serviceFee,
        tax,
        total
      },
      paymentMethod: payment?.method || 'cash',
      paymentStatus: payment?.status || 'completed',
      status: 'confirmed', // Manuel rezervasyon direkt confirmed
      requestType: 'manual',
      adminNotes: req.body.adminNotes,
      guestsAdults: guests?.adults || 1,
      guestsChildren: guests?.children || 0,
      pricingDailyRate: dailyRate,
      pricingTotalDays: totalDays,
      pricingSubtotal: subtotal,
      pricingServiceFee: serviceFee,
      pricingTax: tax,
      pricingTotal: total
    });

    // Müsaitliği "confirmed" olarak işaretle
    for (const date of bookingDates) {
      const existingSlot = availability.findIndex(a => 
        moment.utc(a.date).format('YYYY-MM-DD') === date
      );
      
      if (existingSlot >= 0) {
        availability[existingSlot].isAvailable = false;
        availability[existingSlot].bookingId = booking._id;
        availability[existingSlot].status = 'confirmed';
      } else {
        availability.push({
          date: moment.utc(date, 'YYYY-MM-DD').toDate(),
          isAvailable: false,
          bookingId: booking._id,
          status: 'confirmed'
        });
      }
    }

    await propertyDoc.update({ availability: availability });

    await booking.reload({
      include: [{ model: Property, as: 'property', attributes: ['title', 'locationCity', 'locationDistrict', 'images'] }]
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update booking admin notes
router.patch('/bookings/:id/notes', [
  body('adminNotes').notEmpty().withMessage('Not gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const booking = await Booking.findByPk(req.params.id);
    if (booking) {
      await booking.update({ adminNotes: req.body.adminNotes });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update payment status (admin only - ödeme teslimatta/ofiste yapıldığında güncellenir)
router.patch('/bookings/:id/payment', [
  body('status').isIn(['pending', 'completed']).withMessage('Geçerli bir ödeme durumu seçiniz'),
  body('method').optional().isIn(['cash', 'credit_card', 'bank_transfer']).withMessage('Geçerli bir ödeme yöntemi seçiniz')
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

    booking.payment.status = req.body.status;
    if (req.body.method) {
      booking.payment.method = req.body.method;
    }
    if (req.body.status === 'completed') {
      booking.payment.paidAt = new Date();
    }

    await booking.save();
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get all properties
router.get('/properties', async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [{ model: User, as: 'owner', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Seed random properties (admin)
router.post('/properties/seed', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body?.count, 10) || 10, 30);
    // Eğer kullanıcı giriş yapmışsa onun ID'sini kullan, yoksa varsayılan admin ID'sini kullan
    let ownerId = req.user?.id;
    if (!ownerId) {
      // Varsayılan admin kullanıcısını bul veya oluştur
      const defaultAdmin = await User.findOne({ where: { email: 'admin' } });
      ownerId = defaultAdmin ? defaultAdmin.id : 1;
    }
    const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const districts = ['Konyaaltı','Muratpaşa','Kepez','Lara','Döşemealtı'];
    const types = ['1+0','1+1','2+1','3+1','4+1'];
    const listingTypes = ['rent_daily','rent_monthly','sale'];
    const sampleImages = [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200',
      'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?w=1200',
      'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?w=1200',
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200',
      'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
      'https://images.unsplash.com/photo-1527030280862-64139fba04ca?w=1200',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200',
      'https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?w=1200'
    ];
    const mkImg = (url) => ({ url });

    const docs = Array.from({ length: count }).map((_, i) => {
      const pType = rnd(types);
      const lType = rnd(listingTypes);
      const daily = lType === 'rent_daily' ? (600 + Math.floor(Math.random() * 3500)) : 0;
      const weekly = lType === 'rent_daily' ? daily * 7 - 1000 : 0;
      const monthly = lType === 'rent_monthly' ? (12000 + Math.floor(Math.random() * 20000)) : 0;
      const isFeatured = Math.random() < 0.5; // %50 popüler
      return {
        title: `${pType} – ${rnd(districts)}`,
        description: 'Otomatik oluşturulmuş örnek daire.',
        location: { city: 'Antalya', district: rnd(districts) },
        propertyType: pType,
        listingType: lType,
        isFeatured,
        ownerVerified: Math.random() < 0.7,
        size: 60 + Math.floor(Math.random()*180),
        bedrooms: Number(pType.split('+')[0]) || 1,
        bathrooms: Math.random() < 0.5 ? 1 : 2,
        amenities: ['WiFi','Klima','TV'].slice(0, 1 + Math.floor(Math.random()*3)),
        images: [mkImg(rnd(sampleImages)), mkImg(rnd(sampleImages))],
        pricing: { daily, weekly, monthly },
        ownerId: ownerId,
        isActive: true
      };
    });

    const inserted = await Property.bulkCreate(docs);
    res.json({ message: `${inserted.length} daire oluşturuldu`, created: inserted.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Geçersiz rol' });
    }

    const user = await User.findByPk(req.params.id);
    if (user) {
      await user.update({ role });
    }

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update admin own credentials (require current password for security)
router.patch('/me/credentials', [
  body('email').optional().isString(),
  body('password').optional().isLength({ min: 6 }),
  body('currentPassword').notEmpty().withMessage('Mevcut şifre gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, currentPassword } = req.body;

    if (!email && !password) {
      return res.status(400).json({ message: 'Güncellenecek alan yok' });
    }

    // Load full user with password for verification
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'password', 'role', 'superAdmin']
    });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mevcut şifre hatalı' });
    }

    // If email (username) is changing, ensure uniqueness
    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) {
        return res.status(400).json({ message: 'Bu kullanıcı adı/e-posta zaten kullanımda' });
      }
      user.email = email;
    }

    if (password) {
      user.password = password; // will be hashed by pre-save hook
    }

    await user.save();
    res.json({ message: 'Bilgiler güncellendi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/admin-users', superAdmin, async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'name', 'email', 'role', 'superAdmin', 'createdAt', 'updatedAt']
    });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.patch('/admin-users/:id', superAdmin, [
  body('name').optional().isString().trim().isLength({ min: 2 }).withMessage('İsim en az 2 karakter olmalıdır'),
  body('email').optional().isString().trim().isLength({ min: 3 }).withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),
  body('password').optional().isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    if (!name && !email && !password) {
      return res.status(400).json({ message: 'Güncellenecek bir alan seçmediniz' });
    }

    const adminUser = await User.findByPk(req.params.id);
    if (!adminUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Başka bir ana yöneticiyi güncelleme izni verme
    if (adminUser.superAdmin && adminUser.id !== req.user.id) {
      return res.status(403).json({ message: 'Ana yönetici sadece kendi bilgilerini güncelleyebilir' });
    }

    if (typeof name === 'string' && name.trim()) {
      adminUser.name = name.trim();
    }

    if (typeof email === 'string' && email.trim() && email.trim() !== adminUser.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing && existing.id !== adminUser.id) {
        return res.status(400).json({ message: 'Bu kullanıcı adı/e-posta zaten kullanımda' });
      }
      adminUser.email = normalizedEmail;
    }

    if (typeof password === 'string' && password) {
      adminUser.password = password;
    }

    await adminUser.save();

    res.json({
      message: 'Kullanıcı bilgileri güncellendi',
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        superAdmin: adminUser.superAdmin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Settings get/update
router.get('/settings', async (req, res) => {
  const s = await Settings.findOne();
  res.json(s || { maintenanceMode: false });
});

router.patch('/settings', async (req, res) => {
  const { maintenanceMode, maintenanceMessage, commissionRate, defaultSeo, contactEmail, contactPhone, contactAddress, openingHours, mapEmbedUrl, instagramUrl, footerNotice, footerYear, visionText, missionText, statsHappyGuests, statsAvgRating, statsSupport, siteTitle, siteIcon, siteLogoWidth, siteLogoHeight, extraAdultPrice, extraChildPrice, includedAdultsCount, includedChildrenCount } = req.body;
  let s = await Settings.findOne();
  if (!s) s = new Settings();
  if (typeof maintenanceMode === 'boolean') s.maintenanceMode = maintenanceMode;
  if (typeof maintenanceMessage === 'string') s.maintenanceMessage = maintenanceMessage;
  if (typeof commissionRate === 'number') s.commissionRate = commissionRate;
  if (defaultSeo && typeof defaultSeo.title === 'string') s.defaultSeo.title = defaultSeo.title;
  if (defaultSeo && typeof defaultSeo.description === 'string') s.defaultSeo.description = defaultSeo.description;
  if (typeof contactEmail === 'string') s.contactEmail = contactEmail;
  if (typeof contactPhone === 'string') s.contactPhone = contactPhone;
  if (typeof contactAddress === 'string') s.contactAddress = contactAddress;
  if (typeof openingHours === 'string') s.openingHours = openingHours;
  if (typeof mapEmbedUrl === 'string') {
    let value = mapEmbedUrl.trim();
    // Eğer iframe kodu yapıştırıldıysa src'yi çıkar
    if (/^<iframe/i.test(value)) {
      const m = value.match(/src\s*=\s*"([^"]+)"/i);
      if (m && m[1]) value = m[1];
    }
    s.mapEmbedUrl = value;
  }
  if (typeof instagramUrl === 'string') s.instagramUrl = instagramUrl;
  if (typeof footerNotice === 'string') s.footerNotice = footerNotice;
  if (footerYear !== undefined) {
    const parsedYear = Number(footerYear);
    if (Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 9999) {
      s.footerYear = parsedYear;
    }
  }
  if (typeof visionText === 'string') s.visionText = visionText;
  if (typeof missionText === 'string') s.missionText = missionText;
  if (typeof statsHappyGuests === 'string') s.statsHappyGuests = statsHappyGuests;
  if (typeof statsAvgRating === 'string') s.statsAvgRating = statsAvgRating;
  if (typeof statsSupport === 'string') s.statsSupport = statsSupport;
  if (typeof siteTitle === 'string') s.siteTitle = siteTitle;
  if (typeof siteIcon === 'string') s.siteIcon = siteIcon;
  if (siteLogoWidth !== undefined) s.siteLogoWidth = Number(siteLogoWidth) || 0;
  if (siteLogoHeight !== undefined) s.siteLogoHeight = Number(siteLogoHeight) || 0;
  if (extraAdultPrice !== undefined) s.extraAdultPrice = Number(extraAdultPrice) || 0;
  if (extraChildPrice !== undefined) s.extraChildPrice = Number(extraChildPrice) || 0;
  if (includedAdultsCount !== undefined) s.includedAdultsCount = Number(includedAdultsCount) || 0;
  if (includedChildrenCount !== undefined) s.includedChildrenCount = Number(includedChildrenCount) || 0;
  await s.save();
  res.json(s);
});

// Upload site logo and save url into settings
router.post('/brand/logo', auth, admin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Logo dosyası gerekli' });
    
    let s = await Settings.findOne();
    if (!s) s = new Settings();
    
    // Eski logo dosyasını sil
    if (s.siteLogoUrl) {
      try {
        const oldLogoPath = (s.siteLogoUrl || '').replace(/\\/g, '/');
        let rel = null;
        if (oldLogoPath.startsWith('/uploads')) {
          rel = oldLogoPath.slice(1); // 'uploads/...'
        } else if (oldLogoPath.startsWith('uploads')) {
          rel = oldLogoPath;
        }
        if (rel) {
          const filePath = path.join(__dirname, '..', rel);
          await fs.promises.unlink(filePath).catch((err) => {
            console.warn(`Eski logo silinemedi: ${filePath}`, err?.message || err);
          });
        }
      } catch (error) {
        console.warn('Eski logo silme hatası:', error?.message || error);
      }
    }
    
    // Yeni logo URL'ini kaydet
    s.siteLogoUrl = `/uploads/${req.file.filename}`;
    await s.save();
    res.json({ url: s.siteLogoUrl });
  } catch (error) {
    console.error('Logo yükleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata') });
  }
});

module.exports = router;

