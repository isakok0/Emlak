const express = require('express');
const Property = require('../models/Property');
const moment = require('moment');

const router = express.Router();

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

    const filter = { isActive: true, 'location.city': 'Antalya' };

    // Property type
    if (propertyType) filter.propertyType = propertyType;

    // Price range
    if (minPrice || maxPrice) {
      filter['pricing.daily'] = {};
      if (minPrice) filter['pricing.daily'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.daily'].$lte = Number(maxPrice);
    }

    // Amenities
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : amenities.split(',');
      filter.amenities = { $all: amenityList };
    }

    // Rating
    if (minRating) {
      filter['rating.average'] = { $gte: Number(minRating) };
    }

    let properties = await Property.find(filter)
      .populate('owner', 'name email phone');

    // Date availability filter
    if (checkIn && checkOut) {
      const checkInDate = moment(checkIn);
      const checkOutDate = moment(checkOut);
      
      properties = properties.filter(property => {
        const availability = property.availability || [];
        const dates = [];
        
        for (let d = moment(checkInDate); d.isBefore(checkOutDate); d.add(1, 'days')) {
          dates.push(d.format('YYYY-MM-DD'));
        }

        return dates.every(date => {
          const slot = availability.find(a => 
            moment(a.date).format('YYYY-MM-DD') === date
          );
          return !slot || slot.isAvailable;
        });
      });
    }

    // Guests filter
    // Misafir sayısı filtresi kaldırıldı (maksimum misafir alanı artık kullanılmıyor)

    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;



