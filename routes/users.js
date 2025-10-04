const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// Use memory storage; we'll stream the buffer to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

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

// POST /api/users/me/avatar - upload avatar (Cloudinary)
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Ensure Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: 'Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env and restart.' });
    }

    // Upload buffer to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `travel-planner/avatars/${req.user._id}`,
        transformation: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        tags: ['avatar', 'profile']
      },
      async (err, result) => {
        if (err) {
          console.error('Cloudinary upload error:', err);
          return res.status(500).json({ message: 'Failed to upload avatar' });
        }

        const secureUrl = result.secure_url;
        const publicId = result.public_id;
        const thumbUrl = cloudinary.url(publicId, { width: 50, height: 50, crop: 'fill', gravity: 'face', secure: true, fetch_format: 'auto', quality: 'auto' });
        const mediumUrl = cloudinary.url(publicId, { width: 100, height: 100, crop: 'fill', gravity: 'face', secure: true, fetch_format: 'auto', quality: 'auto' });

        // Delete previous avatar in Cloudinary if exists
        try {
          const prev = await User.findById(req.user._id).select('avatar.avatarPublicId avatar publicId');
          const prevPublicId = prev?.avatar?.publicId;
          if (prevPublicId && prevPublicId !== publicId) {
            cloudinary.uploader.destroy(prevPublicId).catch(() => {});
          }
        } catch (_) {}

        const user = await User.findByIdAndUpdate(
          req.user._id,
          { 
            avatarUrl: secureUrl, // legacy field for compatibility
            avatar: {
              publicId,
              url: secureUrl,
              thumbnailUrl: thumbUrl,
              mediumUrl,
              largeUrl: secureUrl
            }
          },
          { new: true }
        ).select('-password');

        return res.json({ message: 'Avatar updated', avatarUrl: secureUrl, avatar: user.avatar, user });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

module.exports = router;