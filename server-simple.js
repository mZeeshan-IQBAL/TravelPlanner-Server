const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Travel Planner API is running!',
    timestamp: new Date().toISOString(),
    environment: {
      port: PORT,
      hasWeatherKey: !!process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'demo-key-get-real-key-from-openweathermap',
      hasUnsplashKey: !!process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY !== 'demo-key-get-real-key-from-unsplash'
    }
  });
});

// Simple test routes without authentication
app.get('/api/countries/test', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/name/usa');
    const country = response.data[0];
    
    res.json({
      success: true,
      message: 'Countries API test successful',
      data: {
        name: country.name.common,
        capital: country.capital?.[0],
        population: country.population,
        flag: country.flags.svg
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Countries API test failed',
      error: error.message
    });
  }
});

app.get('/api/weather/test', async (req, res) => {
  if (!process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY.includes('demo-key')) {
    return res.json({
      success: false,
      message: 'Weather API test skipped - no valid API key configured',
      note: 'Get your free API key at https://openweathermap.org/api'
    });
  }

  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    
    res.json({
      success: true,
      message: 'Weather API test successful',
      data: {
        city: response.data.name,
        temperature: Math.round(response.data.main.temp),
        description: response.data.weather[0].description
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Weather API test failed',
      error: error.response?.data?.message || error.message
    });
  }
});

app.get('/api/images/test', async (req, res) => {
  if (!process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY.includes('demo-key')) {
    return res.json({
      success: false,
      message: 'Images API test skipped - no valid API key configured',
      note: 'Get your free API key at https://unsplash.com/developers'
    });
  }

  try {
    const response = await axios.get('https://api.unsplash.com/photos/random?query=travel&orientation=landscape', {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });
    
    res.json({
      success: true,
      message: 'Images API test successful',
      data: {
        imageUrl: response.data.urls.small,
        photographer: response.data.user.name,
        description: response.data.alt_description
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Images API test failed',
      error: error.response?.data?.errors?.[0] || error.message
    });
  }
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
  console.log(`🚀 Simple Travel Planner API is running on port ${PORT}`);
  console.log(`📍 Test the API at: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Test countries: http://localhost:${PORT}/api/countries/test`);
  console.log(`🌤️  Test weather: http://localhost:${PORT}/api/weather/test`);
  console.log(`📸 Test images: http://localhost:${PORT}/api/images/test`);
});