const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Base URL for REST Countries API
const REST_COUNTRIES_BASE_URL = 'https://restcountries.com/v3.1';

// @route   GET /api/countries/test
// @desc    Quick connectivity test for REST Countries API
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/all?fields=name`);
    return res.json({
      success: true,
      message: 'REST Countries API is reachable',
      sampleCount: Array.isArray(response.data) ? response.data.length : 0
    });
  } catch (error) {
    console.error('Countries test error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'REST Countries API test failed',
      error: error.message
    });
  }
});

// @route   GET /api/countries/search/:name
// @desc    Search for countries by name
// @access  Private
router.get('/search/:name', auth, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Country name must be at least 2 characters' });
    }

    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/name/${encodeURIComponent(name.trim())}`);
    
    // Format the response data
    const countries = response.data.map(country => ({
      name: country.name.common,
      officialName: country.name.official,
      capital: country.capital ? country.capital[0] : 'N/A',
      population: country.population,
      region: country.region,
      subregion: country.subregion,
      currencies: country.currencies ? Object.values(country.currencies).map(curr => ({
        name: curr.name,
        symbol: curr.symbol,
        code: Object.keys(country.currencies)[0]
      })) : [],
      languages: country.languages ? Object.values(country.languages) : [],
      flag: country.flags.svg || country.flags.png,
      coatOfArms: country.coatOfArms?.svg || country.coatOfArms?.png,
      timezones: country.timezones,
      coordinates: country.latlng,
      borders: country.borders || [],
      area: country.area,
      maps: country.maps,
      fifa: country.fifa,
      continents: country.continents
    }));

    res.json({
      success: true,
      count: countries.length,
      data: countries
    });

  } catch (error) {
    console.error('Countries search error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'No countries found with that name' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        success: false,
        message: 'Too many requests. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching country data' 
    });
  }
});

// @route   GET /api/countries/all
// @desc    Get all countries (limited fields)
// @access  Private
router.get('/all', auth, async (req, res) => {
  try {
    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/all?fields=name,capital,region,flag`);
    
    const countries = response.data.map(country => ({
      name: country.name.common,
      capital: country.capital ? country.capital[0] : 'N/A',
      region: country.region,
      flag: country.flag
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      count: countries.length,
      data: countries
    });

  } catch (error) {
    console.error('Get all countries error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching countries list' 
    });
  }
});

// @route   GET /api/countries/region/:region
// @desc    Get countries by region
// @access  Private
router.get('/region/:region', auth, async (req, res) => {
  try {
    const { region } = req.params;
    const validRegions = ['africa', 'america', 'asia', 'europe', 'oceania'];
    
    if (!validRegions.includes(region.toLowerCase())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid region. Valid regions are: ' + validRegions.join(', ')
      });
    }

    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/region/${region}`);
    
    const countries = response.data.map(country => ({
      name: country.name.common,
      capital: country.capital ? country.capital[0] : 'N/A',
      population: country.population,
      flag: country.flags.svg || country.flags.png,
      region: country.region,
      subregion: country.subregion
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      count: countries.length,
      data: countries
    });

  } catch (error) {
    console.error('Get countries by region error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'No countries found for that region' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching countries by region' 
    });
  }
});

// @route   GET /api/countries/code/:code
// @desc    Get country by country code
// @access  Private
router.get('/code/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length < 2 || code.length > 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid country code format' 
      });
    }

    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/alpha/${code}`);
    
    const country = response.data[0];
    const formattedCountry = {
      name: country.name.common,
      officialName: country.name.official,
      capital: country.capital ? country.capital[0] : 'N/A',
      population: country.population,
      region: country.region,
      subregion: country.subregion,
      currencies: country.currencies ? Object.values(country.currencies).map(curr => ({
        name: curr.name,
        symbol: curr.symbol,
        code: Object.keys(country.currencies)[0]
      })) : [],
      languages: country.languages ? Object.values(country.languages) : [],
      flag: country.flags.svg || country.flags.png,
      coordinates: country.latlng,
      timezones: country.timezones,
      area: country.area
    };

    res.json({
      success: true,
      data: formattedCountry
    });

  } catch (error) {
    console.error('Get country by code error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'Country not found with that code' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching country by code' 
    });
  }
});

module.exports = router;