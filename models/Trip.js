const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  country: {
    name: {
      type: String,
      required: [true, 'Country name is required']
    },
    capital: String,
    population: Number,
    currency: String,
    flag: String,
    region: String,
    subregion: String,
    languages: [String],
    timezones: [String]
  },
  weather: {
    current: {
      temperature: Number,
      description: String,
      humidity: Number,
      windSpeed: Number,
      icon: String
    },
    forecast: [{
      date: String,
      temperature: {
        min: Number,
        max: Number
      },
      description: String,
      icon: String
    }]
  },
  images: [{
    url: String,
    altDescription: String,
    photographer: String,
    photographerUrl: String
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  title: {
    type: String,
    required: [true, 'Trip title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  plannedDates: {
    startDate: Date,
    endDate: Date
  },
  budget: {
    currency: { type: String, default: 'USD' },
    totalEstimated: { type: Number, default: 0 },
    planned: {
      flights: { type: Number, default: 0 },
      hotels: { type: Number, default: 0 },
      food: { type: Number, default: 0 }
    }
  },
  expenses: [{
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: ['food','transport','accommodation','activities','shopping','health','entertainment','miscellaneous'], default: 'miscellaneous' },
    date: { type: Date, default: Date.now },
    notes: String,
    currency: { type: String, default: 'USD' },
    createdAt: { type: Date, default: Date.now }
  }],
  itinerary: [{
    title: { type: String, required: true },
    location: String,
    day: Number,
    startTime: String,
    endTime: String,
    notes: { type: String, maxlength: 500 },
    status: { type: String, enum: ['planned', 'done', 'cancelled'], default: 'planned' },
    order: { type: Number, default: 0 },
    lat: Number,
    lng: Number,
    cost: { type: Number, default: 0 }
  }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' }
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  }],
  receipts: [{
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  isFavorite: {
    type: Boolean,
    default: false
  },
  publicShare: {
    enabled: { type: Boolean, default: false },
    token: { type: String, index: true }
  }
}, {
  timestamps: true
});

// Index for better query performance
tripSchema.index({ user: 1, createdAt: -1 });
tripSchema.index({ _id: 1, 'expenses.createdAt': -1 });
tripSchema.index({ 'publicShare.token': 1 });

module.exports = mongoose.model('Trip', tripSchema);
