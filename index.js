const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (support selecting a specific env file)
const envPath = process.env.ENV_FILE || path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
console.log(`Loaded environment from ${envPath}`);

// Import routes
const authRoutes = require('./routes/auth');
const countryRoutes = require('./routes/countries');
const weatherRoutes = require('./routes/weather');
const imageRoutes = require('./routes/images');
const tripRoutes = require('./routes/trips');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-planner')
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/trips', tripRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Travel Planner API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err 
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
