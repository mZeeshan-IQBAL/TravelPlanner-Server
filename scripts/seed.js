/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Resolve env file (ENV_FILE can override)
const envPath = process.env.ENV_FILE || path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
console.log(`Using env: ${envPath}`);

const User = require('../models/User');
const Trip = require('../models/Trip');

// Parse CLI args like --email=foo --count=5
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.split('=');
  if (k && v) acc[k.replace(/^--/, '')] = v;
  return acc;
}, {});

const SEED_EMAIL = process.env.SEED_EMAIL || args.email || null;
const SEED_COUNT = parseInt(process.env.SEED_COUNT || args.count || '6', 10);

const samples = [
  {
    title: 'Paris Getaway',
    country: {
      name: 'France',
      capital: 'Paris',
      region: 'Europe',
      languages: ['French'],
      timezones: ['UTC+01:00'],
    },
    notes: 'Eiffel Tower, Louvre, and croissants!'
  },
  {
    title: 'Tokyo Adventure',
    country: {
      name: 'Japan',
      capital: 'Tokyo',
      region: 'Asia',
      languages: ['Japanese'],
      timezones: ['UTC+09:00'],
    },
    notes: 'Shinjuku, Akihabara, and sushi.'
  },
  {
    title: 'New York City Break',
    country: {
      name: 'United States',
      capital: 'Washington, D.C.',
      region: 'Americas',
      languages: ['English'],
      timezones: ['UTC−05:00'],
    },
    notes: 'Times Square and Central Park.'
  },
  {
    title: 'Sydney Escape',
    country: {
      name: 'Australia',
      capital: 'Canberra',
      region: 'Oceania',
      languages: ['English'],
      timezones: ['UTC+10:00'],
    },
    notes: 'Opera House and Bondi Beach.'
  },
  {
    title: 'Rome Classics',
    country: {
      name: 'Italy',
      capital: 'Rome',
      region: 'Europe',
      languages: ['Italian'],
      timezones: ['UTC+01:00'],
    },
    notes: 'Colosseum and Vatican Museums.'
  },
  {
    title: 'Reykjavik Northern Lights',
    country: {
      name: 'Iceland',
      capital: 'Reykjavík',
      region: 'Europe',
      languages: ['Icelandic'],
      timezones: ['UTC+00:00'],
    },
    notes: 'Blue Lagoon and aurora hunting.'
  }
];

function pickSamples(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ ...samples[i % samples.length] });
  }
  // add simple plannedDates spread
  const now = new Date();
  return out.map((t, idx) => ({
    ...t,
    plannedDates: {
      startDate: new Date(now.getTime() + idx * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + (idx + 3) * 24 * 60 * 60 * 1000),
    },
    isFavorite: idx % 2 === 0,
  }));
}

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-planner';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Resolve target user
    let user = null;
    if (SEED_EMAIL) {
      user = await User.findOne({ email: SEED_EMAIL.toLowerCase() });
      if (!user) {
        console.log(`No user found with email ${SEED_EMAIL}. Creating it...`);
        user = new User({ username: SEED_EMAIL.split('@')[0], email: SEED_EMAIL, password: 'Password123!' });
        await user.save();
        console.log(`Created user ${user.email} (password: Password123!)`);
      }
    } else {
      user = await User.findOne().sort({ createdAt: -1 });
      if (!user) {
        console.log('No users found. Creating demo user demo@example.com ...');
        user = new User({ username: 'demo', email: 'demo@example.com', password: 'Password123!' });
        await user.save();
        console.log('Created demo user demo@example.com (password: Password123!)');
      }
    }

    const items = pickSamples(SEED_COUNT);

    // Avoid duplicate titles for this user
    const existingTitles = new Set(
      (await Trip.find({ user: user._id }, 'title').lean()).map((t) => t.title)
    );

    const toInsert = items
      .filter((t) => !existingTitles.has(t.title))
      .map((t) => ({ ...t, user: user._id }));

    if (toInsert.length === 0) {
      console.log('No new trips to insert (all titles already exist for this user).');
      process.exit(0);
    }

    const res = await Trip.insertMany(toInsert);
    console.log(`Inserted ${res.length} trip(s) for user ${user.email}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
