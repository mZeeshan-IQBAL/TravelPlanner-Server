const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

const router = express.Router();

// Reorder itinerary
router.post('/:id/itinerary/reorder', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { order } = req.body; // array of itemIds in desired order
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order array is required' });
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const uid = String(req.user._id);
    const isOwner = String(trip.user) === uid;
    const isEditor = (trip.members || []).some(m => String(m.user) === uid && ['owner','editor'].includes(m.role));
    if (!isOwner && !isEditor) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const idToIndex = new Map(order.map((id, idx) => [String(id), idx]));
    trip.itinerary.forEach(item => {
      const idx = idToIndex.get(String(item._id));
      if (idx !== undefined) item.order = idx;
    });
    // sort by order
    trip.itinerary.sort((a, b) => (a.order || 0) - (b.order || 0));
    await trip.save();
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'itinerary:reordered', tripId: String(trip._id), order });
    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Itinerary reorder error:', error);
    res.status(500).json({ success: false, message: 'Error reordering itinerary' });
  }
});

// Share trip with teammate
router.post('/:id/share', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ success: false, message: 'Email and role are required' });
    const allowed = ['editor','viewer'];
    if (!allowed.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const userToAdd = await require('../models/User').findOne({ email: email.toLowerCase() });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found' });
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (String(trip.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only owner can share' });
    trip.members = trip.members || [];
    if (!trip.members.some(m => String(m.user) === String(userToAdd._id))) {
      trip.members.push({ user: userToAdd._id, role });
      await trip.save();
    }
    await trip.populate('members.user', 'username email');
    res.json({ success: true, message: 'Member added', data: trip.members });
  } catch (error) {
    console.error('Share trip error:', error);
    res.status(500).json({ success: false, message: 'Error sharing trip' });
  }
});

router.delete('/:id/share/:userId', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (String(trip.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only owner can remove members' });
    trip.members = (trip.members || []).filter(m => String(m.user) !== String(req.params.userId));
    await trip.save();
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'members:removed', tripId: String(trip._id), userId: String(req.params.userId) });
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Error removing member' });
  }
});

// Comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content required' });
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    trip.comments = trip.comments || [];
    trip.comments.push({ user: req.user._id, content: content.trim() });
    await trip.save();
    await trip.populate('comments.user', 'username email');
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'comments:added', tripId: String(trip._id), comment: trip.comments[trip.comments.length - 1] });
    res.status(201).json({ success: true, data: trip.comments });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const c = trip.comments.id(req.params.commentId);
    if (!c) return res.status(404).json({ success: false, message: 'Comment not found' });
    const uid = String(req.user._id);
    const canDelete = String(c.user) === uid || String(trip.user) === uid;
    if (!canDelete) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    c.remove();
    await trip.save();
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'comments:removed', tripId: String(trip._id), commentId: String(req.params.commentId) });
    res.json({ success: true, message: 'Comment removed' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Error deleting comment' });
  }
});

