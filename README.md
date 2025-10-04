# Travel Planner — Server (Node/Express)

A secure and pragmatic Express API for the Travel Planner app. Provides auth, trips, images, weather, hotels (Amadeus), places (Nominatim/Overpass/Wikipedia), and realtime collaboration (Socket.IO).

This document covers setup, environment variables, notable endpoints, and development tips.

## Quick start

1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill values (see Env reference below)

3. Start the API

```bash
# development (with nodemon)
npm run dev

# production
npm start
```

The server listens on `PORT` (default 5000). Health check: `GET /api/health`.

## Environment variables

Only variables actually used by code are listed. Values below are examples.

```dotenv
# Core
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/travel-planner
JWT_SECRET=super-secret-change-me

# CORS (comma-separated list if multiple)
CLIENT_URL=http://localhost:3000

# Cloudinary (server uploads, avatars)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Weather (OpenWeather)
OPENWEATHER_API_KEY=
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Images (Unsplash)
UNSPLASH_ACCESS_KEY=

# Places (OpenStreetMap)
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=TravelPlanner/1.0
NOMINATIM_EMAIL=
NOMINATIM_LIMIT=5
NOMINATIM_FORMAT=json

OVERPASS_BASE_URL=https://overpass-api.de/api/interpreter
OVERPASS_TIMEOUT=25
OVERPASS_OUTPUT_FORMAT=json

WIKIPEDIA_BASE_URL=https://en.wikipedia.org/w/api.php
WIKIPEDIA_FORMAT=json
WIKIPEDIA_EXINTRO=true
WIKIPEDIA_EXPLAINTEXT=true
WIKIPEDIA_THUMB_SIZE=500

# AI (OpenRouter)
OPENROUTER_API_KEY=

# Amadeus (Hotels)
AMADEUS_ENVIRONMENT=test  # or production
AMADEUS_API_KEY=
AMADEUS_API_SECRET=

# SMTP email for notifications (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Travel Planner <no-reply@example.com>"
ENABLE_NOTIFICATIONS=false
NOTIFY_DAYS_AHEAD=2
```

Notes
- The server exposes `GET /api/public-config` for the client to fetch non‑sensitive runtime settings (e.g., Cloudinary cloud name and preset).
- In development, the client (CRA) uses a proxy so CORS is less of a concern. In production, set `CLIENT_URL` appropriately.

## Key features & modules

- Auth: registration, login, current user, password reset token flow (JWT bearer token)
- Trips: CRUD, itinerary items, sharing, expenses, stats
- Public sharing: enable/disable; fetch trip by token
- Weather (OpenWeather): current, 5‑day forecast, by city or coordinates
- Images (Unsplash): search and country-specific image helper
- Places (Nominatim, Overpass, Wikipedia): geocoding, POIs, article summaries
- AI itinerary (OpenRouter): optional; rule‑based fallback if no key
- Avatars (Cloudinary): upload/transform via server; client displays via Cloudinary URL-gen
- Realtime (Socket.IO): room‑based trip collaboration events, notifications, presence
- Rate limiting (express-rate-limit): applied to `/api` path
- Security (helmet, JWT middleware)

## Important endpoints (non-exhaustive)

- Health/config
  - `GET /api/health` — service is up
  - `GET /api/public-config` — `{ cloudinaryCloudName, cloudinaryUploadPreset }`

- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me` (Bearer token)
  - `POST /api/auth/search-history` (adds a country to user’s history)
  - Password reset: `POST /api/auth/request-password-reset`, `POST /api/auth/reset-password`

- Trips
  - `GET /api/trips` `POST /api/trips` `GET /api/trips/:id` `PUT /api/trips/:id` `DELETE /api/trips/:id`
  - Itinerary: add/update/delete/reorder (`/api/trips/:id/itinerary/*`)
  - Sharing: `/api/trips/:id/public/enable|disable`, public GET `/api/public/trips/:token`
  - Favorites, expenses, stats, collaboration helpers

- Weather
  - `GET /api/weather/current/:city`
  - `GET /api/weather/forecast/:city`
  - `GET /api/weather/coordinates?lat=..&lon=..`

- Images
  - `GET /api/images/search/:query`
  - `GET /api/images/country/:country`

- AI
  - `POST /api/ai/itinerary` — optional OpenRouter; falls back to rule-based generator

- Hotels (Amadeus)
  - `GET /api/hotels/search`
  - `GET /api/hotels/offers`
  - `GET /api/hotels/cities`
  - Notes: In TEST environment, Amadeus is limited — this server returns sample data when live API calls fail.

## Development notes

- Proxy-aware rate limiting: `app.set('trust proxy', 1)` is enabled to make `express-rate-limit` work correctly behind the CRA proxy/dev reverse proxies.
- CORS is configured to allow PATCH and normalize origins; dev console will log origins not in the allowlist but still permits them in development.
- A simple request logger runs in non‑production for visibility.
- The server intentionally avoids storing secrets in the repo and relies on `.env`.

## Running with the client

- Start server on port 5000
- Start client on port 3000 (CRA proxy forwards `/api/*` to server)
- The client will call `/api/auth/*`, `/api/weather/*`, `/api/public-config`, etc.

## Deployment

- Use `npm run build` on the client to produce static files and host them on your preferred static host.
- Deploy this server to your own Node-friendly environment (Render, Railway, Fly.io, Heroku-like platforms, or a VM/container). Ensure environment variables are set.
- Configure `CLIENT_URL` for CORS.

## Troubleshooting

- 401 from protected endpoints — ensure you send `Authorization: Bearer <JWT>`
- 404 from expected routes — confirm the path under `/api` and server console logs (a dev logger is enabled)
- Weather/Images errors — confirm `OPENWEATHER_API_KEY` and `UNSPLASH_ACCESS_KEY` exist
- Amadeus errors — TEST environment is limited; the server automatically provides sample data as fallback
- Cloudinary upload errors — ensure `CLOUDINARY_*` vars are set

---

Made with ❤️ for travel planning.
