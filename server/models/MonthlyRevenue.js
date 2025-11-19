const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MonthlyRevenue = sequelize.define('MonthlyRevenue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 }
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
}, {
  tableName: 'monthly_revenues',
  timestamps: true,
  updatedAt: 'updatedAt',
  indexes: [
    {
      unique: true,
      fields: ['year', 'month']
    }
  ]
});

// Mongoose uyumluluğu için toJSON
MonthlyRevenue.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = MonthlyRevenue;
