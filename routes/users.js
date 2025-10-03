const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Multer storage for avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Ensure uploads folders exist (best-effort)
router.use((req, res, next) => {
  try {
    const fs = require('fs');
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {}
  next();
});

// GET /api/users/me - get profile
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
  res.json({ user });
});

// PATCH /api/users/me - update profile (username only for now)
router.patch('/me', auth, async (req, res) => {
  try {
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST /api/users/me/avatar - upload avatar
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatarUrl: relativePath }, { new: true }).select('-password');
    res.json({ message: 'Avatar updated', avatarUrl: relativePath, user });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

module.exports = router;