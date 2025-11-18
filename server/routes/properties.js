const express = require('express');
const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const { auth, admin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const parseNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const effectivePriceExpr = {
  $switch: {
    branches: [
      { case: { $eq: ['$listingType', 'rent_monthly'] }, then: { $ifNull: ['$pricing.monthly', 0] } },
      { case: { $eq: ['$listingType', 'sale'] }, then: { $ifNull: ['$pricing.daily', 0] } },
      { case: { $eq: ['$listingType', 'rent'] }, then: { $ifNull: ['$pricing.daily', 0] } }
    ],
    default: { $ifNull: ['$pricing.daily', 0] }
  }
};

const buildPriceExpr = ({ min, max, exclusiveMin = false, exclusiveMax = false }) => {
  const clauses = [];
  if (min !== undefined) {
    const op = exclusiveMin ? '$gt' : '$gte';
    clauses.push({ [op]: [effectivePriceExpr, min] });
  }
  if (max !== undefined) {
    const op = exclusiveMax ? '$lt' : '$lte';
    clauses.push({ [op]: [effectivePriceExpr, max] });
  }
  if (!clauses.length) return null;
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
};

const applyPriceExpr = (filter, options = {}) => {
  const expr = buildPriceExpr(options);
  if (!expr) return filter;
  if (filter.$expr) {
    filter.$expr = { $and: [filter.$expr, expr] };
  } else {
    filter.$expr = expr;
  }
  return filter;
};

const buildAggregationPipeline = ({ matchFilter, sortStages, limit }) => {
  const pipeline = [
    { $match: matchFilter },
    {
      $addFields: {
        pricingSort: effectivePriceExpr,
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

  sortStages
    .filter(Boolean)
    .forEach(stage => pipeline.push({ $sort: stage }));

  if (limit) {
    pipeline.push({ $limit: limit });
  }

  pipeline.push({ $unset: ['pricingSort', 'listingSort'] });

  return pipeline;
};

const aggregateAndPopulate = async ({ matchFilter, sortStages, limit }) => {
  const pipeline = buildAggregationPipeline({ matchFilter, sortStages, limit });
  const docs = await Property.aggregate(pipeline);
  await Property.populate(docs, { path: 'owner', select: 'name email phone' });
  return docs;
};

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
    const baseFilter = { 'location.city': 'Antalya', $or: [ { isActive: true }, { isActive: { $exists: false } } ] };

    if (propertyType) baseFilter.propertyType = propertyType;
    if (listingType) {
      // Geriye dönük uyumluluk: 'rent' -> 'rent_daily'
      baseFilter.listingType = listingType === 'rent' ? 'rent_daily' : listingType;
    }
    if (featured === 'true') baseFilter.isFeatured = true;
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      baseFilter.amenities = { $all: amenityList };
    }
    if (bedroomsMin) baseFilter.bedrooms = { $gte: Number(bedroomsMin) };
    if (sizeMin) baseFilter.size = { $gte: Number(sizeMin) };
    if (ownerVerified === 'true') baseFilter.ownerVerified = true;

    const minPriceValue = parseNumber(minPrice);
    const maxPriceValue = parseNumber(maxPrice);
    const filter = applyPriceExpr({ ...baseFilter }, { min: minPriceValue, max: maxPriceValue });

    let sortOpt = { createdAt: -1 };
    if (sort === 'price_asc') sortOpt = [ { pricingSort: 1 }, { listingSort: 1 } ];
    if (sort === 'price_desc') sortOpt = [ { pricingSort: -1 }, { listingSort: -1 } ];
    if (sort === 'rating_desc') sortOpt = { 'rating.average': -1 };
    if (sort === 'views_desc') sortOpt = { views: -1 };

    const sortStages = Array.isArray(sortOpt) ? sortOpt : [sortOpt];

    const properties = await aggregateAndPopulate({ matchFilter: filter, sortStages });

    let suggestions = null;

    if (properties.length === 0 && maxPriceValue !== undefined) {
      const relaxedMin = minPriceValue !== undefined
        ? Math.max(minPriceValue * 0.8, 0)
        : undefined;

      const buildFlexFilter = (priceOptions = {}) => {
        const { max, exclusiveMin, exclusiveMax } = priceOptions;
        const resolvedMin = Object.prototype.hasOwnProperty.call(priceOptions, 'min')
          ? priceOptions.min
          : minPriceValue;

        return applyPriceExpr({ ...baseFilter }, {
          min: resolvedMin,
          max,
          exclusiveMin,
          exclusiveMax
        });
      };

      const budget = maxPriceValue;
      const limits = {
        nearBudgetLimit: 6
      };

      const cheaperQuery = relaxedMin !== undefined
        ? buildFlexFilter({ min: relaxedMin, max: budget })
        : buildFlexFilter({ max: budget });
      const aboveMin = minPriceValue !== undefined ? Math.max(minPriceValue, budget) : budget;
      const aboveExclusiveMin = minPriceValue === undefined || aboveMin === budget;

      const slightlyAboveQuery = buildFlexFilter({
        min: aboveMin,
        max: budget * 1.2,
        exclusiveMin: aboveExclusiveMin
      });

      const nearBudgetCheaper = await aggregateAndPopulate({
        matchFilter: cheaperQuery,
        sortStages: [ { pricingSort: -1 } ],
        limit: limits.nearBudgetLimit
      });

      const nearBudgetAbove = await aggregateAndPopulate({
        matchFilter: slightlyAboveQuery,
        sortStages: [ { pricingSort: 1 } ],
        limit: limits.nearBudgetLimit
      });

      const nearBudgetCombined = [...nearBudgetCheaper, ...nearBudgetAbove].slice(0, limits.nearBudgetLimit);

      suggestions = nearBudgetCombined.length
        ? {
            message: 'Filtrenize en yakın daireleri sizin için bulduk.',
            nearBudget: nearBudgetCombined
          }
        : null;
    }

    res.json({
      results: properties,
      suggestions
    });
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
      try {
        propertyData.location = JSON.parse(propertyData.location);
      } catch (e) {
        propertyData.location = { city: 'Antalya' };
      }
    }
    if (typeof propertyData.pricing === 'string') {
      try { 
        propertyData.pricing = JSON.parse(propertyData.pricing); 
      } catch(_) { 
        propertyData.pricing = {}; 
      }
    }
    if (typeof propertyData.amenities === 'string') {
      try {
        propertyData.amenities = JSON.parse(propertyData.amenities);
      } catch(_) {
        propertyData.amenities = [];
      }
    }
    if (typeof propertyData.rules === 'string') {
      try {
        propertyData.rules = JSON.parse(propertyData.rules);
      } catch(_) {
        propertyData.rules = [];
      }
    }

    // City default: Antalya; gelen değer varsa koru
    if (!propertyData.location) propertyData.location = {};
    propertyData.location.city = propertyData.location.city || 'Antalya';

    // Coordinates temizleme - geçersiz değerleri kaldır
    if (propertyData.location) {
      if (
        propertyData.location.coordinates === undefined ||
        propertyData.location.coordinates === null ||
        propertyData.location.coordinates === 'undefined' ||
        (typeof propertyData.location.coordinates !== 'object') ||
        Array.isArray(propertyData.location.coordinates)
      ) {
        delete propertyData.location.coordinates;
      } else if (
        propertyData.location.coordinates &&
        propertyData.location.coordinates.lat === undefined &&
        propertyData.location.coordinates.lng === undefined
      ) {
        delete propertyData.location.coordinates;
      }
    }

    // Fiyat zorunluluğu: daily yoksa 0 olarak setle
    if (!propertyData.pricing) propertyData.pricing = {};
    const parsedDaily = Number(propertyData.pricing.daily);
    propertyData.pricing.daily = Number.isFinite(parsedDaily) ? parsedDaily : 0;

    // Required alanları kontrol et ve sayıya çevir
    if (propertyData.size === undefined || propertyData.size === null || propertyData.size === '') {
      propertyData.size = 0;
    } else {
      propertyData.size = Number(propertyData.size) || 0;
    }
    if (propertyData.bedrooms === undefined || propertyData.bedrooms === null || propertyData.bedrooms === '') {
      propertyData.bedrooms = 1;
    } else {
      propertyData.bedrooms = Number(propertyData.bedrooms) || 1;
    }
    if (propertyData.bathrooms === undefined || propertyData.bathrooms === null || propertyData.bathrooms === '') {
      propertyData.bathrooms = 1;
    } else {
      propertyData.bathrooms = Number(propertyData.bathrooms) || 1;
    }

    // ListingType default
    if (!propertyData.listingType) {
      propertyData.listingType = 'rent_daily';
    }

    const property = new Property(propertyData);
    await property.save();

    res.status(201).json(property);
  } catch (error) {
    console.error('Property create error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    
    // Mongoose validation hatası
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        message: 'Validasyon hatası',
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
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
    const oldImages = property.images || [];
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
    
    // Silinen görselleri bul ve uploads klasöründen sil
    const oldImageUrls = oldImages.map(img => img.url).filter(Boolean);
    const newImageUrls = updatedImages.map(img => img.url).filter(Boolean);
    const deletedImageUrls = oldImageUrls.filter(url => !newImageUrls.includes(url));
    
    if (deletedImageUrls.length > 0) {
      try {
        await Promise.all(deletedImageUrls.map((imgUrl) => {
          const raw = (imgUrl || '').replace(/\\/g, '/');
          if (!raw) return Promise.resolve();
          let rel = null;
          if (raw.startsWith('/uploads')) {
            rel = raw.slice(1); // 'uploads/...'
          } else if (raw.startsWith('uploads')) {
            rel = raw;
          }
          if (!rel) return Promise.resolve();
          const filePath = path.join(__dirname, '..', rel);
          return fs.promises.unlink(filePath).catch((err) => {
            console.warn(`Görsel silinemedi: ${filePath}`, err?.message || err);
          });
        }));
      } catch (error) {
        console.warn('Görsel silme hatası:', error?.message || error);
      }
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



