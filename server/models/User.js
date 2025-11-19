const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = 12;
const saltRounds = (() => {
  const fromEnv = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  if (Number.isInteger(fromEnv) && fromEnv >= 10 && fromEnv <= 16) {
    return fromEnv;
  }
  return DEFAULT_SALT_ROUNDS;
})();

async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, saltRounds);
}

const User = sequelize.define('User', {
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
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, Infinity]
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    trim: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  superAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await hashPassword(user.password);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await hashPassword(user.password);
      }
    }
  }
});

// Şifre karşılaştırma metodu
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Şifre setleme metodu
User.prototype.setPassword = async function(newPassword) {
  this.password = await hashPassword(newPassword);
};

// Mongoose uyumluluğu için _id getter
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = User;
