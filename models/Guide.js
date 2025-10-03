const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  cover: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    name: {
      type: String,
      required: true
    },
    avatarUrl: String,
    id: String
  },
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  duration: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Hard'],
    default: 'Easy'
  },
  bestTimeToVisit: {
    type: String,
    trim: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
guideSchema.index({ title: 'text', excerpt: 'text', content: 'text', location: 'text' });
guideSchema.index({ location: 1 });
guideSchema.index({ tags: 1 });
guideSchema.index({ featured: 1 });
guideSchema.index({ 'stats.likes': -1 });
guideSchema.index({ createdAt: -1 });

// Instance method to increment views
guideSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

// Instance method to increment likes
guideSchema.methods.incrementLikes = function() {
  this.stats.likes += 1;
  return this.save();
};

// Static method to get popular guides
guideSchema.statics.getPopular = function(limit = 10) {
  return this.find({ published: true })
    .sort({ 'stats.likes': -1 })
    .limit(limit);
};

// Static method to get recent guides
guideSchema.statics.getRecent = function(limit = 10) {
  return this.find({ published: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get featured guides
guideSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ published: true, featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Guide = mongoose.model('Guide', guideSchema);

module.exports = Guide;