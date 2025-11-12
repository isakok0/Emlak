const express = require('express');
const Property = require('../models/Property');
const moment = require('moment');

const router = express.Router();

const getBaseFilter = ({ propertyType, amenityList, minRating }) => {
  const baseFilter = { isActive: true, 'location.city': 'Antalya' };

  if (propertyType) baseFilter.propertyType = propertyType;
  if (amenityList?.length) baseFilter.amenities = { $all: amenityList };
  if (minRating !== undefined) baseFilter['rating.average'] = { $gte: minRating };

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
    const filter = applyPriceExpr({ ...baseFilter }, { min: minPriceValue, max: maxPriceValue });

    let properties = await Property.find(filter)
      .populate('owner', 'name email phone');

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

      const nearBudgetCheaper = await Property.find(cheaperQuery)
        .sort({ 'pricing.daily': -1 })
        .limit(suggestionLimits.nearBudgetLimit)
        .populate('owner', 'name email phone');

      const nearBudgetAbove = await Property.find(slightlyAboveQuery)
        .sort({ 'pricing.daily': 1 })
        .limit(suggestionLimits.nearBudgetLimit)
        .populate('owner', 'name email phone');

      const nearBudgetCombined = filterByAvailability({
        properties: [...nearBudgetCheaper, ...nearBudgetAbove],
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