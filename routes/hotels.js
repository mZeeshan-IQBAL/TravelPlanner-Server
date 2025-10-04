const express = require('express');
const axios = require('axios');
const router = express.Router();

// Amadeus API configuration
// Environment-based URL selection
const AMADEUS_ENVIRONMENT = process.env.AMADEUS_ENVIRONMENT || 'test';
const AMADEUS_API_URL = AMADEUS_ENVIRONMENT === 'production' 
  ? 'https://api.amadeus.com' 
  : 'https://test.api.amadeus.com';
const CLIENT_ID = process.env.AMADEUS_API_KEY;
const CLIENT_SECRET = process.env.AMADEUS_API_SECRET;

console.log(`🌐 Amadeus API Environment: ${AMADEUS_ENVIRONMENT.toUpperCase()}`);

// Token cache
let accessToken = null;
let tokenExpiresAt = null;

// Get Amadeus access token
async function getAccessToken() {
  try {
    // Check if we have a valid token
    if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      return accessToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Amadeus API credentials missing');
    }

    // Get new token
    const response = await axios.post(`${AMADEUS_API_URL}/v1/security/oauth2/token`, 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute early

    console.log('Amadeus token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('Error getting Amadeus access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
}

// GET /api/hotels/search - Search hotels
router.get('/search', async (req, res) => {
  try {
    const { 
      cityCode, 
      checkInDate, 
      checkOutDate, 
      adults = 1,
      rooms = 1,
      radius = 5,
      radiusUnit = 'KM',
      sort = 'DISTANCE'
    } = req.query;

    // Validate required parameters (relaxed for TEST environment)
    if (!cityCode) {
      return res.status(400).json({
        message: 'Missing required parameter: cityCode'
      });
    }

    // Get access token
    const token = await getAccessToken();

    // Build search parameters (remove date parameters for TEST environment)
    const searchParams = {
      cityCode,
      radius,
      radiusUnit
      // Note: checkInDate, checkOutDate, adults, rooms, sort removed for TEST compatibility
    };

    // Search hotels
    console.log('🔍 Searching hotels with params:', searchParams);
    const response = await axios.get(`${AMADEUS_API_URL}/v1/reference-data/locations/hotels/by-city`, {
      params: searchParams,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Hotel search successful! Found:', response.data.data?.length || 0, 'hotels');
    res.json({
      hotels: response.data.data || [],
      meta: response.data.meta || {},
      searchParams,
      source: 'amadeus_api' // Indicate this is real data
    });

  } catch (error) {
    console.error('🚨 Hotel search error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      searchParams: { cityCode, radius, radiusUnit }
    });
    
    // Return sample data if API fails
    const sampleHotels = getSampleHotels(req.query);
    res.json({
      hotels: sampleHotels,
      meta: { count: sampleHotels.length },
      searchParams: req.query,
      source: 'sample_data',
      message: `Using sample data - Amadeus API error: ${error.response?.status || error.message}`
    });
  }
});

// GET /api/hotels/offers - Get hotel offers for specific hotels
router.get('/offers', async (req, res) => {
  try {
    const { 
      hotelIds, 
      checkInDate, 
      checkOutDate, 
      adults = 1,
      rooms = 1 
    } = req.query;

    if (!hotelIds || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        message: 'Missing required parameters: hotelIds, checkInDate, checkOutDate'
      });
    }

    const token = await getAccessToken();

    // Strategy 1: Try direct hotel offers API (simplified for TEST environment)
    const searchParams = {
      hotelIds,
      checkInDate,
      checkOutDate,
      adults
      // Removed 'rooms' parameter for TEST environment compatibility
    };

    console.log('💰 Attempting hotel offers with specific IDs:', searchParams);
    
    try {
      const response = await axios.get(`${AMADEUS_API_URL}/v3/shopping/hotel-offers`, {
        params: searchParams,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Direct hotel offers successful! Found:', response.data.data?.length || 0, 'offers');
      return res.json({
        offers: response.data.data || [],
        meta: response.data.meta || {},
        searchParams,
        source: 'amadeus_api_direct'
      });
      
    } catch (directError) {
      console.log('⚠️ Direct hotel offers failed, trying location-based approach...');
      console.log('Direct error:', directError.response?.status, directError.response?.data);
      
      // Strategy 2: Try location-based search as fallback
      // Use Paris coordinates as default (this should be improved to use actual hotel location)
      try {
        // Simplified parameters for TEST environment compatibility
        const locationParams = {
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 20,
          radiusUnit: 'KM',
          checkInDate,
          checkOutDate,
          adults
          // Removed 'rooms' parameter as it may cause issues in TEST environment
        };
        
        console.log('💰 Attempting location-based hotel offers:', locationParams);
        const locationResponse = await axios.get(`${AMADEUS_API_URL}/v3/shopping/hotel-offers`, {
          params: locationParams,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Location-based hotel offers successful! Found:', locationResponse.data.data?.length || 0, 'offers');
        
        // Filter results to try to match the requested hotel ID if possible
        let filteredOffers = locationResponse.data.data || [];
        if (hotelIds && filteredOffers.length > 0) {
          const matchingOffers = filteredOffers.filter(offer => 
            offer.hotel?.hotelId === hotelIds || offer.hotel?.dupeId?.toString() === hotelIds
          );
          if (matchingOffers.length > 0) {
            filteredOffers = matchingOffers;
            console.log('🎯 Found matching offers for hotel ID:', hotelIds);
          }
        }
        
        return res.json({
          offers: filteredOffers,
          meta: locationResponse.data.meta || {},
          searchParams: { ...searchParams, fallbackMethod: 'location-based' },
          source: 'amadeus_api_location'
        });
        
      } catch (locationError) {
        console.error('🚨 Both direct and location-based hotel offers failed:', {
          directError: {
            status: directError.response?.status,
            data: directError.response?.data
          },
          locationError: {
            status: locationError.response?.status,
            data: locationError.response?.data
          }
        });
        
        throw locationError; // This will trigger the sample data fallback
      }
    }

  } catch (error) {
    console.error('🚨 All hotel offers strategies failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Return sample offers with better messaging
    const sampleOffers = getSampleOffers(req.query);
    res.json({
      offers: sampleOffers,
      meta: { count: sampleOffers.length },
      searchParams: req.query,
      source: 'sample_data',
      message: `Sample hotel offers - Amadeus offers API has limitations in TEST environment`
    });
  }
});

// GET /api/hotels/cities - Get city codes for hotel search
router.get('/cities', async (req, res) => {
  try {
    const { keyword, subType = 'CITY' } = req.query;

    if (!keyword) {
      return res.status(400).json({
        message: 'Missing required parameter: keyword'
      });
    }

    const token = await getAccessToken();

    const response = await axios.get(`${AMADEUS_API_URL}/v1/reference-data/locations`, {
      params: {
        keyword,
        subType,
        'page[limit]': 10
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({
      cities: response.data.data || [],
      meta: response.data.meta || {}
    });

  } catch (error) {
    console.error('Cities search error:', error.response?.data || error.message);
    
    // Return sample cities if API fails
    const sampleCities = getSampleCities(req.query.keyword);
    res.json({
      cities: sampleCities,
      meta: { count: sampleCities.length },
      source: 'sample_data',
      message: 'Using sample data - Amadeus API unavailable'
    });
  }
});

// Sample data functions for fallback
function getSampleHotels(query) {
  return [
    {
      type: 'location',
      subType: 'HOTEL',
      id: 'HLPAR001',
      self: {
        href: 'https://api.amadeus.com/v1/reference-data/locations/hotels/HLPAR001',
        methods: ['GET']
      },
      name: 'Hotel Plaza Athenee',
      iataCode: 'PAR',
      address: {
        cityName: 'PARIS',
        countryCode: 'FR'
      },
      geoCode: {
        latitude: 48.8566,
        longitude: 2.3522
      },
      distance: {
        value: 1.2,
        unit: 'KM'
      },
      relevance: 9.8
    },
    {
      type: 'location',
      subType: 'HOTEL',
      id: 'HLPAR002',
      self: {
        href: 'https://api.amadeus.com/v1/reference-data/locations/hotels/HLPAR002',
        methods: ['GET']
      },
      name: 'Le Bristol Paris',
      iataCode: 'PAR',
      address: {
        cityName: 'PARIS',
        countryCode: 'FR'
      },
      geoCode: {
        latitude: 48.8719,
        longitude: 2.3147
      },
      distance: {
        value: 0.8,
        unit: 'KM'
      },
      relevance: 9.7
    },
    {
      type: 'location',
      subType: 'HOTEL',
      id: 'HLPAR003',
      self: {
        href: 'https://api.amadeus.com/v1/reference-data/locations/hotels/HLPAR003',
        methods: ['GET']
      },
      name: 'Shangri-La Hotel Paris',
      iataCode: 'PAR',
      address: {
        cityName: 'PARIS',
        countryCode: 'FR'
      },
      geoCode: {
        latitude: 48.8639,
        longitude: 2.2944
      },
      distance: {
        value: 2.1,
        unit: 'KM'
      },
      relevance: 9.6
    }
  ];
}

function getSampleOffers(query) {
  return [
    {
      type: 'hotel-offers',
      hotel: {
        type: 'hotel',
        hotelId: 'HLPAR001',
        chainCode: 'RT',
        dupeId: '700027853',
        name: 'Hotel Plaza Athenee',
        cityCode: 'PAR',
        latitude: 48.8566,
        longitude: 2.3522
      },
      available: true,
      offers: [
        {
          id: '63A93695B58821ABB0EC2B33FE9FAB24D72BF34B1BD7D707293763D8D9378FC3',
          checkInDate: query.checkInDate || '2024-01-15',
          checkOutDate: query.checkOutDate || '2024-01-17',
          rateCode: 'RAC',
          room: {
            type: 'A1K',
            typeEstimated: {
              category: 'DELUXE_ROOM',
              beds: 1,
              bedType: 'KING'
            },
            description: {
              text: 'Deluxe King Room with City View'
            }
          },
          guests: {
            adults: parseInt(query.adults) || 1
          },
          price: {
            currency: 'EUR',
            base: '450.00',
            total: '495.00',
            taxes: [
              {
                code: 'TOTAL_TAX',
                amount: '45.00'
              }
            ]
          },
          policies: {
            paymentType: 'guarantee',
            cancellation: {
              deadline: '2024-01-14T18:00:00.000+01:00'
            }
          },
          self: 'https://api.amadeus.com/v3/shopping/hotel-offers/63A93695B58821ABB0EC2B33FE9FAB24D72BF34B1BD7D707293763D8D9378FC3'
        }
      ]
    }
  ];
}

function getSampleCities(keyword) {
  const cities = [
    {
      type: 'location',
      subType: 'CITY',
      name: 'Paris',
      detailedName: 'Paris, France',
      id: '1',
      self: {
        href: 'https://api.amadeus.com/v1/reference-data/locations/1',
        methods: ['GET']
      },
      timeZoneOffset: '+01:00',
      iataCode: 'PAR',
      geoCode: {
        latitude: 48.85341,
        longitude: 2.3488
      },
      address: {
        cityName: 'Paris',
        cityCode: 'PAR',
        countryName: 'France',
        countryCode: 'FR',
        regionCode: 'EUROP'
      },
      analytics: {
        travelers: {
          score: 97
        }
      }
    },
    {
      type: 'location',
      subType: 'CITY',
      name: 'London',
      detailedName: 'London, United Kingdom',
      id: '2',
      self: {
        href: 'https://api.amadeus.com/v1/reference-data/locations/2',
        methods: ['GET']
      },
      timeZoneOffset: '+00:00',
      iataCode: 'LON',
      geoCode: {
        latitude: 51.5074,
        longitude: -0.1278
      },
      address: {
        cityName: 'London',
        cityCode: 'LON',
        countryName: 'United Kingdom',
        countryCode: 'GB',
        regionCode: 'EUROP'
      },
      analytics: {
        travelers: {
          score: 95
        }
      }
    }
  ].filter(city => city.name.toLowerCase().includes(keyword.toLowerCase()));

  return cities;
}

module.exports = router;