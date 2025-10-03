const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const User = require('../models/User');
const Trip = require('../models/Trip');

const router = express.Router();

// Apply auth + admin for all admin routes
router.use(auth, adminOnly);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password -verificationToken -resetPasswordToken -resetPasswordExpires').limit(200);
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user','admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// GET /api/admin/trips
router.get('/trips', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const trips = await Trip.find().sort({ createdAt: -1 }).skip((p-1)*l).limit(l).select('title country.name user isFavorite createdAt');
    const total = await Trip.countDocuments();
    res.json({ success: true, data: { trips, pagination: { currentPage: p, totalPages: Math.ceil(total/l), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list trips' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const popular = await Trip.aggregate([
      { $group: { _id: '$country.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const topUsers = await Trip.aggregate([
      { $group: { _id: '$user', trips: { $sum: 1 } } },
      { $sort: { trips: -1 } },
      { $limit: 10 }
    ]);
    res.json({ success: true, data: { popularDestinations: popular, topUsers } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

module.exports = router;
