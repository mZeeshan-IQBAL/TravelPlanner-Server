const express = require('express');
const axios = require('axios');
const { nominatim, overpass, wikipedia } = require('../utils/apiHelpers');

const router = express.Router();

// GET /api/places/search
// q: text query
// lat,lng (optional) for proximity search
// radius (meters, optional)
router.get('/search', async (req, res) => {
  try {
    const { q, lat, lng, radius = 5000, limit = 10 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query (q) is required' });
    }

    let results = [];

    // Use Nominatim for place search
    const searchOptions = {
      limit: parseInt(limit) || 10
    };

    // If coordinates are provided, add them for proximity search
    if (lat && lng) {
      searchOptions.viewbox = `${parseFloat(lng) - 0.1},${parseFloat(lat) + 0.1},${parseFloat(lng) + 0.1},${parseFloat(lat) - 0.1}`;
      searchOptions.bounded = 1;
    }

    const nominatimResults = await nominatim.search(q.trim(), searchOptions);
    
    results = nominatimResults.map((item) => ({
      provider: 'nominatim',
      providerId: item.providerId,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      address: item.address,
      type: item.type,
      category: item.category,
      importance: item.importance,
      rating: undefined,
      priceLevel: undefined,
      photoUrl: undefined,
      openingHours: undefined,
    }));

    // If we have coordinates, also search for POIs nearby using Overpass
    if (lat && lng && results.length < 5) {
      try {
        const poiResults = await overpass.searchPOI(
          parseFloat(lat), 
          parseFloat(lng), 
          parseInt(radius) || 5000, 
          {}, 
          Math.max(5 - results.length, 5)
        );
        
        // Add POI results that match the search query
        const relevantPOIs = poiResults.filter(poi => 
          poi.name.toLowerCase().includes(q.toLowerCase()) ||
          poi.tags.name?.toLowerCase().includes(q.toLowerCase())
        ).map(poi => ({
          provider: 'overpass',
          providerId: poi.providerId,
          name: poi.name,
          lat: poi.lat,
          lng: poi.lng,
          address: poi.address,
          type: poi.type,
          category: poi.category,
          rating: undefined,
          priceLevel: undefined,
          photoUrl: undefined,
          openingHours: poi.openingHours,
          website: poi.website,
          phone: poi.phone
        }));
        
        results = [...results, ...relevantPOIs];
      } catch (poiError) {
        console.warn('POI search failed:', poiError.message);
      }
    }

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Places search error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Error searching places' });
  }
});

// Overpass API - Nearby search
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, type = 'tourist_attraction', keyword, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    let searchTags = {};
    
    // Map Google Places types to OpenStreetMap tags
    switch (type) {
      case 'tourist_attraction':
        searchTags = { tourism: ['attraction', 'museum', 'monument', 'viewpoint', 'gallery'] };
        break;
      case 'restaurant':
        searchTags = { amenity: ['restaurant', 'fast_food', 'cafe', 'bar', 'pub'] };
        break;
      case 'lodging':
        searchTags = { tourism: ['hotel', 'hostel', 'guest_house', 'motel'] };
        break;
      case 'hospital':
        searchTags = { amenity: 'hospital' };
        break;
      case 'pharmacy':
        searchTags = { amenity: 'pharmacy' };
        break;
      case 'bank':
        searchTags = { amenity: 'bank' };
        break;
      case 'gas_station':
        searchTags = { amenity: 'fuel' };
        break;
      case 'shopping_mall':
        searchTags = { shop: ['mall', 'department_store', 'supermarket'] };
        break;
      default:
        // Default to tourist attractions and amenities
        searchTags = {}; // Will use default POI search
    }

    const results = await overpass.searchPOI(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      searchTags,
      parseInt(limit)
    );

    // Filter by keyword if provided
    let filteredResults = results;
    if (keyword && keyword.trim()) {
      const keywordLower = keyword.toLowerCase();
      filteredResults = results.filter(poi => 
        poi.name.toLowerCase().includes(keywordLower) ||
        poi.tags.name?.toLowerCase().includes(keywordLower) ||
        poi.tags.description?.toLowerCase().includes(keywordLower)
      );
    }

    // Transform to match Google Places response format
    const formattedResults = filteredResults.map(poi => ({
      provider: 'overpass',
      providerId: poi.providerId,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      address: poi.address,
      rating: undefined, // Not available in OpenStreetMap
      userRatingsTotal: undefined,
      priceLevel: undefined,
      photoRef: undefined,
      openingHours: poi.openingHours,
      types: [poi.type],
      category: poi.category,
      website: poi.website,
      phone: poi.phone,
      wheelchair: poi.wheelchair,
      tags: poi.tags
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error('Overpass nearby search error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching nearby places' });
  }
});

