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
    const { User: UserModel } = require('../models');
    const { Op } = require('sequelize');
    const sequelize = require('../config/database');
    
    const baseFilter = { 
      locationCity: 'Antalya',
      [Op.or]: [
        { isActive: true },
        { isActive: { [Op.is]: null } }
      ]
    };

    if (propertyType) baseFilter.propertyType = propertyType;
    if (listingType) {
      // Geriye dönük uyumluluk: 'rent' -> 'rent_daily'
      baseFilter.listingType = listingType === 'rent' ? 'rent_daily' : listingType;
    }
    if (featured === 'true') baseFilter.isFeatured = true;
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      baseFilter[Op.and] = amenityList.map(amenity => 
        sequelize.literal(`JSON_CONTAINS(amenities, '"${amenity}"')`)
      );
    }
    if (bedroomsMin) baseFilter.bedrooms = { [Op.gte]: Number(bedroomsMin) };
    if (sizeMin) baseFilter.size = { [Op.gte]: Number(sizeMin) };
    if (ownerVerified === 'true') baseFilter.ownerVerified = true;

    const minPriceValue = parseNumber(minPrice);
    const maxPriceValue = parseNumber(maxPrice);
    
    // Fiyat filtreleme
    if (minPriceValue !== undefined || maxPriceValue !== undefined) {
      let priceField = 'pricingDaily';
      if (listingType === 'rent_monthly') priceField = 'pricingMonthly';
      const priceFilter = {};
      if (minPriceValue !== undefined) priceFilter[Op.gte] = minPriceValue;
      if (maxPriceValue !== undefined) priceFilter[Op.lte] = maxPriceValue;
      baseFilter[priceField] = priceFilter;
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') {
      order = [
        [sequelize.literal('CASE WHEN listing_type = "rent_daily" THEN 1 WHEN listing_type = "rent_monthly" THEN 2 WHEN listing_type = "sale" THEN 3 ELSE 4 END'), 'ASC'],
        [sequelize.literal('CASE WHEN listing_type = "rent_monthly" THEN pricing_monthly WHEN listing_type = "sale" THEN pricing_daily ELSE pricing_daily END'), 'ASC']
      ];
    } else if (sort === 'price_desc') {
      order = [
        [sequelize.literal('CASE WHEN listing_type = "rent_daily" THEN 1 WHEN listing_type = "rent_monthly" THEN 2 WHEN listing_type = "sale" THEN 3 ELSE 4 END'), 'DESC'],
        [sequelize.literal('CASE WHEN listing_type = "rent_monthly" THEN pricing_monthly WHEN listing_type = "sale" THEN pricing_daily ELSE pricing_daily END'), 'DESC']
      ];
    } else if (sort === 'rating_desc') {
      order = [['ratingAverage', 'DESC']];
    } else if (sort === 'views_desc') {
      order = [['views', 'DESC']];
    }

    const properties = await Property.findAll({
      where: baseFilter,
      include: [{ model: UserModel, as: 'owner', attributes: ['name', 'email', 'phone'] }],
      order: order
    });
    
    const propertiesData = properties.map(p => p.toJSON());

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

      const cheaperFilter = { ...baseFilter };
      if (relaxedMin !== undefined) {
        cheaperFilter.pricingDaily = { [Op.gte]: relaxedMin, [Op.lte]: budget };
      } else {
        cheaperFilter.pricingDaily = { [Op.lte]: budget };
      }
      
      const aboveMin = minPriceValue !== undefined ? Math.max(minPriceValue, budget) : budget;
      const slightlyAboveFilter = { ...baseFilter };
      slightlyAboveFilter.pricingDaily = { [Op.gte]: aboveMin, [Op.lte]: budget * 1.2 };

      const nearBudgetCheaper = await Property.findAll({
        where: cheaperFilter,
        include: [{ model: UserModel, as: 'owner', attributes: ['name', 'email', 'phone'] }],
        order: [[sequelize.literal('CASE WHEN listing_type = "rent_monthly" THEN pricing_monthly WHEN listing_type = "sale" THEN pricing_daily ELSE pricing_daily END'), 'DESC']],
        limit: limits.nearBudgetLimit
      });

      const nearBudgetAbove = await Property.findAll({
        where: slightlyAboveFilter,
        include: [{ model: UserModel, as: 'owner', attributes: ['name', 'email', 'phone'] }],
        order: [[sequelize.literal('CASE WHEN listing_type = "rent_monthly" THEN pricing_monthly WHEN listing_type = "sale" THEN pricing_daily ELSE pricing_daily END'), 'ASC']],
        limit: limits.nearBudgetLimit
      });

      const cheaperData = nearBudgetCheaper.map(p => p.toJSON());
      const aboveData = nearBudgetAbove.map(p => p.toJSON());
      const nearBudgetCombined = [...cheaperData, ...aboveData].slice(0, limits.nearBudgetLimit);

      suggestions = nearBudgetCombined.length
        ? {
            message: 'Filtrenize en yakın daireleri sizin için bulduk.',
            nearBudget: nearBudgetCombined
          }
        : null;
    }

    res.json({
      results: propertiesData,
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
    const { User: UserModel } = require('../models');
    const property = await Property.findByPk(req.params.id, {
      include: [
        { model: UserModel, as: 'owner', attributes: ['name', 'email', 'phone'] }
      ]
    });

    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    // basit görüntülenme sayacı
    const propertyData = property.toJSON();
    const views = (propertyData.views || 0) + 1;
    await property.update({ views: views });

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
      ownerId: req.user.id,
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

    // Sequelize formatına çevir
    const sequelizeData = {
      title: propertyData.title,
      description: propertyData.description,
      locationCity: propertyData.location?.city || 'Antalya',
      locationDistrict: propertyData.location?.district,
      locationNeighborhood: propertyData.location?.neighborhood,
      locationAddress: propertyData.location?.address,
      locationCoordinates: propertyData.location?.coordinates,
      propertyType: propertyData.propertyType,
      listingType: propertyData.listingType,
      isFeatured: propertyData.isFeatured || false,
      ownerVerified: propertyData.ownerVerified || false,
      size: propertyData.size,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      amenities: propertyData.amenities || [],
      images: images,
      videoUrl: propertyData.videoUrl,
      pricingDaily: propertyData.pricing?.daily || 0,
      pricingWeekly: propertyData.pricing?.weekly,
      pricingMonthly: propertyData.pricing?.monthly,
      seasonalRates: propertyData.pricing?.seasonalRates || [],
      availability: propertyData.availability || [],
      rules: propertyData.rules || [],
      nearbyAttractions: propertyData.nearbyAttractions || [],
      ownerId: propertyData.ownerId,
      isActive: propertyData.isActive !== false
    };

    const property = await Property.create(sequelizeData);

    res.status(201).json(property);
  } catch (error) {
    console.error('Property create error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    
    // Sequelize validation hatası
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const validationErrors = error.errors ? error.errors.map(err => ({
        field: err.path,
        message: err.message
      })) : [{ field: 'unknown', message: error.message }];
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
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    await property.update({ isFeatured: !!req.body.isFeatured });

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update property
router.put('/:id', auth, upload.array('images', 50), async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    const propertyData = property.toJSON();
    const normalizeImages = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      }
      return [];
    };
    const mapImageInput = (img) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, caption: '' };
      }
      if (typeof img === 'object') {
        const url = img.url || img.path || img.src || '';
        return url ? { url, caption: img.caption || '' } : null;
      }
      return null;
    };
    const extractUrls = (images = []) => images
      .map((img) => {
        if (!img) return null;
        if (typeof img === 'string') return img;
        if (typeof img === 'object') return img.url || null;
        return null;
      })
      .filter(Boolean);
    // Owner veya admin kontrolü
    if (propertyData.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Owner alanını koru - güncellemede değişmemeli
    delete req.body.owner;

    // Mevcut görseller listesi (frontend'den existingImages olarak gelebilir)
    const oldImages = normalizeImages(propertyData.images);
    let updatedImages = [...oldImages];
    if (typeof req.body.existingImages === 'string') {
      try { req.body.existingImages = JSON.parse(req.body.existingImages); } catch(_) {}
    }
    if (Array.isArray(req.body.existingImages)) {
      const parsedExisting = req.body.existingImages
        .map(mapImageInput)
        .filter(Boolean);
      if (parsedExisting.length > 0) {
        updatedImages = parsedExisting;
      } else if (req.body.existingImages.length === 0) {
        updatedImages = [];
      }
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
    const oldImageUrls = extractUrls(oldImages);
    const newImageUrls = extractUrls(updatedImages);
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
    const location = propertyData.location || {};
    if (req.body.location) {
      if (typeof req.body.location === 'string') {
        try {
          req.body.location = JSON.parse(req.body.location);
        } catch(_) {
          req.body.location = location;
        }
      }
      Object.assign(location, req.body.location);
      if (location.coordinates === undefined || location.coordinates === null || location.coordinates === 'undefined') {
        delete location.coordinates;
      }
    }
    
    const pricing = propertyData.pricing || {};
    if (req.body.pricing) {
      if (typeof req.body.pricing === 'string') {
        try {
          req.body.pricing = JSON.parse(req.body.pricing);
        } catch(_) {
          req.body.pricing = pricing;
        }
      }
      Object.assign(pricing, req.body.pricing);
    }
    
    const amenities = req.body.amenities !== undefined ? (Array.isArray(req.body.amenities) ? req.body.amenities : []) : propertyData.amenities;
    const rules = req.body.rules !== undefined ? (Array.isArray(req.body.rules) ? req.body.rules : []) : propertyData.rules;

    // Sequelize formatına çevir
    const updateData = {
      title: req.body.title !== undefined ? req.body.title : propertyData.title,
      description: req.body.description !== undefined ? req.body.description : propertyData.description,
      locationCity: location.city || 'Antalya',
      locationDistrict: location.district,
      locationNeighborhood: location.neighborhood,
      locationAddress: location.address,
      locationCoordinates: location.coordinates,
      propertyType: req.body.propertyType !== undefined ? req.body.propertyType : propertyData.propertyType,
      listingType: req.body.listingType !== undefined ? req.body.listingType : propertyData.listingType,
      size: req.body.size !== undefined ? Number(req.body.size) : propertyData.size,
      bedrooms: req.body.bedrooms !== undefined ? Number(req.body.bedrooms) : propertyData.bedrooms,
      bathrooms: req.body.bathrooms !== undefined ? Number(req.body.bathrooms) : propertyData.bathrooms,
      amenities: amenities,
      images: updatedImages,
      pricingDaily: pricing.daily || 0,
      pricingWeekly: pricing.weekly,
      pricingMonthly: pricing.monthly,
      seasonalRates: pricing.seasonalRates || [],
      rules: rules
    };

    await property.update(updateData);

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
    const property = await Property.findByPk(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Daire bulunamadı' });
    }

    const propertyData = property.toJSON();
    if (propertyData.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Ilgili görselleri dosya sisteminden sil
    try {
      const imgs = Array.isArray(propertyData.images) ? propertyData.images : [];
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

    await property.destroy();
    res.json({ message: 'Daire silindi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;



