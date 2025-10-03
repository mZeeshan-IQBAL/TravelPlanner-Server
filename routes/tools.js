const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/tools/packing
// Body: { destination, durationDays, weather: { avgTempC, condition }, interests: [] }
router.post('/packing', auth, async (req, res) => {
  try {
    const { destination, durationDays = 3, weather = {}, interests = [] } = req.body;
    const days = Math.max(1, parseInt(durationDays) || 3);

    const base = [
      'Passport/ID', 'Wallet & Cards', 'Phone & Charger', 'Medications', 'Toiletries Kit',
      `${days}x Underwear`, `${Math.ceil(days/2)}x Socks`, `${Math.ceil(days/2)}x Tops`, '1x Comfortable Shoes'
    ];

    if (weather.avgTempC !== undefined) {
      if (weather.avgTempC < 10) base.push('Jacket/Coat', 'Warm Hat', 'Gloves');
      else if (weather.avgTempC > 25) base.push('Sunscreen', 'Hat/Cap', 'Sunglasses');
    }

    if ((weather.condition || '').toLowerCase().includes('rain')) base.push('Umbrella/Raincoat');

    if (interests.includes('hiking')) base.push('Hiking Shoes', 'Daypack', 'Reusable Water Bottle');
    if (interests.includes('beach')) base.push('Swimwear', 'Flip Flops', 'Beach Towel');

    res.json({ success: true, data: { destination, durationDays: days, items: base } });
  } catch (e) {
    console.error('Packing generator error:', e);
    res.status(500).json({ success: false, message: 'Failed to generate checklist' });
  }
});

module.exports = router;
