const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  avatarUrl: String,
  googleId: String,
  searchHistory: [{
    country: String,
    searchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add search history
userSchema.methods.addToSearchHistory = async function(country) {
  // Remove existing entry if it exists
  this.searchHistory = this.searchHistory.filter(entry => entry.country !== country);
  
  // Add to beginning of array
  this.searchHistory.unshift({ country });
  
  // Keep only last 10 searches
  if (this.searchHistory.length > 10) {
    this.searchHistory = this.searchHistory.slice(0, 10);
  }
  
  await this.save();
};


userSchema.methods.generatePasswordReset = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  return token;
};

module.exports = mongoose.model('User', userSchema);
