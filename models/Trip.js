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
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
tripSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Trip', tripSchema);