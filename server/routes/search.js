const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const moment = require('moment');
const { Op } = require('sequelize');

const router = express.Router();

const getBaseFilter = ({ propertyType, amenityList, minRating }) => {
  const baseFilter = { 
    isActive: true, 
    locationCity: 'Antalya' 
  };

  if (propertyType) baseFilter.propertyType = propertyType;
  if (minRating !== undefined) baseFilter.ratingAverage = { [Op.gte]: minRating };

  return baseFilter;
};

const filterByAvailability = ({ properties, checkIn, checkOut }) => {
  if (!checkIn || !checkOut) return properties;

  const checkInDate = moment(checkIn);
  const checkOutDate = moment(checkOut);
  const requiredDates = [];

  for (let d = moment(checkInDate); d.isBefore(checkOutDate); d.add(1, 'days')) {
    requiredDates.push(d.format('YYYY-MM-DD'));
  }

  return properties.filter(property => {
    const availability = property.availability || [];

    return requiredDates.every(date => {
      const slot = availability.find(a =>
        moment(a.date).format('YYYY-MM-DD') === date
      );
      return !slot || slot.isAvailable;
    });
  });
};

const parseNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Fiyat filtreleme için helper fonksiyon
const applyPriceFilter = (whereClause, { min, max }, listingType) => {
  // Listing type'a göre fiyat alanını belirle
  let priceField = 'pricingDaily';
  if (listingType === 'rent_monthly') {
    priceField = 'pricingMonthly';
  } else if (listingType === 'sale') {
    priceField = 'pricingDaily';
  }
  
  if (min !== undefined || max !== undefined) {
    const priceFilter = {};
    if (min !== undefined) priceFilter[Op.gte] = min;
    if (max !== undefined) priceFilter[Op.lte] = max;
    whereClause[priceField] = priceFilter;
  }
  
  return whereClause;
};

// Advanced search
router.get('/', async (req, res) => {
  try {
    const {
      city,
      district,
      checkIn,
      checkOut,
      propertyType,
      minPrice,
      maxPrice,
      amenities,
      minRating
    } = req.query;

    const minPriceValue = parseNumber(minPrice);
    const maxPriceValue = parseNumber(maxPrice);
    const minRatingValue = parseNumber(minRating);
    const amenityList = amenities
      ? Array.isArray(amenities)
        ? amenities
        : amenities.split(',').map(item => item.trim()).filter(Boolean)
      : null;

    const baseFilter = getBaseFilter({ propertyType, amenityList, minRating: minRatingValue });
    
    // Amenities filtresi için JSON içinde arama
    if (amenityList?.length) {
      // MySQL JSON içinde arama için Sequelize.literal kullan
      const { sequelize } = require('../config/database');
      baseFilter[Op.and] = amenityList.map(amenity => 
        sequelize.literal(`JSON_CONTAINS(amenities, '"${amenity}"')`)
      );
    }
    
    applyPriceFilter(baseFilter, { min: minPriceValue, max: maxPriceValue }, listingType);

    let properties = await Property.findAll({
      where: baseFilter,
      include: [
        { model: User, as: 'owner', attributes: ['name', 'email', 'phone'] }
      ]
    });

    // Sequelize sonuçlarını JSON'a çevir
    properties = properties.map(p => p.toJSON());
    properties = filterByAvailability({ properties, checkIn, checkOut });

    let suggestions = null;

    if (properties.length === 0 && maxPriceValue !== undefined) {
      const relaxedMin = minPriceValue !== undefined
        ? Math.max(minPriceValue * 0.8, 0)
        : undefined;

      const buildFlexFilter = (priceOptions = {}) => {
        const flexFilter = getBaseFilter({ propertyType, amenityList, minRating: minRatingValue });
        const { max, exclusiveMin, exclusiveMax } = priceOptions;
        const resolvedMin = Object.prototype.hasOwnProperty.call(priceOptions, 'min')
          ? priceOptions.min
          : minPriceValue;

        return applyPriceExpr(flexFilter, {
          min: resolvedMin,
          max,
          exclusiveMin,
          exclusiveMax
        });
      };

      const budget = maxPriceValue;
      const suggestionLimits = {
        nearBudgetLimit: 6
      };

      const cheaperFilter = getBaseFilter({ propertyType, amenityList, minRating: minRatingValue });
      applyPriceFilter(cheaperFilter, { 
        min: relaxedMin, 
        max: budget 
      }, listingType);

      const aboveMin = minPriceValue !== undefined ? Math.max(minPriceValue, budget) : budget;
      const slightlyAboveFilter = getBaseFilter({ propertyType, amenityList, minRating: minRatingValue });
      applyPriceFilter(slightlyAboveFilter, {
        min: aboveMin,
        max: budget * 1.2
      }, listingType);

      const nearBudgetCheaper = await Property.findAll({
        where: cheaperFilter,
        include: [{ model: User, as: 'owner', attributes: ['name', 'email', 'phone'] }],
        order: [['pricingDaily', 'DESC']],
        limit: suggestionLimits.nearBudgetLimit
      });

      const nearBudgetAbove = await Property.findAll({
        where: slightlyAboveFilter,
        include: [{ model: User, as: 'owner', attributes: ['name', 'email', 'phone'] }],
        order: [['pricingDaily', 'ASC']],
        limit: suggestionLimits.nearBudgetLimit
      });
      
      const cheaperData = nearBudgetCheaper.map(p => p.toJSON());
      const aboveData = nearBudgetAbove.map(p => p.toJSON());

      const nearBudgetCombined = filterByAvailability({
        properties: [...cheaperData, ...aboveData],
        checkIn,
        checkOut
      }).slice(0, suggestionLimits.nearBudgetLimit);

      suggestions = nearBudgetCombined.length
        ? {
            message: 'Filtrenize en yakın daireleri sizin için bulduk.',
            nearBudget: nearBudgetCombined
          }
        : null;
    }

    // Guests filter
    // Misafir sayısı filtresi kaldırıldı (maksimum misafir alanı artık kullanılmıyor)

    res.json({
      results: properties,
      suggestions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;