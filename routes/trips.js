const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/trips
// @desc    Get all trips for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', favorite } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    
    // Build query
    let query = { user: req.user._id };
    
    if (favorite === 'true') {
      query.isFavorite = true;
    }
    
    // Build sort object
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const trips = await Trip.find(query)
      .sort(sortObj)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .populate('user', 'username email');

    const totalTrips = await Trip.countDocuments(query);
    const totalPages = Math.ceil(totalTrips / limitNum);

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalTrips,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching trips' 
    });
  }
});

// @route   GET /api/trips/:id
// @desc    Get single trip by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('user', 'username email');

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    res.json({
      success: true,
      data: trip
    });

  } catch (error) {
    console.error('Get trip error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid trip ID' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching trip' 
    });
  }
});

// @route   POST /api/trips
// @desc    Create new trip
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      country,
      weather,
      images,
      notes,
      plannedDates,
      isFavorite
    } = req.body;

    // Validation
    if (!title || !country?.name) {
      return res.status(400).json({ 
        success: false,
        message: 'Title and country name are required' 
      });
    }

    const tripData = {
      user: req.user._id,
      title,
      country,
      notes: notes || '',
      isFavorite: isFavorite || false
    };

    // Add optional data if provided
    if (weather) tripData.weather = weather;
    if (images) tripData.images = images;
    if (plannedDates) tripData.plannedDates = plannedDates;

    const trip = new Trip(tripData);
    await trip.save();

    // Populate user info for response
    await trip.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: trip
    });

  } catch (error) {
    console.error('Create trip error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: errors[0] 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error creating trip' 
    });
  }
});

// @route   PUT /api/trips/:id
// @desc    Update trip
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      title,
      country,
      weather,
      images,
      notes,
      plannedDates,
      isFavorite
    } = req.body;

    // Find trip
    let trip = await Trip.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Update fields
    if (title !== undefined) trip.title = title;
    if (country !== undefined) trip.country = country;
    if (weather !== undefined) trip.weather = weather;
    if (images !== undefined) trip.images = images;
    if (notes !== undefined) trip.notes = notes;
    if (plannedDates !== undefined) trip.plannedDates = plannedDates;
    if (isFavorite !== undefined) trip.isFavorite = isFavorite;

    await trip.save();
    await trip.populate('user', 'username email');

    res.json({
      success: true,
      message: 'Trip updated successfully',
      data: trip
    });

  } catch (error) {
    console.error('Update trip error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid trip ID' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: errors[0] 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error updating trip' 
    });
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });

  } catch (error) {
    console.error('Delete trip error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid trip ID' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error deleting trip' 
    });
  }
});

// @route   PATCH /api/trips/:id/favorite
// @desc    Toggle favorite status of trip
// @access  Private
router.patch('/:id/favorite', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    trip.isFavorite = !trip.isFavorite;
    await trip.save();

    res.json({
      success: true,
      message: `Trip ${trip.isFavorite ? 'added to' : 'removed from'} favorites`,
      data: { isFavorite: trip.isFavorite }
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid trip ID' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error updating favorite status' 
    });
  }
});

// @route   GET /api/trips/stats/overview
// @desc    Get trip statistics for user dashboard
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get basic counts
    const totalTrips = await Trip.countDocuments({ user: userId });
    const favoriteTrips = await Trip.countDocuments({ user: userId, isFavorite: true });
    
    // Get countries visited (unique)
    const countriesVisited = await Trip.distinct('country.name', { user: userId });
    
    // Get recent trips
    const recentTrips = await Trip.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title country.name country.flag createdAt');
    
    // Get trips by month for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const tripsOverTime = await Trip.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalTrips,
        favoriteTrips,
        countriesCount: countriesVisited.length,
        recentTrips,
        tripsOverTime,
        countriesVisited: countriesVisited.slice(0, 10) // Limit for performance
      }
    });

  } catch (error) {
    console.error('Get trip stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching trip statistics' 
    });
  }
});

// @route   POST /api/trips/bulk-delete
// @desc    Delete multiple trips
// @access  Private
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { tripIds } = req.body;

    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Trip IDs array is required' 
      });
    }

    if (tripIds.length > 50) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete more than 50 trips at once' 
      });
    }

    const result = await Trip.deleteMany({
      _id: { $in: tripIds },
      user: req.user._id
    });

    res.json({
      success: true,
      message: `${result.deletedCount} trip(s) deleted successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting trips' 
    });
  }
});

module.exports = router;