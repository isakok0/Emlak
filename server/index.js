const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { sequelize, User, Booking, Property } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
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

const parseNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

// Public settings (for maintenance mode)
app.get('/api/public/settings', async (req, res) => {
  try {
    const Settings = require('./models/Settings');
    const s = await Settings.findOne();
    res.json({
      maintenanceMode: !!s?.maintenanceMode,
      maintenanceMessage: s?.maintenanceMessage || 'Sitemiz şu anda bakımda. Lütfen daha sonra tekrar deneyiniz.',
      contactEmail: s?.contactEmail || 'info@example.com',
      contactPhone: s?.contactPhone || '+90 555 555 55 55',
      contactAddress: s?.contactAddress || 'Atatürk Cad. No:123, Muratpaşa, Antalya',
      openingHours: s?.openingHours || 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)',
      mapEmbedUrl: s?.mapEmbedUrl || '',
      instagramUrl: s?.instagramUrl || '',
      footerNotice: s?.footerNotice || 'Tüm hakları saklıdır.',
      footerYear: typeof s?.footerYear === 'number' ? s.footerYear : new Date().getFullYear(),
      visionText: s?.visionText || '',
      missionText: s?.missionText || '',
      statsHappyGuests: s?.statsHappyGuests || '999+',
      statsAvgRating: s?.statsAvgRating || '4.8',
      statsSupport: s?.statsSupport || '7/24',
      siteTitle: s?.siteTitle || 'Günlük Kiralık Evim',
      siteIcon: s?.siteIcon || 'FaHome',
      siteLogoUrl: s?.siteLogoUrl || '',
      siteLogoWidth: parseNumber(s?.siteLogoWidth, 0),
      siteLogoHeight: parseNumber(s?.siteLogoHeight, 24),
      extraAdultPrice: parseNumber(s?.extraAdultPrice, 150),
      extraChildPrice: parseNumber(s?.extraChildPrice, 75),
      includedAdultsCount: parseNumber(s?.includedAdultsCount, 2),
      includedChildrenCount: parseNumber(s?.includedChildrenCount, 1)
    });
  } catch (e) {
    res.json({ maintenanceMode: false, maintenanceMessage: '', contactEmail: 'info@example.com', contactPhone: '+90 555 555 55 55', contactAddress: 'Atatürk Cad. No:123, Muratpaşa, Antalya', openingHours: 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)', mapEmbedUrl: '', instagramUrl: '', footerNotice: 'Tüm hakları saklıdır.', footerYear: new Date().getFullYear(), visionText: '', missionText: '', statsHappyGuests: '999+', statsAvgRating: '4.8', statsSupport: '7/24', siteTitle: 'Günlük Kiralık Evim', siteIcon: 'FaHome', siteLogoUrl: '', siteLogoWidth: 0, siteLogoHeight: 24, extraAdultPrice: 150, extraChildPrice: 75, includedAdultsCount: 2, includedChildrenCount: 1 });
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
    const { Op } = require('sequelize');
    const items = await Property.findAll({ 
      where: { isActive: { [Op.ne]: false } },
      attributes: ['id', 'updatedAt'],
      limit: 5000
    });
    items.forEach(p => urls.push(`${base}/properties/${p.id}`));
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

// MySQL/Sequelize connection
const moment = require('moment');

// Sync database and create tables
sequelize.authenticate()
  .then(async () => {
    console.log('MySQL bağlantısı başarılı');
    
    // Sync all models (create tables if they don't exist)
    // Development için alter: true kullan (tabloları günceller)
    // Production için alter: false kullan (sadece yeni tablolar oluşturur)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' }); 
    console.log('Veritabanı tabloları hazır');
    
    // Admin kullanıcısı yoksa oluştur
    try {
      const existingAdmin = await User.findOne({ where: { email: 'admin' } });
      
      if (!existingAdmin) {
        const adminUser = await User.create({
          name: 'Admin',
          email: 'admin',
          password: '123456',
          role: 'admin',
          superAdmin: true
        });
        console.log('Süper admin kullanıcısı oluşturuldu (kullanıcı adı: admin, şifre: 123456)');
      } else {
        let updated = false;
        if (!existingAdmin.superAdmin) {
          existingAdmin.superAdmin = true;
          updated = true;
        }
        const isMatch = await existingAdmin.comparePassword('123456');
        if (!isMatch) {
          await existingAdmin.setPassword('123456');
          updated = true;
        }
        if (updated) {
          await existingAdmin.save();
          console.log('Süper admin hesabı güncellendi (kullanıcı adı: admin)');
        }
      }

      const secondaryAdmin = await User.findOne({ where: { email: 'mukaddes' } });
      if (!secondaryAdmin) {
        await User.create({
          name: 'Mukaddes',
          email: 'mukaddes',
          password: '123456',
          role: 'admin',
          superAdmin: false
        });
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
          await secondaryAdmin.setPassword('123456');
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

    // Eski tamamlanmış rezervasyonları temizle (günlük)
    try {
      const cleanOldCompleted = async () => {
        const cutoff = moment().subtract(14, 'days').toDate();
        const result = await Booking.destroy({ 
          where: { 
            status: 'completed',
            checkOut: { [sequelize.Sequelize.Op.lte]: cutoff }
          }
        });
        if (result) {
          console.log(`Temizlik: ${result} tamamlanmış rezervasyon silindi`);
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
    console.error('MySQL bağlantı hatası:', err);
  });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server çalışıyor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

