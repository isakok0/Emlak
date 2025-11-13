const mongoose = require('mongoose');
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

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  superAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Şifre hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  next();
});

// findOneAndUpdate ile şifre güncelleme durumunda hashleme
userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() || {};
  const directPassword = update.password;
  const setPassword = update.$set?.password;

  if (!directPassword && !setPassword) {
    return next();
  }

  const hashed = await hashPassword(directPassword || setPassword);

  if (directPassword) {
    update.password = hashed;
  }

  if (setPassword) {
    update.$set.password = hashed;
  }

  this.setUpdate(update);
  next();
});

// Şifre karşılaştırma
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.setPassword = async function(newPassword) {
  this.password = await hashPassword(newPassword);
};

module.exports = mongoose.model('User', userSchema);














