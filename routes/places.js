const express = require('express');
const axios = require('axios');

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

    const key = process.env.OPEN_TRIPMAP_KEY;
    let results = [];

    if (key && lat && lng) {
      // Try OpenTripMap autosuggest when key and coords are present
      // Docs: https://opentripmap.io/docs#tag/Places/operation/getPlacesAutosuggest
      const url = 'https://api.opentripmap.com/0.1/en/places/autosuggest';
      const resp = await axios.get(url, {
        params: {
          apikey: key,
          name: q,
          lon: lng,
          lat,
          radius,
          limit,
        },
      });

      const features = resp.data?.features || [];
      results = features.map((f) => ({
        provider: 'opentripmap',
        providerId: f?.properties?.xid || f?.id,
        name: f?.properties?.name || q,
        lat: f?.geometry?.coordinates?.[1],
        lng: f?.geometry?.coordinates?.[0],
        address: f?.properties?.address || '',
        rating: undefined,
        priceLevel: undefined,
        photoUrl: undefined,
        openingHours: undefined,
      })).filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');
    } else {
      // Fallback to Nominatim (no key). Respect usage policy; for dev only.
      // Docs: https://nominatim.org/release-docs/develop/api/Search/
      const url = 'https://nominatim.openstreetmap.org/search';
      const resp = await axios.get(url, {
        params: {
          q,
          format: 'json',
          addressdetails: 1,
          limit,
        },
        headers: {
          'User-Agent': 'Travel-Planner-Dev/1.0 (+https://localhost)'
        }
      });

      results = (resp.data || []).map((item) => ({
        provider: 'nominatim',
        providerId: item.place_id,
        name: item.display_name?.split(',')[0] || q,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        rating: undefined,
        priceLevel: undefined,
        photoUrl: undefined,
        openingHours: undefined,
      }));
    }

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Places search error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Error searching places' });
  }
});

// Google Places - Nearby search
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, type = 'tourist_attraction', keyword } = req.query;
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return res.status(400).json({ success: false, message: 'GOOGLE_PLACES_API_KEY not configured' });
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const axiosResp = await require('axios').get(url, {
      params: { key, location: `${lat},${lng}`, radius, type, keyword }
    });
    const results = (axiosResp.data.results || []).map(r => ({
      provider: 'google',
      providerId: r.place_id,
      name: r.name,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      address: r.vicinity,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      priceLevel: r.price_level,
      photoRef: r.photos?.[0]?.photo_reference,
      openingHours: r.opening_hours,
      types: r.types,
    }));
    res.json({ success: true, data: results });
  } catch (e) {
    console.error('Google Places nearby error:', e?.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Error fetching nearby places' });
  }
});

// Google Places - Details
router.get('/details', async (req, res) => {
  try {
    const { placeId } = req.query;
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return res.status(400).json({ success: false, message: 'GOOGLE_PLACES_API_KEY not configured' });
    if (!placeId) return res.status(400).json({ success: false, message: 'placeId is required' });
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const axiosResp = await require('axios').get(url, { params: { key, place_id: placeId, fields: 'name,geometry,formatted_address,formatted_phone_number,opening_hours,photos,rating,website,url' } });
    const r = axiosResp.data.result;
    if (!r) return res.status(404).json({ success: false, message: 'Place not found' });
    res.json({ success: true, data: {
      provider: 'google',
      providerId: placeId,
      name: r.name,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      address: r.formatted_address,
      phone: r.formatted_phone_number,
      openingHours: r.opening_hours,
      rating: r.rating,
      website: r.website,
      googleUrl: r.url,
      photos: (r.photos || []).map(p => ({ ref: p.photo_reference, width: p.width, height: p.height }))
    }});
  } catch (e) {
    console.error('Google Places details error:', e?.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Error fetching place details' });
  }
});

// Emergency info using Google Places
router.get('/emergency', async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return res.status(400).json({ success: false, message: 'GOOGLE_PLACES_API_KEY not configured' });
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });
    const axios = require('axios');
    const base = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

    const [hosp, emb] = await Promise.all([
      axios.get(base, { params: { key, location: `${lat},${lng}`, radius, type: 'hospital' } }),
      axios.get(base, { params: { key, location: `${lat},${lng}`, radius, type: 'embassy' } })
    ]);

    const mapRes = (arr, kind) => (arr || []).map(r => ({
      type: kind,
      name: r.name,
      provider: 'google',
      providerId: r.place_id,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      address: r.vicinity,
      rating: r.rating,
      openNow: r.opening_hours?.open_now,
    }));

    res.json({ success: true, data: {
      hospitals: mapRes(hosp.data.results, 'hospital'),
      embassies: mapRes(emb.data.results, 'embassy')
    }});
  } catch (e) {
    console.error('Emergency info error:', e?.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Error fetching emergency info' });
  }
});

module.exports = router;
