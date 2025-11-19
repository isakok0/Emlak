const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactMessage = sequelize.define('ContactMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
    lowercase: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    trim: true
  },
  status: {
    type: DataTypes.ENUM('new', 'read', 'archived'),
    defaultValue: 'new'
  }
}, {
  tableName: 'contact_messages',
  timestamps: true
});

// Mongoose uyumluluğu için toJSON
ContactMessage.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = ContactMessage;