// Receipts upload
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const receiptsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.id}_${Date.now()}${ext}`);
  }
});
const receiptsUpload = multer({ storage: receiptsStorage });

router.post('/:id/receipts', auth, receiptsUpload.array('files', 10), async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const uid = String(req.user._id);
    const isOwner = String(trip.user) === uid;
    const isEditor = (trip.members || []).some(m => String(m.user) === uid && ['owner','editor'].includes(m.role));
    if (!isOwner && !isEditor) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const files = (req.files || []).map(f => ({ filename: `/uploads/receipts/${f.filename}`, originalName: f.originalname, size: f.size, mimeType: f.mimetype, uploadedBy: req.user._id }));
    trip.receipts = [...(trip.receipts || []), ...files];
    await trip.save();
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'receipts:uploaded', tripId: String(trip._id), count: files.length });
    res.status(201).json({ success: true, data: trip.receipts });
  } catch (error) {
    console.error('Upload receipts error:', error);
    res.status(500).json({ success: false, message: 'Error uploading receipts' });
  }
});

// @desc    Get all trips for authenticated user (owner or member)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', favorite } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    
    // Build query
    let query = { $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] };
    
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
      .populate('user', 'username email')
      .populate('members.user', 'username email');

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

// @route   GET /api/trips/search
// @desc    Advanced trip search
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const {
      q, // search query
      country,
      region,
      favorite,
      hasItinerary,
      minBudget,
      maxBudget,
      dateFrom,
      dateTo,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    // Build search query
    let query = {
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    };

    // Text search
    if (q) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { notes: { $regex: q, $options: 'i' } },
          { 'country.name': { $regex: q, $options: 'i' } }
        ]
      });
    }

    // Country filter
    if (country) {
      query['country.name'] = { $regex: country, $options: 'i' };
    }

    // Region filter
    if (region) {
      query['country.region'] = { $regex: region, $options: 'i' };
    }

    // Favorite filter
    if (favorite === 'true') {
      query.isFavorite = true;
    }

    // Itinerary filter
    if (hasItinerary === 'true') {
      query.itinerary = { $exists: true, $not: { $size: 0 } };
    }

    // Budget filters
    if (minBudget || maxBudget) {
      query['budget.totalEstimated'] = {};
      if (minBudget) query['budget.totalEstimated'].$gte = parseFloat(minBudget);
      if (maxBudget) query['budget.totalEstimated'].$lte = parseFloat(maxBudget);
    }

    // Date filters
    if (dateFrom || dateTo) {
      query.$or = query.$or || [];
      const dateQuery = {};
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
      
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'plannedDates.startDate': dateQuery },
          { 'plannedDates.endDate': dateQuery },
          { createdAt: dateQuery }
        ]
      });
    }

    // Build sort
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
      .populate('user', 'username email')
      .populate('members.user', 'username email');

    const total = await Trip.countDocuments(query);

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalTrips: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching trips'
    });
  }
});

// @route   GET /api/trips/:id
// @desc    Get single trip by ID (owner or member)
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      _id: req.params.id, 
      $or: [ { user: req.user._id }, { 'members.user': req.user._id } ]
    }).populate('user', 'username email').populate('members.user', 'username email');

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
      isFavorite: isFavorite || false,
      members: [{ user: req.user._id, role: 'owner' }]
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
    const io = req.app.get('io');
    const {
      title,
      country,
      weather,
      images,
      notes,
      plannedDates,
      isFavorite,
      budget
    } = req.body;

    // Find trip
    let trip = await Trip.findOne({ 
      _id: req.params.id, 
      $or: [ { user: req.user._id }, { 'members.user': req.user._id } ]
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Authorization: only owner/editor can modify
    const uid = String(req.user._id);
    const isOwner = String(trip.user) === uid;
    const isEditor = (trip.members || []).some(m => String(m.user) === uid && ['owner','editor'].includes(m.role));
    if (!isOwner && !isEditor) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Update fields
    if (title !== undefined) trip.title = title;
    if (country !== undefined) trip.country = country;
    if (weather !== undefined) trip.weather = weather;
    if (images !== undefined) trip.images = images;
    if (notes !== undefined) trip.notes = notes;
    if (plannedDates !== undefined) trip.plannedDates = plannedDates;
    if (isFavorite !== undefined) trip.isFavorite = isFavorite;
    if (budget !== undefined) trip.budget = budget;

    await trip.save();
    await trip.populate('user', 'username email');

    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'trip:updated', tripId: String(trip._id) });

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
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Only owner can delete
    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only owner can delete trip' });
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
    const io = req.app.get('io');
    const trip = await Trip.findOne({ 
      _id: req.params.id, 
      $or: [ { user: req.user._id }, { 'members.user': req.user._id } ]
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Only owner/editor can toggle favorite
    const uid = String(req.user._id);
    const isOwner = String(trip.user) === uid;
    const isEditor = (trip.members || []).some(m => String(m.user) === uid && ['owner','editor'].includes(m.role));
    if (!isOwner && !isEditor) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    trip.isFavorite = !trip.isFavorite;
    await trip.save();

    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'trip:favorite', tripId: String(trip._id), isFavorite: trip.isFavorite });

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

// @route   POST /api/trips/:id/itinerary
// @desc    Add itinerary item to a trip
// @access  Private
router.post('/:id/itinerary', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const { title, location, day, startTime, endTime, notes, status, lat, lng, cost } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    trip.itinerary = trip.itinerary || [];
    const nextOrder = trip.itinerary.length;
    trip.itinerary.push({ title, location, day, startTime, endTime, notes, status, lat, lng, cost, order: nextOrder });
    await trip.save();
    await trip.populate('user', 'username email');
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'itinerary:added', tripId: String(trip._id) });
    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    console.error('Add itinerary error:', error);
    res.status(500).json({ success: false, message: 'Error adding itinerary item' });
  }
});

// @route   PUT /api/trips/:id/itinerary/:itemId
// @desc    Update an itinerary item
// @access  Private
router.put('/:id/itinerary/:itemId', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const item = trip.itinerary.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    }
    const fields = ['title','location','day','startTime','endTime','notes','status','lat','lng','cost','order'];
    fields.forEach((f) => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
    await trip.save();
    await trip.populate('user', 'username email');
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'itinerary:updated', tripId: String(trip._id), itemId: String(req.params.itemId) });
    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Update itinerary error:', error);
    res.status(500).json({ success: false, message: 'Error updating itinerary item' });
  }
});

// @route   DELETE /api/trips/:id/itinerary/:itemId
// @desc    Delete an itinerary item
// @access  Private
router.delete('/:id/itinerary/:itemId', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const item = trip.itinerary.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    }
    item.remove();
    await trip.save();
    await trip.populate('user', 'username email');
    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'itinerary:deleted', tripId: String(trip._id), itemId: String(req.params.itemId) });
    res.json({ success: true, message: 'Itinerary item deleted', data: trip });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    res.status(500).json({ success: false, message: 'Error deleting itinerary item' });
  }
});

// Expenses CRUD
router.get('/:id/expenses', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip.expenses || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching expenses' });
  }
});

router.post('/:id/expenses', auth, async (req, res) => {
  try {
    const { title, amount, category, date, notes, currency } = req.body;
    if (!title || typeof amount !== 'number') return res.status(400).json({ success: false, message: 'title and amount required' });
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    trip.expenses = trip.expenses || [];
    trip.expenses.push({ title, amount, category, date, notes, currency });
    await trip.save();
    res.status(201).json({ success: true, data: trip.expenses });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error adding expense' });
  }
});

router.delete('/:id/expenses/:expenseId', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const e = trip.expenses.id(req.params.expenseId);
    if (!e) return res.status(404).json({ success: false, message: 'Expense not found' });
    e.remove();
    await trip.save();
    res.json({ success: true, data: trip.expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting expense' });
  }
});

// @route   GET /api/trips/stats/overview
// @desc    Get user's trip statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Aggregate statistics
    const stats = await Trip.aggregate([
      { $match: { $or: [{ user: userId }, { 'members.user': userId }] } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          favoriteTrips: {
            $sum: { $cond: [{ $eq: ['$isFavorite', true] }, 1, 0] }
          },
          countriesVisited: { $addToSet: '$country.name' },
          totalItineraryItems: {
            $sum: { $size: { $ifNull: ['$itinerary', []] } }
          },
          totalBudget: {
            $sum: { $ifNull: ['$budget.totalEstimated', 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTrips: 1,
          favoriteTrips: 1,
          uniqueCountries: { $size: '$countriesVisited' },
          totalItineraryItems: 1,
          totalBudget: 1
        }
      }
    ]);

    // Recent trips
    const recentTrips = await Trip.find({
      $or: [{ user: userId }, { 'members.user': userId }]
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('user', 'username email')
      .select('title country.name updatedAt isFavorite');

    // Most visited regions
    const regionStats = await Trip.aggregate([
      { $match: { $or: [{ user: userId }, { 'members.user': userId }] } },
      { $group: { _id: '$country.region', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTrips: 0,
          favoriteTrips: 0,
          uniqueCountries: 0,
          totalItineraryItems: 0,
          totalBudget: 0
        },
        recentTrips,
        topRegions: regionStats
      }
    });

  } catch (error) {
    console.error('Get trip statistics error:', error);
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
    
    if (!Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Trip IDs array is required'
      });
    }

    // Find trips where user is owner
    const trips = await Trip.find({
      _id: { $in: tripIds },
      user: req.user._id
    });

    if (trips.length !== tripIds.length) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete trips you own'
      });
    }

    await Trip.deleteMany({
      _id: { $in: tripIds },
      user: req.user._id
    });

    res.json({
      success: true,
      message: `${trips.length} trip(s) deleted successfully`
    });

  } catch (error) {
    console.error('Bulk delete trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trips'
    });
  }
});


// @route   POST /api/trips/:id/duplicate
// @desc    Duplicate a trip
// @access  Private
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const originalTrip = await Trip.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    });

    if (!originalTrip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Create duplicate with modified title
    const duplicate = new Trip({
      user: req.user._id,
      title: `${originalTrip.title} (Copy)`,
      country: originalTrip.country,
      weather: originalTrip.weather,
      images: originalTrip.images,
      notes: originalTrip.notes,
      budget: originalTrip.budget,
      itinerary: originalTrip.itinerary.map(item => ({
        title: item.title,
        location: item.location,
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime,
        notes: item.notes,
        status: 'planned', // Reset status
        order: item.order,
        lat: item.lat,
        lng: item.lng,
        cost: item.cost
      })),
      members: [{ user: req.user._id, role: 'owner' }],
      isFavorite: false
    });

    await duplicate.save();
    await duplicate.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Trip duplicated successfully',
      data: duplicate
    });

  } catch (error) {
    console.error('Duplicate trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating trip'
    });
  }
});

// @route   GET /api/trips/:id/export
// @desc    Export trip data as JSON
// @access  Private
router.get('/:id/export', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    })
      .populate('user', 'username email')
      .populate('members.user', 'username email')
      .populate('comments.user', 'username email');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Clean up sensitive data
    const exportData = {
      title: trip.title,
      country: trip.country,
      weather: trip.weather,
      images: trip.images,
      notes: trip.notes,
      plannedDates: trip.plannedDates,
      budget: trip.budget,
      itinerary: trip.itinerary,
      isFavorite: trip.isFavorite,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      exportedAt: new Date(),
      exportedBy: {
        username: req.user.username,
        email: req.user.email
      }
    };

    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);

  } catch (error) {
    console.error('Export trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting trip'
    });
  }
});

module.exports = router;
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

// Duplicate a day's items to another day
router.post('/:id/days/duplicate', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { fromDay, toDay } = req.body;
    const f = parseInt(fromDay, 10);
    const t = parseInt(toDay, 10);
    if (!f || !t || f < 1 || t < 1) {
      return res.status(400).json({ success: false, message: 'fromDay and toDay must be positive integers' });
    }
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const items = (trip.itinerary || []).filter(i => (i.day || 1) === f);
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'No items in source day' });
    }

    const maxOrder = (trip.itinerary || [])
      .filter(i => (i.day || 1) === t)
      .reduce((m, i) => Math.max(m, i.order || 0), -1);

    items.forEach((i, idx) => {
      const copy = {
        title: i.title,
        location: i.location,
        day: t,
        startTime: i.startTime,
        endTime: i.endTime,
        notes: i.notes,
        status: i.status || 'planned',
        order: maxOrder + 1 + idx,
        lat: i.lat,
        lng: i.lng,
        cost: i.cost,
      };
      trip.itinerary.push(copy);
    });

    await trip.save();
    await trip.populate('user', 'username email');

    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'day:duplicated', tripId: String(trip._id), fromDay: f, toDay: t });
    return res.json({ success: true, message: 'Day duplicated', data: trip });
  } catch (error) {
    console.error('Duplicate day error:', error);
    return res.status(500).json({ success: false, message: 'Error duplicating day' });
  }
});

// Delete a day; optionally renumber following days
router.post('/:id/days/delete', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const { day, renumber } = req.body;
    const d = parseInt(day, 10);
    if (!d || d < 1) {
      return res.status(400).json({ success: false, message: 'day must be a positive integer' });
    }
    const trip = await Trip.findOne({ _id: req.params.id, $or: [ { user: req.user._id }, { 'members.user': req.user._id } ] });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    // Remove items for the day
    trip.itinerary = (trip.itinerary || []).filter(i => (i.day || 1) !== d);

    if (renumber) {
      // Decrement day for items after the deleted day
      (trip.itinerary || []).forEach(i => {
        if ((i.day || 1) > d) i.day = (i.day || 1) - 1;
      });
      // Reassign order within each day
      const byDay = new Map();
      (trip.itinerary || []).forEach(i => {
        const key = i.day || 1;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(i);
      });
      byDay.forEach((arr) => {
        arr.sort((a,b) => (a.order||0) - (b.order||0));
        arr.forEach((i, idx) => { i.order = idx; });
      });
    }

    await trip.save();
    await trip.populate('user', 'username email');

    if (io) io.to(`trip:${trip._id}`).emit('trip:update', { type: 'day:deleted', tripId: String(trip._id), day: d, renumber: !!renumber });
    return res.json({ success: true, message: 'Day deleted', data: trip });
  } catch (error) {
    console.error('Delete day error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting day' });
  }
});

const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// @route   GET /api/trips/:id/export.pdf
// @desc    Export itinerary to PDF
// @access  Private
router.get('/:id/export.pdf', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text(trip.title, { underline: true });
    doc.moveDown();
    const itemsByDay = {};
    (trip.itinerary || []).forEach(i => {
      const d = i.day || 1; if (!itemsByDay[d]) itemsByDay[d] = []; itemsByDay[d].push(i);
    });
    Object.keys(itemsByDay).sort((a,b)=>a-b).forEach(day => {
      doc.fontSize(14).text(`Day ${day}`, { continued: false });
      doc.moveDown(0.5);
      itemsByDay[day].sort((a,b)=>(a.order||0)-(b.order||0)).forEach((i, idx) => {
        doc.fontSize(11).text(`${idx+1}. ${i.title} ${i.location ? '('+i.location+')' : ''}`);
      });
      doc.moveDown();
    });
    doc.end();
  } catch (e) {
    console.error('Export PDF error:', e);
    res.status(500).json({ success: false, message: 'Failed to export PDF' });
  }
});

// @route   GET /api/trips/:id/export.csv
// @desc    Export itinerary to CSV
// @access  Private
router.get('/:id/export.csv', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const rows = (trip.itinerary || []).sort((a,b)=>(a.day||1)-(b.day||1) || (a.order||0)-(b.order||0)).map(i => ({
      day: i.day || 1,
      title: i.title,
      location: i.location || '',
      startTime: i.startTime || '',
      endTime: i.endTime || '',
      notes: i.notes || '',
      lat: i.lat || '',
      lng: i.lng || '',
      cost: i.cost || 0,
    }));
    const parser = new Parser({ fields: ['day','title','location','startTime','endTime','notes','lat','lng','cost'] });
    const csv = parser.parse(rows);
    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) {
    console.error('Export CSV error:', e);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// @route   GET /api/trips/:id/export.xlsx
// @desc    Export itinerary to Excel (.xlsx)
// @access  Private
router.get('/:id/export.xlsx', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Itinerary');

    ws.columns = [
      { header: 'Day', key: 'day', width: 6 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Latitude', key: 'lat', width: 12 },
      { header: 'Longitude', key: 'lng', width: 12 },
      { header: 'Cost', key: 'cost', width: 10 }
    ];

    const rows = (trip.itinerary || [])
      .sort((a,b)=>(a.day||1)-(b.day||1) || (a.order||0)-(b.order||0))
      .map(i => ({
        day: i.day || 1,
        title: i.title,
        location: i.location || '',
        startTime: i.startTime || '',
        endTime: i.endTime || '',
        notes: i.notes || '',
        lat: i.lat || '',
        lng: i.lng || '',
        cost: i.cost || 0,
      }));

    ws.addRows(rows);

    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Export XLSX error:', e);
    res.status(500).json({ success: false, message: 'Failed to export XLSX' });
  }
});

module.exports = router;
