const express = require('express');
const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const { auth, admin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    // Tüm image/* türlerine izin ver (jpeg, png, webp, heic, svg, gif ...)
    if (/^image\//i.test(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Sadece görsel dosyaları yüklenebilir'));
  }
});

// Get all properties (public)
router.get('/', async (req, res) => {
  try {
    const { propertyType, minPrice, maxPrice, amenities, listingType, featured, sort, bedroomsMin, sizeMin, ownerVerified } = req.query;
    const filter = { 'location.city': 'Antalya', $or: [ { isActive: true }, { isActive: { $exists: false } } ] };

    if (propertyType) filter.propertyType = propertyType;
    if (listingType) {
      // Geriye dönük uyumluluk: 'rent' -> 'rent_daily'
      filter.listingType = listingType === 'rent' ? 'rent_daily' : listingType;
    }
    if (featured === 'true') filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter['pricing.daily'] = {};
      if (minPrice) filter['pricing.daily'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.daily'].$lte = Number(maxPrice);
    }
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      filter.amenities = { $all: amenityList };
    }
    if (bedroomsMin) filter.bedrooms = { $gte: Number(bedroomsMin) };
    if (sizeMin) filter.size = { $gte: Number(sizeMin) };
    if (ownerVerified === 'true') filter.ownerVerified = true;

    let sortOpt = { createdAt: -1 };
    if (sort === 'price_asc') sortOpt = [ { pricingSort: 1 }, { listingSort: 1 } ];
    if (sort === 'price_desc') sortOpt = [ { pricingSort: -1 }, { listingSort: -1 } ];
    if (sort === 'rating_desc') sortOpt = { 'rating.average': -1 };
    if (sort === 'views_desc') sortOpt = { views: -1 };

    const aggregation = [
      { $match: filter },
      {
        $addFields: {
          pricingSort: {
            $cond: [
              { $gt: ['$pricing.daily', 0] },
              '$pricing.daily',
              {
                $cond: [
                  { $eq: ['$listingType', 'rent_monthly'] },
                  { $add: ['$pricing.daily', 1000000] },
                  {
                    $cond: [
                      { $eq: ['$listingType', 'sale'] },
                      { $add: ['$pricing.daily', 2000000] },
                      '$pricing.daily'
                    ]
                  }
                ]
              }
            ]
          },
          listingSort: {
            $switch: {
              branches: [
                { case: { $eq: ['$listingType', 'rent_daily'] }, then: 1 },
                { case: { $eq: ['$listingType', 'rent_monthly'] }, then: 2 },
                { case: { $eq: ['$listingType', 'sale'] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      }
    ];

    if (Array.isArray(sortOpt)) {
      aggregation.push({ $sort: sortOpt[0] });
      aggregation.push({ $sort: sortOpt[1] });
    } else {
      aggregation.push({ $sort: sortOpt });
    }

    aggregation.push({ $unset: ['pricingSort', 'listingSort'] });

    const properties = await Property.aggregate(aggregation);
    await Property.populate(properties, { path: 'owner', select: 'name email phone' });

    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate({
        path: 'availability.bookingId',
        model: 'Booking',
        select: 'checkIn checkOut status'
      });

    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    // basit görüntülenme sayacı
    property.views = (property.views || 0) + 1;
    await property.save();

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Create property (admin/auth required)
router.post('/', auth, upload.array('images', 50), [
  body('title').notEmpty().withMessage('Başlık gereklidir'),
  body('description').notEmpty().withMessage('Açıklama gereklidir'),
  body('propertyType').notEmpty().withMessage('Daire tipi gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const images = req.files ? req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      caption: file.originalname
    })) : [];

    const propertyData = {
      ...req.body,
      owner: req.user._id,
      images
    };

    // Parse nested objects
    if (typeof propertyData.location === 'string') {
      propertyData.location = JSON.parse(propertyData.location);
    }
    if (typeof propertyData.pricing === 'string') {
      try { propertyData.pricing = JSON.parse(propertyData.pricing); } catch(_) { propertyData.pricing = {}; }
    }
    if (typeof propertyData.amenities === 'string') {
      propertyData.amenities = JSON.parse(propertyData.amenities);
    }

    // City default: Antalya; gelen değer varsa koru
    if (!propertyData.location) propertyData.location = {};
    propertyData.location.city = propertyData.location.city || 'Antalya';

    // Fiyat zorunluluğu: daily yoksa 0 olarak setle
    if (!propertyData.pricing) propertyData.pricing = {};
    const parsedDaily = Number(propertyData.pricing.daily);
    propertyData.pricing.daily = Number.isFinite(parsedDaily) ? parsedDaily : 0;

    const property = new Property(propertyData);
    await property.save();

    res.status(201).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Toggle featured status
router.patch('/:id/featured', auth, admin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    property.isFeatured = !!req.body.isFeatured;
    await property.save();

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update property
router.put('/:id', auth, upload.array('images', 50), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    // Owner veya admin kontrolü
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Owner alanını koru - güncellemede değişmemeli
    delete req.body.owner;

    // Mevcut görseller listesi (frontend'den existingImages olarak gelebilir)
    let updatedImages = property.images || [];
    if (typeof req.body.existingImages === 'string') {
      try { req.body.existingImages = JSON.parse(req.body.existingImages); } catch(_) {}
    }
    if (Array.isArray(req.body.existingImages)) {
      updatedImages = req.body.existingImages;
    }
    // Yeni görseller varsa ekle
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        caption: file.originalname
      }));
      updatedImages = [...updatedImages, ...newImages];
    }
    property.images = updatedImages;

    // Parse nested objects from FormData
    // Güvenlik: location.coordinates alanı farklı adlandırmalarla (dot/bracket) gelebilir; geçersizse temizle
    if (req.body['location.coordinates'] === 'undefined' || req.body['location.coordinates'] === undefined || req.body['location.coordinates'] === '' ) {
      delete req.body['location.coordinates'];
    }
    if (req.body['location[coordinates]'] === 'undefined' || req.body['location[coordinates]'] === undefined || req.body['location[coordinates]'] === '' ) {
      delete req.body['location[coordinates]'];
    }
    if (typeof req.body.location === 'string') {
      try { 
        req.body.location = JSON.parse(req.body.location); 
      } catch(_) { 
        // Parse edilemezse mevcut location'ı koru
        req.body.location = property.location || { city: 'Antalya' };
      }
    }
    if (typeof req.body.pricing === 'string') {
      try { 
        req.body.pricing = JSON.parse(req.body.pricing); 
      } catch(_) { 
        // Parse edilemezse boş obje kullan
        req.body.pricing = {}; 
      }
    }
    if (typeof req.body.amenities === 'string') {
      try { req.body.amenities = JSON.parse(req.body.amenities); } catch(_) { req.body.amenities = []; }
    }
    if (typeof req.body.rules === 'string') {
      try { req.body.rules = JSON.parse(req.body.rules); } catch(_) { req.body.rules = []; }
    }

    // Güncelleme: nested objeleri düzgün merge et
    if (req.body.location) {
      // coordinates alanını undefined/null veya 'undefined' (string) olarak set etmeyelim
      if (
        req.body.location.coordinates === undefined ||
        req.body.location.coordinates === null ||
        req.body.location.coordinates === 'undefined'
      ) {
        delete req.body.location.coordinates;
      }
      // Merge işlemi
      property.location = { ...property.location, ...req.body.location };
      // Merge sonrası da kontrol et - eğer coordinates geçersiz bir değerse kaldır
      if (
          (property.location.coordinates && typeof property.location.coordinates === 'string' && property.location.coordinates === 'undefined') ||
          (property.location.coordinates && typeof property.location.coordinates !== 'object') ||
          property.location.coordinates === undefined ||
          property.location.coordinates === null ||
          Array.isArray(property.location.coordinates)
        ) {
        delete property.location.coordinates;
      }
    }
    if (req.body.pricing) {
      property.pricing = { ...property.pricing, ...req.body.pricing };
    }
    if (req.body.amenities !== undefined) {
      property.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [];
    }
    if (req.body.rules !== undefined) {
      property.rules = Array.isArray(req.body.rules) ? req.body.rules : [];
    }

    // Diğer alanları güncelle (images zaten yukarıda işlendi)
    const fieldsToUpdate = ['title', 'description', 'propertyType', 'listingType', 'size', 'bedrooms', 'bathrooms'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
      }
    });

    // Son kontrol: location.coordinates geçersiz ise boş obje yap (Mongoose validation hatası önleme)
    if (property.location) {
      if (property.location.coordinates === undefined || 
          property.location.coordinates === null ||
          (typeof property.location.coordinates !== 'object') ||
          Array.isArray(property.location.coordinates)) {
        property.location.coordinates = {};
      } else if (property.location.coordinates && 
                 (property.location.coordinates.lat === undefined && property.location.coordinates.lng === undefined)) {
        // Eğer lat ve lng yoksa boş obje yap
        property.location.coordinates = {};
      }
    }

    await property.save();

    res.json(property);
  } catch (error) {
    console.error('Property update error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Request files:', req.files);
    res.status(500).json({ 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Delete property
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Ilgili görselleri dosya sisteminden sil
    try {
      const imgs = Array.isArray(property.images) ? property.images : [];
      await Promise.all(imgs.map((img) => {
        const raw = (img?.url || '').replace(/\\/g, '/');
        if (!raw) return Promise.resolve();
        let rel = null;
        if (raw.startsWith('/uploads')) {
          rel = raw.slice(1); // 'uploads/...'
        } else if (raw.startsWith('uploads')) {
          rel = raw;
        }
        if (!rel) return Promise.resolve();
        const filePath = path.join(__dirname, '..', rel);
        return fs.promises.unlink(filePath).catch(() => {});
      }));
    } catch (error) {
      console.warn('Görsel silme hatası:', error?.message || error);
    }

    await property.deleteOne();
    res.json({ message: 'Daire silindi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;



