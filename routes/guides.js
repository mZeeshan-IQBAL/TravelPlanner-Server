const express = require('express');
const Guide = require('../models/Guide');
const router = express.Router();

// Sample guides data - in production, this would come from a database
const SAMPLE_GUIDES = [
  {
    id: 'jp-1',
    title: 'Japan: Video Game Guide',
    excerpt: 'Visited Tokyo/Kyoto/Osaka twice, and loved it each time! My recommendations for arcades, game shops, and themed cafes.',
    content: `
# Japan: Video Game Guide

Having visited Tokyo, Kyoto, and Osaka twice, I've fallen in love with Japan's incredible gaming culture. This guide covers all the best spots for arcade enthusiasts, retro game hunters, and anyone interested in Japan's gaming scene.

## Tokyo Gaming Spots

### Akihabara Electric Town
The mecca of gaming and electronics in Tokyo. Must-visit spots:
- **Super Potato**: Multi-floor retro gaming paradise with rare finds
- **Mandarake**: Huge selection of vintage games and consoles
- **Traders**: Great for current generation games and accessories

### Shibuya
- **Shibuya Sky**: Not just for the view - they have a great arcade on the lower floors
- **Center Gai Arcades**: Multiple floors of rhythm games, claw machines, and more

## Kyoto Gaming Culture

While more traditional, Kyoto has hidden gaming gems:
- **Kyoto International Manga Museum**: Interactive gaming exhibits
- **Teramachi Shopping Street**: Several small game shops with local treasures

## Osaka Gaming Scene

Osaka's gaming culture is more casual but incredibly fun:
- **Den Den Town**: Osaka's answer to Akihabara
- **Dotonbori Arcades**: Perfect for evening gaming sessions

## Pro Tips

1. **Timing**: Visit arcades after 6 PM for the best atmosphere
2. **Language**: Download Google Translate camera feature for game menus
3. **Currency**: Bring lots of 100 yen coins for arcade games
4. **Etiquette**: Don't hog popular machines, be respectful of local players

## Budget

- Arcade games: ¥100-200 per play
- Retro games: ¥500-5000 depending on rarity
- Game cafes: ¥1000-2000 per hour

This guide represents countless hours of exploration and gaming. Each location has been personally visited and tested!
    `,
    cover: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1600&auto=format&fit=crop',
    location: 'Japan',
    tags: ['Japan', 'Tokyo', 'Kyoto', 'Osaka', 'Gaming', 'Arcades'],
    author: { name: 'Natalie Jiang', avatarUrl: 'https://i.pravatar.cc/100?img=5', id: 'natalie' },
    stats: { likes: 135, comments: 6, views: 201 },
    duration: '7-10 days',
    difficulty: 'Easy',
    bestTimeToVisit: 'March-May, September-November',
    created: '2023-10-15',
    featured: true
  },
  {
    id: 'jp-2',
    title: 'Pokémon Japan Guide',
    excerpt: 'If you\'re a mild Pokémon fan like me, this guide will get you to all the best shops and events across Japan.',
    content: `
# Pokémon Japan Guide

As a lifelong Pokémon fan, visiting Japan was like stepping into the Pokémon world itself. This guide covers all the essential Pokémon experiences across Japan.

## Tokyo Pokémon Spots

### Pokémon Center Mega Tokyo
The flagship store in Skytree Town is a must-visit:
- Exclusive merchandise not found elsewhere
- Interactive Pokémon experiences
- Photo opportunities with life-sized Pokémon

### Other Tokyo Centers
- **Shibuya**: Compact but well-stocked
- **Ikebukuro**: Great for Pokémon Sun & Moon items
- **Tokyo Station**: Perfect for last-minute souvenirs

## Osaka Pokémon Center

The Osaka location often has Kansai-exclusive items and is less crowded than Tokyo locations.

## Special Events and Experiences

### Pokémon Cafe
Located in Tokyo and Osaka:
- Reservation required (book weeks in advance)
- Themed food and drinks
- Exclusive cafe merchandise

### Detective Pikachu Experiences
Various locations offer Detective Pikachu themed activities and photo spots.

## Shopping Tips

1. **Exclusive Items**: Each center has location-specific merchandise
2. **Tax-Free Shopping**: Bring your passport for tax-free purchases over ¥5,000
3. **Limited Editions**: Check for seasonal and event-exclusive items
4. **Trading Cards**: Japan has exclusive TCG products and tournament promos

## Budget Estimate

- Pokémon Center merchandise: ¥500-8,000 per item
- Pokémon Cafe: ¥2,500-4,000 per person
- Transportation: ¥500-1,000 between locations
- Special events: ¥1,500-3,000

Perfect for Pokémon fans of all ages who want to experience the franchise in its home country!
    `,
    cover: 'https://images.unsplash.com/photo-1607968565040-b8be0aab160b?q=80&w=1600&auto=format&fit=crop',
    location: 'Tokyo, Japan',
    tags: ['Japan', 'Tokyo', 'Shopping', 'Pokemon', 'Anime'],
    author: { name: 'Anna', avatarUrl: 'https://i.pravatar.cc/100?img=12', id: 'anna' },
    stats: { likes: 24, comments: 3, views: 89 },
    duration: '3-5 days',
    difficulty: 'Easy',
    bestTimeToVisit: 'Year-round',
    created: '2023-09-22',
    featured: false
  },
  {
    id: 'ie-1',
    title: 'Ireland and Scotland Guide',
    excerpt: 'Spent 2 magical weeks, tasting my way through distilleries and hiking the highlands.',
    content: `
# Ireland and Scotland: A Celtic Adventure

Two weeks exploring the rugged beauty and rich culture of Ireland and Scotland. This guide covers the perfect route for whiskey lovers and hiking enthusiasts.

## Ireland Highlights

### Dublin
- **Guinness Storehouse**: Learn about Ireland's famous stout
- **Temple Bar**: Vibrant nightlife and traditional music
- **Trinity College**: See the Book of Kells

### Whiskey Trail
- **Jameson Distillery**: Classic Irish whiskey experience
- **Tullamore D.E.W.**: Smaller, more intimate tours
- **Bushmills**: Northern Ireland's oldest distillery

### Natural Wonders
- **Giant's Causeway**: UNESCO World Heritage hexagonal basalt columns
- **Cliffs of Moher**: Breathtaking Atlantic coast views
- **Ring of Kerry**: Scenic circular route through mountains and coast

## Scotland Adventures

### Edinburgh
- **Royal Mile**: Historic street from castle to palace
- **Arthur's Seat**: Hike for panoramic city views
- **Scotch Whisky Experience**: Perfect introduction to Scottish whisky

### Highlands
- **Isle of Skye**: Dramatic landscapes and hiking trails
- **Loch Ness**: Mysterious lake with castle ruins
- **Cairngorms National Park**: Wildlife and mountain scenery

### Whisky Regions
- **Speyside**: Elegant, complex whiskies
- **Islay**: Peaty, smoky single malts
- **Highland**: Diverse flavors from Scotland's largest region

## Planning Tips

1. **Transportation**: Rent a car for maximum flexibility
2. **Weather**: Pack layers and waterproof gear year-round
3. **Accommodation**: Book B&Bs and castles in advance
4. **Whisky Tours**: Many offer pickup/drop-off services

## Budget

- Car rental: £300-500 per week
- Accommodation: £60-150 per night
- Whisky tours: £20-80 per person
- Meals: £25-50 per person per day
- Activities: £10-30 per attraction

An unforgettable journey through landscapes that inspired countless legends and stories!
    `,
    cover: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1600&auto=format&fit=crop',
    location: 'Ireland & Scotland',
    tags: ['Ireland', 'Scotland', 'Road trip', 'Whiskey', 'Hiking'],
    author: { name: 'Savannah', avatarUrl: 'https://i.pravatar.cc/100?img=14', id: 'savannah' },
    stats: { likes: 67, comments: 8, views: 234 },
    duration: '14 days',
    difficulty: 'Moderate',
    bestTimeToVisit: 'May-September',
    created: '2023-08-10',
    featured: false
  },
  {
    id: 'us-bos',
    title: 'Boston Walking Tour',
    excerpt: 'Lived in the area for 2 years during college — this is my favorite half-day tour on foot.',
    content: `
# Boston Walking Tour

Having lived in Boston for 2 years during college, I've walked these historic streets countless times. This half-day walking tour covers the essential sites that make Boston unique.

## The Freedom Trail

### Boston Common to State House
- Start at America's oldest public park
- Walk up Beacon Hill to the State House
- Marvel at the cobblestone streets and historic architecture

### Old State House
- Site of the Boston Massacre
- Historic meeting place of colonial government
- Great photo opportunities

## North End Adventure

### Paul Revere House
- Oldest building in downtown Boston
- Learn about the famous midnight ride
- Explore the authentic colonial interior

### Old North Church
- "One if by land, two if by sea"
- Beautiful historic architecture
- Climb the tower for city views

## Harbor Walk

### Faneuil Hall & Quincy Market
- Historic meeting hall
- Great shopping and dining
- Street performers and local atmosphere

### Boston Tea Party Ships
- Interactive museum experience
- Throw tea into Boston Harbor
- Learn about the events leading to the Revolution

## Pro Tips

1. **Timing**: Start early (9 AM) to avoid crowds
2. **Footwear**: Wear comfortable walking shoes
3. **Weather**: Bring layers - Boston weather changes quickly
4. **Food**: Stop at North End for Italian food
5. **Photos**: Golden hour at Harbor Walk is stunning

## Local Favorites

- **Mike's Pastry**: Famous cannoli in North End
- **Union Oyster House**: America's oldest continuously operating restaurant
- **Boston Public Garden**: Swan boats and beautiful scenery

## Budget

- Walking tour: Free (self-guided)
- Museum entries: $10-20 each
- Food: $15-30 per meal
- Public transport: $2.40 per ride
- Souvenirs: $5-25

Total: $50-100 per person for the full experience

A perfect introduction to Boston's rich history and vibrant culture!
    `,
    cover: 'https://images.unsplash.com/photo-1505762801498-611b67fb21d8?q=80&w=1600&auto=format&fit=crop',
    location: 'Boston, USA',
    tags: ['USA', 'Boston', 'City Walk', 'History', 'Freedom Trail'],
    author: { name: 'Lucas', avatarUrl: 'https://i.pravatar.cc/100?img=7', id: 'lucas' },
    stats: { likes: 45, comments: 12, views: 312 },
    duration: '4-6 hours',
    difficulty: 'Easy',
    bestTimeToVisit: 'April-October',
    created: '2023-07-18',
    featured: true
  },
  {
    id: 'pr-1',
    title: 'Puerto Rico Guide',
    excerpt: 'A collection of the best-of since I grew up here. Beaches, food, and day trips.',
    content: `
# Puerto Rico: A Local's Guide

Growing up in Puerto Rico gave me the inside scoop on the best beaches, authentic food, and hidden gems that tourists usually miss. This guide shares my favorite spots across the island.

## San Juan Essentials

### Old San Juan
- **El Morro & San Cristóbal**: Historic Spanish fortresses
- **Paseo del Morro**: Stunning sunset views
- **Calle Fortaleza**: Colorful buildings and great shopping

### Modern San Juan
- **Condado Beach**: Perfect for swimming and sunbathing
- **La Placita**: Nightlife district with rooftop bars
- **Santurce**: Art galleries and hip restaurants

## Beach Paradise

### Culebra
- **Flamenco Beach**: Consistently rated world's best beaches
- **Snorkeling**: Crystal clear waters and coral reefs
- **Day trip**: Take the ferry from Fajardo

### Vieques
- **Bioluminescent Bay**: Magical nighttime kayaking
- **Sun Bay**: Less crowded than Flamenco
- **Wild horses**: Free-roaming horses on beaches

## Mountain Adventures

### El Yunque Rainforest
- **La Mina Falls**: Easy hike to beautiful waterfall
- **El Yunque Peak**: Challenging hike with panoramic views
- **Visitor Center**: Learn about the ecosystem

## Authentic Food

### Must-Try Dishes
- **Mofongo**: Fried plantains with garlic and pork
- **Alcapurrias**: Fritters with yautía and meat
- **Pasteles**: Puerto Rican tamales (especially at Christmas)
- **Jibarito**: Plantain sandwich

### Best Local Spots
- **Kiosks in Luquillo**: Beach food at its finest
- **La Ruta del Lechón**: Whole roasted pig route in Guavate
- **Piñones**: Beachside eateries with local specialties

## Cultural Experiences

### Music and Dance
- **Salsa classes**: Learn from the masters
- **Live music venues**: La Placita and Santurce
- **Festivals**: Check calendar for local celebrations

### Art and History
- **Museo de Arte de Puerto Rico**: Outstanding collection
- **Casa Blanca**: Historic house museum
- **Street art tours**: Santurce murals and installations

## Practical Tips

1. **Transportation**: Rent a car for exploring the island
2. **Language**: Spanish is primary, English widely spoken
3. **Currency**: US Dollar (no exchange needed for Americans)
4. **Weather**: Tropical year-round, pack light clothing
5. **Hurricane season**: June-November, check forecasts

## Budget (per day)

- Accommodation: $80-200
- Food: $25-60
- Activities: $20-100
- Transportation: $30-50
- Beach/hiking: Free!

## Insider Secrets

- **Avoid cruise ship days**: Check San Juan port schedule
- **Local festivals**: Ask locals about neighborhood celebrations
- **Hidden beaches**: Drive around - many gems aren't marked
- **Fresh fruit**: Try tropical fruits from roadside stands

Welcome to my beautiful island home! ¡Bienvenidos a Puerto Rico!
    `,
    cover: 'https://images.unsplash.com/photo-1526404079164-030a37b1b497?q=80&w=1600&auto=format&fit=crop',
    location: 'Puerto Rico',
    tags: ['Caribbean', 'Beaches', 'Culture', 'Food', 'Nature'],
    author: { name: 'Mariana', avatarUrl: 'https://i.pravatar.cc/100?img=49', id: 'mariana' },
    stats: { likes: 89, comments: 15, views: 456 },
    duration: '5-7 days',
    difficulty: 'Easy',
    bestTimeToVisit: 'December-April',
    created: '2023-06-25',
    featured: true
  },
  {
    id: 'hi-1',
    title: 'Maui Guide - 4 days in Hawaii',
    excerpt: 'Our favorite place — here\'s a short itinerary to maximize sunshine and beaches.',
    content: `
# Maui: 4 Days in Paradise

Maui has become our favorite Hawaiian island after multiple visits. This 4-day itinerary maximizes beach time while hitting the must-see spots that make Maui special.

## Day 1: West Maui

### Morning: Lahaina
- **Historic downtown**: Former whaling capital
- **Banyan Tree**: Massive tree covering entire city block
- **Front Street**: Shopping and restaurants

### Afternoon: Ka'anapali Beach
- **Beach time**: Perfect swimming and snorkeling
- **Whalers Village**: Upscale shopping and dining
- **Black Rock**: Great snorkeling spot

### Evening: Sunset at Napili Bay
- **Dinner**: Mama's Fish House (if you can get reservations)
- **Alternative**: Sea House Restaurant at Napili Bay

## Day 2: Road to Hana

### Early Start (6 AM)
- **Twin Falls**: Easy waterfall hike
- **Wai'anapanapa State Park**: Black sand beach
- **Hana town**: Small local community

### Key Stops
- **Bamboo Forest**: Short hike through bamboo groves
- **Seven Sacred Pools**: Swimming in natural pools
- **Red Sand Beach**: Hidden beach near Hana

### Return Journey
- **Tip**: Turn around at Hana - don't complete the full circle unless you have 4WD

## Day 3: Haleakala and Upcountry

### Sunrise at Haleakala (4:30 AM start)
- **Crater viewing**: 10,000-foot volcano summit
- **Reservations required**: Book well in advance
- **Dress warmly**: It's cold at summit!

### Upcountry Exploration
- **Kula Lavender Farm**: Beautiful gardens and views
- **Makawao town**: Cowboy town with local shops
- **Ali'i Kula Lavender**: More lavender and great lunch

### Afternoon: Beach Recovery
- **Wailea Beach**: Luxury resort area
- **Grand Wailea**: Day pass for pools and amenities

## Day 4: Snorkeling and Relaxation

### Morning: Molokini Crater
- **Snorkel tour**: Best snorkeling in Hawaii
- **Book early**: Popular tours sell out
- **What to expect**: Tropical fish and clear water

### Afternoon: Wailea or Kihei
- **Beach hopping**: Try different beaches
- **Shopping**: Shops at Wailea
- **Spa treatment**: Perfect way to end the trip

## Food Highlights

### Must-Try Local Foods
- **Poke**: Fresh raw fish salad
- **Shave ice**: Hawaiian snow cone
- **Plate lunch**: Local comfort food
- **Fresh fish**: Mahi-mahi, ono, or ahi

### Recommended Restaurants
- **Mama's Fish House**: Iconic but expensive
- **Da Kitchen**: Great local plate lunches
- **Kihei Caffe**: Best breakfast on the island
- **Monkeypod Kitchen**: Farm-to-table dining

## Practical Tips

1. **Car rental**: Essential - book early
2. **Accommodations**: West or South Maui are best
3. **Weather**: Windward side gets more rain
4. **Sunscreen**: Reef-safe only - protect the coral
5. **Reservations**: Book Haleakala sunrise in advance
6. **Snorkel gear**: Rent locally or bring your own

## Budget Estimate

- Accommodation: $200-400/night
- Car rental: $40-80/day
- Food: $50-150/person/day
- Activities: $50-150/person/day
- Gas: $30-50/day

## Packing Essentials

- Reef-safe sunscreen
- Light jacket for Haleakala
- Comfortable hiking shoes
- Snorkel gear (optional)
- Waterproof phone case
- Reusable water bottle

## Weather Notes

- **Dry side**: West and South (Lahaina, Wailea)
- **Wet side**: East and North (Hana, Haiku)
- **Elevation matters**: Cooler in upcountry
- **Trade winds**: Usually pleasant year-round

Aloha and enjoy your time in paradise! Maui no ka oi (Maui is the best)!
    `,
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
    location: 'Maui, Hawaii',
    tags: ['Hawaii', 'Beaches', 'Snorkeling', 'Road Trip', 'Nature'],
    author: { name: 'Ben', avatarUrl: 'https://i.pravatar.cc/100?img=37', id: 'ben' },
    stats: { likes: 156, comments: 23, views: 678 },
    duration: '4 days',
    difficulty: 'Easy',
    bestTimeToVisit: 'Year-round',
    created: '2023-05-30',
    featured: true
  }
];