// Place details using Wikipedia and Nominatim
router.get('/details', async (req, res) => {
  try {
    const { placeId, name, lat, lng } = req.query;
    
    if (!placeId && !name && (!lat || !lng)) {
      return res.status(400).json({ 
        success: false, 
        message: 'placeId, name, or lat/lng coordinates are required' 
      });
    }

    let placeData = null;
    let wikipediaInfo = null;
    
    // If we have a Nominatim place ID, get details from Nominatim
    if (placeId && placeId.toString().includes('nominatim')) {
      // For Nominatim IDs, we need to use reverse geocoding
      if (lat && lng) {
        placeData = await nominatim.reverse(parseFloat(lat), parseFloat(lng));
      }
    }
    // If we have coordinates, use reverse geocoding
    else if (lat && lng) {
      placeData = await nominatim.reverse(parseFloat(lat), parseFloat(lng));
    }
    
    // Determine the place name for Wikipedia search
    let searchName = name || placeData?.name || '';
    if (!searchName && placeData?.fullName) {
      // Extract the main place name from full address
      searchName = placeData.fullName.split(',')[0];
    }
    
    // Get Wikipedia information if we have a place name
    if (searchName) {
      try {
        wikipediaInfo = await wikipedia.getPlaceInfo(searchName, {
          sentences: 3,
          imageLimit: 5
        });
      } catch (wikiError) {
        console.warn('Wikipedia info failed:', wikiError.message);
      }
    }
    
    // If we still don't have place data, return error
    if (!placeData && !wikipediaInfo) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }
    
    // Combine data from different sources
    const combinedData = {
      provider: placeData?.provider || 'wikipedia',
      providerId: placeId,
      name: wikipediaInfo?.title || placeData?.name || searchName,
      lat: placeData?.lat || parseFloat(lat),
      lng: placeData?.lng || parseFloat(lng),
      address: placeData?.address || placeData?.fullName,
      phone: undefined, // Not available from these sources
      openingHours: undefined,
      rating: undefined,
      website: wikipediaInfo?.url,
      description: wikipediaInfo?.extract,
      photos: wikipediaInfo?.images?.map(img => ({
        url: img.url,
        thumbUrl: img.thumbUrl,
        width: img.width,
        height: img.height,
        description: img.description,
        provider: 'wikipedia'
      })) || [],
      thumbnail: wikipediaInfo?.thumbnail,
      type: placeData?.type,
      category: placeData?.category,
      importance: placeData?.importance,
      boundingBox: placeData?.boundingBox,
      alternativeResults: wikipediaInfo?.alternativeResults || []
    };
    
    res.json({ success: true, data: combinedData });
  } catch (error) {
    console.error('Place details error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching place details' });
  }
});

// Emergency info using Overpass API
router.get('/emergency', async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseInt(radius);

    // Search for different types of emergency services
    const [hospitals, pharmacies, police, fireStations, embassies] = await Promise.all([
      overpass.searchAmenity(latitude, longitude, 'hospital', searchRadius, 10),
      overpass.searchAmenity(latitude, longitude, 'pharmacy', searchRadius, 10),
      overpass.searchAmenity(latitude, longitude, 'police', searchRadius, 5),
      overpass.searchAmenity(latitude, longitude, 'fire_station', searchRadius, 5),
      overpass.searchPOI(latitude, longitude, searchRadius, { amenity: 'embassy' }, 5)
    ].map(promise => promise.catch(error => {
      console.warn('Emergency service search failed:', error.message);
      return [];
    })));

    // Format results to match Google Places response format
    const formatResults = (results, type) => results.map(poi => ({
      type,
      name: poi.name,
      provider: 'overpass',
      providerId: poi.providerId,
      lat: poi.lat,
      lng: poi.lng,
      address: poi.address,
      rating: undefined,
      openNow: undefined, // Would need to parse opening_hours
      openingHours: poi.openingHours,
      phone: poi.phone,
      website: poi.website,
      wheelchair: poi.wheelchair,
      emergency: poi.tags?.emergency,
      tags: poi.tags
    }));

    const emergencyData = {
      hospitals: formatResults(hospitals, 'hospital'),
      pharmacies: formatResults(pharmacies, 'pharmacy'),
      police: formatResults(police, 'police'),
      fireStations: formatResults(fireStations, 'fire_station'),
      embassies: formatResults(embassies, 'embassy')
    };

    // Calculate total emergency services found
    const totalServices = Object.values(emergencyData).reduce((sum, services) => sum + services.length, 0);

    res.json({ 
      success: true, 
      data: emergencyData,
      meta: {
        totalServices,
        searchRadius,
        searchLocation: { lat: latitude, lng: longitude }
      }
    });
  } catch (error) {
    console.error('Emergency info error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching emergency info' });
  }
});

module.exports = router;
