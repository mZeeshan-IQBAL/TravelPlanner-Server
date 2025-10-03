const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your-default-secret',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email 
          ? 'User with this email already exists' 
          : 'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate auth token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors[0] });
    }

    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        searchHistory: user.searchHistory,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        searchHistory: req.user.searchHistory,
        role: req.user.role,
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/search-history
// @desc    Add country to search history
// @access  Private
router.post('/search-history', auth, async (req, res) => {
  try {
    const { country } = req.body;
    
    if (!country) {
      return res.status(400).json({ message: 'Country name is required' });
    }

    await req.user.addToSearchHistory(country);
    
    res.json({
      message: 'Search history updated',
      searchHistory: req.user.searchHistory
    });

  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ message: 'Server error updating search history' });
  }
});


// @route   POST /api/auth/request-password-reset
// @desc    Send password reset link
// @access  Public
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ message: 'If that account exists, a reset link has been sent' });
    const token = user.generatePasswordReset();
    await user.save();
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    console.log('Reset your password at:', resetUrl);
    res.json({ message: 'Password reset link sent (check server logs in dev)' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Failed to send password reset link' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// @route   POST /api/auth/google
// @desc    Google OAuth login (placeholder)
// @access  Public
router.post('/google', async (req, res) => {
  return res.status(501).json({ message: 'Google OAuth not configured' });
});

// Bootstrap or secret-guarded self-promotion to admin
// Usage:
// - If no admin users exist: any authenticated user can call once to become admin.
// - If at least one admin exists: requires PROMOTE_SECRET (body.secret or ?secret=...)
router.post('/promote-me', auth, async (req, res) => {
  try {
    const hasAdmin = await User.exists({ role: 'admin' });

    if (hasAdmin) {
      const provided = req.body?.secret || req.query?.secret;
      const expected = process.env.PROMOTE_SECRET || '';
      if (!expected || provided !== expected) {
        return res.status(403).json({ success: false, message: 'Promotion not allowed. Invalid or missing secret.' });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = 'admin';
    await user.save();

    return res.json({ success: true, message: 'User promoted to admin', data: { role: user.role } });
  } catch (error) {
    console.error('Promote self error:', error);
    res.status(500).json({ success: false, message: 'Failed to promote user' });
  }
});

module.exports = router;