// GET /api/guides - Get all guides with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      tag, 
      location, 
      difficulty,
      featured,
      limit = 20,
      skip = 0 
    } = req.query;

    let guides;
    let total;
    let fromDatabase = false;
    
    try {
      // Try to get guides from database first
      let query = { published: true };
      
      // Build database query
      if (search) {
        query.$text = { $search: search };
      }
      
      if (tag) {
        query.tags = { $regex: new RegExp(tag, 'i') };
      }
      
      if (location) {
        query.location = { $regex: new RegExp(location, 'i') };
      }
      
      if (difficulty) {
        query.difficulty = difficulty;
      }
      
      if (featured === 'true') {
        query.featured = true;
      }
      
      // Get total count
      total = await Guide.countDocuments(query);
      
      // Get guides with pagination
      guides = await Guide.find(query)
        .sort({ createdAt: -1, 'stats.likes': -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();
        
      fromDatabase = true;
      console.log(`Fetched ${guides.length} guides from database`);
    } catch (dbError) {
      console.warn('Database query failed, falling back to sample data:', dbError.message);
      
      // Fallback to sample data with filtering
      guides = [...SAMPLE_GUIDES];
      
      // Apply filters to sample data
      if (search) {
        const searchTerm = search.toLowerCase();
        guides = guides.filter(guide => 
          guide.title.toLowerCase().includes(searchTerm) ||
          guide.excerpt.toLowerCase().includes(searchTerm) ||
          guide.location.toLowerCase().includes(searchTerm) ||
          guide.tags.some(t => t.toLowerCase().includes(searchTerm))
        );
      }
      
      if (tag) {
        guides = guides.filter(guide => 
          guide.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );
      }
      
      if (location) {
        guides = guides.filter(guide => 
          guide.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (difficulty) {
        guides = guides.filter(guide => 
          guide.difficulty.toLowerCase() === difficulty.toLowerCase()
        );
      }
      
      if (featured === 'true') {
        guides = guides.filter(guide => guide.featured === true);
      }
      
      // Sort by creation date (newest first) and then by popularity
      guides.sort((a, b) => {
        const dateA = new Date(a.created || a.createdAt);
        const dateB = new Date(b.created || b.createdAt);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB - dateA; // Newest first
        }
        return b.stats.likes - a.stats.likes; // Then by likes
      });
      
      // Apply pagination to sample data
      total = guides.length;
      guides = guides.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    }

    res.json({
      guides,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      },
      source: fromDatabase ? 'database' : 'sample_data'
    });
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ message: 'Error fetching guides' });
  }
});

