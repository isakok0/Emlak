const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'booking_id',
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ratingOverall: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
    field: 'rating_overall'
  },
  ratingCleanliness: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    field: 'rating_cleanliness'
  },
  ratingLocation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    field: 'rating_location'
  },
  ratingValue: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    field: 'rating_value'
  },
  ratingCommunication: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    field: 'rating_communication'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    trim: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  hooks: {
    afterSave: async (review) => {
      // Property rating'i güncelle
      const Property = require('./Property');
      const reviews = await Review.findAll({ where: { propertyId: review.propertyId } });
      const avgRating = reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length;
      
      await Property.update(
        {
          ratingAverage: avgRating,
          ratingCount: reviews.length
        },
        { where: { id: review.propertyId } }
      );
    }
  }
});

// Mongoose uyumluluğu için toJSON
Review.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  
  if (!values.property && values.propertyId) {
    values.property = values.propertyId;
  }
  delete values.propertyId;
  
  if (!values.booking && values.bookingId) {
    values.booking = values.bookingId;
  }
  delete values.bookingId;
  
  if (!values.user && values.userId) {
    values.user = values.userId;
  }
  delete values.userId;
  
  values.rating = {
    overall: values.ratingOverall,
    cleanliness: values.ratingCleanliness,
    location: values.ratingLocation,
    value: values.ratingValue,
    communication: values.ratingCommunication
  };
  delete values.ratingOverall;
  delete values.ratingCleanliness;
  delete values.ratingLocation;
  delete values.ratingValue;
  delete values.ratingCommunication;
  
  return values;
};

module.exports = Review;
