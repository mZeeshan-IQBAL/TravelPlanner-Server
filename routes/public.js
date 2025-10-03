const express = require('express');
const crypto = require('crypto');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

const router = express.Router();

// Enable public sharing and generate token
router.post('/trips/:id/public/enable', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (String(trip.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only owner can enable public sharing' });
    const token = crypto.randomBytes(16).toString('hex');
    trip.publicShare = { enabled: true, token };
    await trip.save();
    res.json({ success: true, data: { token } });
  } catch (e) {
    console.error('Enable public share error:', e);
    res.status(500).json({ success: false, message: 'Failed to enable public share' });
  }
});

// Disable public sharing
router.post('/trips/:id/public/disable', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (String(trip.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only owner can disable public sharing' });
    trip.publicShare = { enabled: false, token: undefined };
    await trip.save();
    res.json({ success: true, message: 'Public sharing disabled' });
  } catch (e) {
    console.error('Disable public share error:', e);
    res.status(500).json({ success: false, message: 'Failed to disable public share' });
  }
});

// Public fetch by token (no auth)
router.get('/public/trips/:token', async (req, res) => {
  try {
    const trip = await Trip.findOne({ 'publicShare.token': req.params.token, 'publicShare.enabled': true })
      .select('-members -comments -receipts')
      .lean();
    if (!trip) return res.status(404).json({ success: false, message: 'Invalid or disabled link' });
    // strip any sensitive user fields if present
    delete trip.user;
    res.json({ success: true, data: trip });
  } catch (e) {
    console.error('Public trip fetch error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch public trip' });
  }
});

module.exports = router;