// GET /api/guides/:id - Get specific guide
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let guide;
    let fromDatabase = false;
    
    try {
      // Try to get guide from database first
      guide = await Guide.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { 'author.id': id },
          { title: new RegExp(id.replace(/-/g, ' '), 'i') }
        ],
        published: true
      });
      
      if (guide) {
        // Increment view count in database
        await guide.incrementViews();
        fromDatabase = true;
        console.log(`Fetched guide ${guide.title} from database`);
      }
    } catch (dbError) {
      console.warn('Database query failed, falling back to sample data:', dbError.message);
    }
    
    // Fallback to sample data if not found in database
    if (!guide) {
      guide = SAMPLE_GUIDES.find(g => g.id === id);
      if (guide) {
        // Increment view count in sample data
        guide.stats.views += 1;
        console.log(`Fetched guide ${guide.title} from sample data`);
      }
    }
    
    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }

    res.json({
      ...guide.toObject ? guide.toObject() : guide,
      source: fromDatabase ? 'database' : 'sample_data'
    });
  } catch (error) {
    console.error('Error fetching guide:', error);
    res.status(500).json({ message: 'Error fetching guide' });
  }
});

// POST /api/guides/:id/like - Like/unlike a guide
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    let guide;
    let fromDatabase = false;
    
    try {
      // Try to find and update guide in database first
      guide = await Guide.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { 'author.id': id }
        ],
        published: true
      });
      
      if (guide) {
        await guide.incrementLikes();
        fromDatabase = true;
        console.log(`Liked guide ${guide.title} in database`);
      }
    } catch (dbError) {
      console.warn('Database update failed, falling back to sample data:', dbError.message);
    }
    
    // Fallback to sample data if not found in database
    if (!guide) {
      guide = SAMPLE_GUIDES.find(g => g.id === id);
      if (guide) {
        // In a real app, you'd check if user already liked and track user likes
        guide.stats.likes += 1;
        console.log(`Liked guide ${guide.title} in sample data`);
      }
    }
    
    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }

    res.json({ 
      message: 'Guide liked successfully',
      likes: guide.stats.likes,
      source: fromDatabase ? 'database' : 'sample_data'
    });
  } catch (error) {
    console.error('Error liking guide:', error);
    res.status(500).json({ message: 'Error liking guide' });
  }
});

