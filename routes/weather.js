const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Base URL for OpenWeatherMap API
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// @route   GET /api/weather/test
// @desc    Quick configuration test for OpenWeatherMap
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false,
        message: 'OpenWeatherMap API key not configured' 
      });
    }

    return res.json({
      success: true,
      message: 'OpenWeatherMap API key is set'
    });
  } catch (error) {
    console.error('Weather test error:', error.message);
    return res.status(500).json({ success: false, message: 'Weather test failed', error: error.message });
  }
});

// @route   GET /api/weather/current/:city
// @desc    Get current weather for a city
// @access  Private
router.get('/current/:city', auth, async (req, res) => {
  try {
    const { city } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        success: false,
        message: 'OpenWeatherMap API key not configured' 
      });
    }

    if (!city || city.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'City name must be at least 2 characters' 
      });
    }

    const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
      params: {
        q: city.trim(),
        appid: apiKey,
        units: 'metric'
      }
    });

    const weather = {
      city: response.data.name,
      country: response.data.sys.country,
      coordinates: {
        lat: response.data.coord.lat,
        lon: response.data.coord.lon
      },
      temperature: Math.round(response.data.main.temp),
      feelsLike: Math.round(response.data.main.feels_like),
      description: response.data.weather[0].description,
      main: response.data.weather[0].main,
      icon: response.data.weather[0].icon,
      humidity: response.data.main.humidity,
      pressure: response.data.main.pressure,
      windSpeed: response.data.wind.speed,
      windDirection: response.data.wind.deg,
      visibility: response.data.visibility / 1000, // Convert to km
      cloudiness: response.data.clouds.all,
      sunrise: new Date(response.data.sys.sunrise * 1000),
      sunset: new Date(response.data.sys.sunset * 1000),
      timezone: response.data.timezone
    };

    res.json({
      success: true,
      data: weather
    });

  } catch (error) {
    console.error('Current weather error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'City not found' 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Weather API authentication failed' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        success: false,
        message: 'Weather API rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching current weather' 
    });
  }
});

// @route   GET /api/weather/forecast/:city
// @desc    Get 5-day weather forecast for a city
// @access  Private
router.get('/forecast/:city', auth, async (req, res) => {
  try {
    const { city } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        success: false,
        message: 'OpenWeatherMap API key not configured' 
      });
    }

    if (!city || city.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'City name must be at least 2 characters' 
      });
    }

    const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
      params: {
        q: city.trim(),
        appid: apiKey,
        units: 'metric'
      }
    });

    // Group forecast by date and get daily summaries
    const forecastByDate = {};
    
    response.data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      
      if (!forecastByDate[date]) {
        forecastByDate[date] = {
          date: date,
          temperatures: [],
          descriptions: [],
          humidity: [],
          windSpeed: [],
          icons: [],
          pressure: [],
          cloudiness: []
        };
      }
      
      forecastByDate[date].temperatures.push(item.main.temp);
      forecastByDate[date].descriptions.push(item.weather[0].description);
      forecastByDate[date].humidity.push(item.main.humidity);
      forecastByDate[date].windSpeed.push(item.wind.speed);
      forecastByDate[date].icons.push(item.weather[0].icon);
      forecastByDate[date].pressure.push(item.main.pressure);
      forecastByDate[date].cloudiness.push(item.clouds.all);
    });

    // Process daily summaries
    const dailyForecast = Object.values(forecastByDate).map(day => ({
      date: day.date,
      temperature: {
        min: Math.round(Math.min(...day.temperatures)),
        max: Math.round(Math.max(...day.temperatures)),
        avg: Math.round(day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length)
      },
      description: getMostCommonValue(day.descriptions),
      icon: getMostCommonValue(day.icons),
      humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
      windSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length * 10) / 10,
      pressure: Math.round(day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length),
      cloudiness: Math.round(day.cloudiness.reduce((a, b) => a + b, 0) / day.cloudiness.length)
    })).slice(0, 5); // Limit to 5 days

    const forecast = {
      city: response.data.city.name,
      country: response.data.city.country,
      coordinates: {
        lat: response.data.city.coord.lat,
        lon: response.data.city.coord.lon
      },
      forecast: dailyForecast
    };

    res.json({
      success: true,
      data: forecast
    });

  } catch (error) {
    console.error('Weather forecast error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'City not found' 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Weather API authentication failed' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        success: false,
        message: 'Weather API rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching weather forecast' 
    });
  }
});

// @route   GET /api/weather/coordinates
// @desc    Get current weather by coordinates
// @access  Private
router.get('/coordinates', auth, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        success: false,
        message: 'OpenWeatherMap API key not configured' 
      });
    }

    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude and longitude are required' 
      });
    }

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid coordinates' 
      });
    }

    const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
      params: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        appid: apiKey,
        units: 'metric'
      }
    });

    const weather = {
      city: response.data.name,
      country: response.data.sys.country,
      coordinates: {
        lat: response.data.coord.lat,
        lon: response.data.coord.lon
      },
      temperature: Math.round(response.data.main.temp),
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed
    };

    res.json({
      success: true,
      data: weather
    });

  } catch (error) {
    console.error('Weather by coordinates error:', error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid coordinates' 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Weather API authentication failed' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        success: false,
        message: 'Weather API rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching weather by coordinates' 
    });
  }
});

// Helper function to get most common value in array
function getMostCommonValue(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length - arr.filter(v => v === b).length
  ).pop();
}

module.exports = router;