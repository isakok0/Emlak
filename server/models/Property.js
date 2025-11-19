const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  locationCity: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Antalya',
    field: 'location_city'
  },
  locationDistrict: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'location_district'
  },
  locationNeighborhood: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'location_neighborhood'
  },
  locationAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'location_address'
  },
  locationCoordinates: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'location_coordinates'
  },
  propertyType: {
    type: DataTypes.ENUM('1+0', '1+1', '2+1', '3+1', '4+1'),
    allowNull: false,
    field: 'property_type'
  },
  listingType: {
    type: DataTypes.ENUM('rent', 'rent_daily', 'rent_monthly', 'sale'),
    defaultValue: 'rent_daily',
    allowNull: false,
    field: 'listing_type'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  ownerVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  amenities: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pricingDaily: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_daily'
  },
  pricingWeekly: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'pricing_weekly'
  },
  pricingMonthly: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'pricing_monthly'
  },
  seasonalRates: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'seasonal_rates'
  },
  availability: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  rules: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  nearbyAttractions: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'nearby_attractions'
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'owner_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ratingAverage: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    field: 'rating_average'
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'rating_count'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'properties',
  timestamps: true,
  indexes: [
    { fields: ['location_city', 'location_district'] },
    { fields: ['property_type'] },
    { fields: ['pricing_daily'] },
    { fields: ['listing_type'] },
    { fields: ['is_featured'] }
  ]
});

// Mongoose uyumluluğu için virtual fields ve toJSON
Property.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  
  // Nested object yapısını oluştur
  values.location = {
    city: values.locationCity,
    district: values.locationDistrict,
    neighborhood: values.locationNeighborhood,
    address: values.locationAddress,
    coordinates: values.locationCoordinates
  };
  delete values.locationCity;
  delete values.locationDistrict;
  delete values.locationNeighborhood;
  delete values.locationAddress;
  delete values.locationCoordinates;
  
  values.pricing = {
    daily: parseFloat(values.pricingDaily) || 0,
    weekly: values.pricingWeekly ? parseFloat(values.pricingWeekly) : undefined,
    monthly: values.pricingMonthly ? parseFloat(values.pricingMonthly) : undefined,
    seasonalRates: values.seasonalRates || []
  };
  delete values.pricingDaily;
  delete values.pricingWeekly;
  delete values.pricingMonthly;
  delete values.seasonalRates;
  
  values.rating = {
    average: parseFloat(values.ratingAverage) || 0,
    count: values.ratingCount || 0
  };
  delete values.ratingAverage;
  delete values.ratingCount;
  
  values.owner = values.ownerId;
  delete values.ownerId;
  
  return values;
};

module.exports = Property;
