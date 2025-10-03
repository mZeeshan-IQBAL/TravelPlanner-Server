const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables (support selecting a specific env file)
const envPath = process.env.ENV_FILE || path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
console.log(`Loaded environment from ${envPath}`);

// Import routes
const authRoutes = require('./routes/auth');
const countryRoutes = require('./routes/countries');
const weatherRoutes = require('./routes/weather');
const imageRoutes = require('./routes/images');
const tripRoutes = require('./routes/trips');
const userRoutes = require('./routes/users');
const placesRoutes = require('./routes/places');
const directionsRoutes = require('./routes/directions');
const currencyRoutes = require('./routes/currency');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const toolsRoutes = require('./routes/tools');
const guidesRoutes = require('./routes/guides');
const hotelsRoutes = require('./routes/hotels');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security & core middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Default allowed origins for development
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ];
    
    // Use CLIENT_URL from environment or default to localhost origins
    const allowedOrigins = process.env.CLIENT_URL ? 
      process.env.CLIENT_URL.split(',').map(url => url.trim()) : 
      defaultOrigins;
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Rate limit API routes
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-planner')
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Attach Socket.IO
const { initSocket } = require('./socket');
// Use same CORS origins for Socket.IO as main app
const socketCorsOrigins = process.env.CLIENT_URL ? 
  process.env.CLIENT_URL.split(',').map(url => url.trim()) : 
  defaultOrigins;

const io = initSocket(server, {
  cors: {
    origin: socketCorsOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/directions', directionsRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/guides', guidesRoutes);
app.use('/api/hotels', hotelsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Travel Planner API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err 
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Optional notifications cron
if (process.env.ENABLE_NOTIFICATIONS === 'true') {
  try { require('./cron').init(app); } catch (e) { console.warn('Failed to init cron:', e?.message || e); }
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