// GET /api/guides/stats/popular - Get popular guides
router.get('/stats/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularGuides = [...SAMPLE_GUIDES]
      .sort((a, b) => b.stats.likes - a.stats.likes)
      .slice(0, parseInt(limit))
      .map(guide => ({
        id: guide.id,
        title: guide.title,
        location: guide.location,
        cover: guide.cover,
        stats: guide.stats,
        author: guide.author
      }));

    res.json(popularGuides);
  } catch (error) {
    console.error('Error fetching popular guides:', error);
    res.status(500).json({ message: 'Error fetching popular guides' });
  }
});

// GET /api/guides/stats/recent - Get recently added guides
router.get('/stats/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentGuides = [...SAMPLE_GUIDES]
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, parseInt(limit))
      .map(guide => ({
        id: guide.id,
        title: guide.title,
        location: guide.location,
        cover: guide.cover,
        stats: guide.stats,
        author: guide.author,
        created: guide.created
      }));

    res.json(recentGuides);
  } catch (error) {
    console.error('Error fetching recent guides:', error);
    res.status(500).json({ message: 'Error fetching recent guides' });
  }
});

// GET /api/guides/tags/popular - Get popular tags
router.get('/tags/popular', async (req, res) => {
  try {
    const tagCounts = {};
    
    SAMPLE_GUIDES.forEach(guide => {
      guide.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    res.json(popularTags);
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ message: 'Error fetching popular tags' });
  }
});

module.exports = router;