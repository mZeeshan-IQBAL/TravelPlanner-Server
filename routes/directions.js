const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /api/directions/route?coords=lng,lat;lng,lat;...&profile=driving
// Uses OSRM public API. For production, consider self-hosting or Mapbox/Google.
router.get('/route', async (req, res) => {
  try {
    const { coords, profile = 'driving' } = req.query;
    if (!coords) {
      return res.status(400).json({ success: false, message: 'coords query param is required: lng,lat;lng,lat' });
    }
    const clean = String(coords).trim();
    const url = `https://router.project-osrm.org/route/v1/${encodeURIComponent(profile)}/${encodeURIComponent(clean)}?overview=full&geometries=geojson`;
    const resp = await axios.get(url, { timeout: 10000 });

    const route = resp.data?.routes?.[0];
    if (!route) {
      return res.status(400).json({ success: false, message: 'No route found' });
    }

    const distanceKm = (route.distance || 0) / 1000;
    const durationMin = (route.duration || 0) / 60;

    return res.json({
      success: true,
      data: {
        geometry: route.geometry, // GeoJSON LineString
        distanceKm,
        durationMin,
      }
    });
  } catch (error) {
    console.error('Directions route error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Error computing route' });
  }
});

module.exports = router;
