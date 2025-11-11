const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch(_) {}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/search', require('./routes/search'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/contact', require('./routes/contact'));

// Public settings (for maintenance mode)
app.get('/api/public/settings', async (req, res) => {
  try {
    const Settings = require('./models/Settings');
    const s = await Settings.findOne().lean();
    res.json({
      maintenanceMode: !!s?.maintenanceMode,
      maintenanceMessage: s?.maintenanceMessage || 'Sitemiz şu anda bakımda. Lütfen daha sonra tekrar deneyiniz.',
      contactEmail: s?.contactEmail || 'info@example.com',
      contactPhone: s?.contactPhone || '+90 555 555 55 55',
      contactAddress: s?.contactAddress || 'Atatürk Cad. No:123, Muratpaşa, Antalya',
      openingHours: s?.openingHours || 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)',
      mapEmbedUrl: s?.mapEmbedUrl || '',
      instagramUrl: s?.instagramUrl || '',
      visionText: s?.visionText || '',
      missionText: s?.missionText || '',
      statsHappyGuests: s?.statsHappyGuests || '999+',
      statsAvgRating: s?.statsAvgRating || '4.8',
      statsSupport: s?.statsSupport || '7/24',
      siteTitle: s?.siteTitle || 'Günlük Kiralık Evim',
      siteIcon: s?.siteIcon || 'FaHome',
      siteLogoUrl: s?.siteLogoUrl || '',
      siteLogoWidth: s?.siteLogoWidth || 0,
      siteLogoHeight: s?.siteLogoHeight || 24,
      extraAdultPrice: typeof s?.extraAdultPrice === 'number' ? s.extraAdultPrice : 150,
      extraChildPrice: typeof s?.extraChildPrice === 'number' ? s.extraChildPrice : 75,
      includedAdultsCount: typeof s?.includedAdultsCount === 'number' ? s.includedAdultsCount : 2,
      includedChildrenCount: typeof s?.includedChildrenCount === 'number' ? s.includedChildrenCount : 1
    });
  } catch (e) {
    res.json({ maintenanceMode: false, maintenanceMessage: '', contactEmail: 'info@example.com', contactPhone: '+90 555 555 55 55', contactAddress: 'Atatürk Cad. No:123, Muratpaşa, Antalya', openingHours: 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)', mapEmbedUrl: '', instagramUrl: '', visionText: '', missionText: '', statsHappyGuests: '999+', statsAvgRating: '4.8', statsSupport: '7/24', siteTitle: 'Günlük Kiralık Evim', siteIcon: 'FaHome', siteLogoUrl: '', siteLogoWidth: 0, siteLogoHeight: 24, extraAdultPrice: 150, extraChildPrice: 75, includedAdultsCount: 2, includedChildrenCount: 1 });
  }
});

// robots.txt ve sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /
Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`
  );
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const Property = require('./models/Property');
    const base = `${req.protocol}://${req.get('host')}`;
    const urls = [
      `${base}/`,
      `${base}/properties`,
      `${base}/contact`
    ];
    const items = await Property.find({ isActive: { $ne: false } }).select('_id updatedAt').limit(5000);
    items.forEach(p => urls.push(`${base}/properties/${p._id}`));
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(u => `<url><loc>${u}</loc></url>`),
      '</urlset>'
    ].join('');
    res.type('application/xml').send(xml);
  } catch (e) {
    res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

const User = require('./models/User');
const Booking = require('./models/Booking');
const Property = require('./models/Property');
const moment = require('moment');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB bağlantısı başarılı');
  
  // Admin kullanıcısı yoksa oluştur
  try {
    const existingAdmin = await User.findOne({ email: 'admin' });
    
    if (!existingAdmin) {
      const adminUser = new User({
        name: 'Admin',
        email: 'admin',
        password: '123456',
        role: 'admin',
        superAdmin: true
      });
      await adminUser.save();
      console.log('Süper admin kullanıcısı oluşturuldu (kullanıcı adı: admin, şifre: 123456)');
    } else {
      let updated = false;
      if (!existingAdmin.superAdmin) {
        existingAdmin.superAdmin = true;
        updated = true;
      }
      const isMatch = await existingAdmin.comparePassword('123456');
      if (!isMatch) {
        existingAdmin.password = '123456';
        updated = true;
      }
      if (updated) {
        await existingAdmin.save();
        console.log('Süper admin hesabı güncellendi (kullanıcı adı: admin)');
      }
    }

    const secondaryAdmin = await User.findOne({ email: 'mukaddes' });
    if (!secondaryAdmin) {
      const newAdmin = new User({
        name: 'Mukaddes',
        email: 'mukaddes',
        password: '123456',
        role: 'admin',
        superAdmin: false
      });
      await newAdmin.save();
      console.log('İkincil admin kullanıcısı oluşturuldu (kullanıcı adı: mukaddes, şifre: 123456)');
    } else {
      let secondaryUpdated = false;
      if (secondaryAdmin.role !== 'admin') {
        secondaryAdmin.role = 'admin';
        secondaryUpdated = true;
      }
      if (secondaryAdmin.superAdmin) {
        secondaryAdmin.superAdmin = false;
        secondaryUpdated = true;
      }
      if (secondaryAdmin.name !== 'Mukaddes') {
        secondaryAdmin.name = 'Mukaddes';
        secondaryUpdated = true;
      }
      const matches = await secondaryAdmin.comparePassword('123456');
      if (!matches) {
        secondaryAdmin.password = '123456';
        secondaryUpdated = true;
      }
      if (secondaryUpdated) {
        await secondaryAdmin.save();
        console.log('İkincil admin hesabı güncellendi (kullanıcı adı: mukaddes)');
      }
    }
  } catch (error) {
    console.error('Admin kullanıcılarını oluşturma/güncelleme hatası:', error);
  }

  // Otomatik örnek daire oluşturma kaldırıldı

  // Eski tamamlanmış rezervasyonları temizle (günlük)
  try {
    const cleanOldCompleted = async () => {
      const cutoff = moment().subtract(14, 'days').toDate();
      const result = await Booking.deleteMany({ status: 'completed', checkOut: { $lte: cutoff } });
      if (result.deletedCount) {
        console.log(`Temizlik: ${result.deletedCount} tamamlanmış rezervasyon silindi`);
      }
    };
    // İlk çalıştırma ve sonra her 24 saatte bir
    cleanOldCompleted();
    setInterval(cleanOldCompleted, 24 * 60 * 60 * 1000);
  } catch (cleanupError) {
    console.error('Temizlik zamanlayıcı hatası:', cleanupError);
  }
})
.catch((err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server çalışıyor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

