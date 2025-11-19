const sequelize = require('../config/database');
const User = require('./User');
const Property = require('./Property');
const Booking = require('./Booking');
const Review = require('./Review');
const Settings = require('./Settings');
const ContactMessage = require('./ContactMessage');
const MonthlyRevenue = require('./MonthlyRevenue');

// Define associations
User.hasMany(Property, { foreignKey: 'ownerId', as: 'properties' });
Property.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Booking, { foreignKey: 'guestId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'guestId', as: 'guest' });

Property.hasMany(Booking, { foreignKey: 'propertyId', as: 'bookings' });
Booking.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Review, { foreignKey: 'propertyId', as: 'reviews' });
Review.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Booking.hasMany(Review, { foreignKey: 'bookingId', as: 'reviews' });
Review.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Property,
  Booking,
  Review,
  Settings,
  ContactMessage,
  MonthlyRevenue
};

