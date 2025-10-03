const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const { wikipedia } = require('../utils/apiHelpers');

const router = express.Router();

// Base URL for Unsplash API
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

// @route   GET /api/images/test
// @desc    Quick configuration test for Unsplash
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API key not configured' 
      });
    }

    return res.json({
      success: true,
      message: 'Unsplash API key is set'
    });
  } catch (error) {
    console.error('Images test error:', error.message);
    return res.status(500).json({ success: false, message: 'Images test failed', error: error.message });
  }
});

// @route   GET /api/images/search/:query
// @desc    Search for images on Unsplash
// @access  Private
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, per_page = 12 } = req.query;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API key not configured' 
      });
    }

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 2 characters' 
      });
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const perPageNum = Math.min(30, Math.max(1, parseInt(per_page) || 12));

    const response = await axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      },
      params: {
        query: query.trim(),
        page: pageNum,
        per_page: perPageNum,
        orientation: 'landscape',
        order_by: 'relevant'
      }
    });

    const images = response.data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      fullsize: photo.urls.full,
      altDescription: photo.alt_description || photo.description || `Photo of ${query}`,
      width: photo.width,
      height: photo.height,
      color: photo.color,
      likes: photo.likes,
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: photo.user.links.html,
        portfolioUrl: photo.user.portfolio_url
      },
      downloadLocation: photo.links.download_location,
      htmlUrl: photo.links.html,
      tags: photo.tags ? photo.tags.map(tag => tag.title) : []
    }));

    res.json({
      success: true,
      data: {
        images,
        total: response.data.total,
        totalPages: response.data.total_pages,
        currentPage: pageNum,
        perPage: perPageNum
      }
    });

  } catch (error) {
    console.error('Image search error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API authentication failed' 
      });
    }
    
    if (error.response?.status === 403) {
      return res.status(429).json({ 
        success: false,
        message: 'Unsplash API rate limit exceeded. Please try again later.' 
      });
    }
    
    if (error.response?.status === 422) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid search parameters' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching images' 
    });
  }
});

// @route   GET /api/images/country/:country
// @desc    Get images specifically for a country
// @access  Private
router.get('/country/:country', auth, async (req, res) => {
  try {
    const { country } = req.params;
    const { per_page = 8 } = req.query;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API key not configured' 
      });
    }

    if (!country || country.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Country name must be at least 2 characters' 
      });
    }

    const perPageNum = Math.min(20, Math.max(1, parseInt(per_page) || 8));
    
    // Try multiple search queries to get better results
    const searchQueries = [
      `${country.trim()} travel`,
      `${country.trim()} landscape`,
      `${country.trim()} architecture`,
      country.trim()
    ];

    let allImages = [];
    
    // Try each search query until we have enough images
    for (const query of searchQueries) {
      if (allImages.length >= perPageNum) break;
      
      try {
        const response = await axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
          headers: {
            'Authorization': `Client-ID ${accessKey}`
          },
          params: {
            query,
            page: 1,
            per_page: Math.min(10, perPageNum - allImages.length),
            orientation: 'landscape',
            order_by: 'relevant'
          }
        });

        const images = response.data.results.map(photo => ({
          id: photo.id,
          url: photo.urls.regular,
          thumb: photo.urls.thumb,
          small: photo.urls.small,
          altDescription: photo.alt_description || photo.description || `Photo of ${country}`,
          width: photo.width,
          height: photo.height,
          color: photo.color,
          photographer: {
            name: photo.user.name,
            username: photo.user.username,
            profileUrl: photo.user.links.html
          },
          downloadLocation: photo.links.download_location,
          htmlUrl: photo.links.html
        }));

        // Add images that aren't already in the collection
        images.forEach(img => {
          if (!allImages.some(existing => existing.id === img.id)) {
            allImages.push(img);
          }
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (queryError) {
        console.warn(`Failed to fetch images for query "${query}":`, queryError.message);
        continue; // Try next query
      }
    }

    // Limit to requested number
    allImages = allImages.slice(0, perPageNum);

    res.json({
      success: true,
      data: {
        country: country.trim(),
        images: allImages,
        count: allImages.length
      }
    });

  } catch (error) {
    console.error('Country images error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API authentication failed' 
      });
    }
    
    if (error.response?.status === 403) {
      return res.status(429).json({ 
        success: false,
        message: 'Unsplash API rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching country images' 
    });
  }
});

// @route   POST /api/images/download/:id
// @desc    Trigger download tracking for Unsplash (required by their API guidelines)
// @access  Private
router.post('/download/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API key not configured' 
      });
    }

    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: 'Image ID is required' 
      });
    }

    // Get the photo details first to get the download location
    const photoResponse = await axios.get(`${UNSPLASH_BASE_URL}/photos/${id}`, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });

    // Trigger download tracking
    await axios.get(photoResponse.data.links.download_location, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });

    res.json({
      success: true,
      message: 'Download tracked successfully'
    });

  } catch (error) {
    console.error('Download tracking error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: 'Image not found' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error tracking download' 
    });
  }
});

// @route   GET /api/images/random
// @desc    Get random travel-related images
// @access  Private
router.get('/random', auth, async (req, res) => {
  try {
    const { count = 1 } = req.query;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API key not configured' 
      });
    }

    const countNum = Math.min(30, Math.max(1, parseInt(count) || 1));

    const response = await axios.get(`${UNSPLASH_BASE_URL}/photos/random`, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      },
      params: {
        query: 'travel landscape',
        orientation: 'landscape',
        count: countNum
      }
    });

    // Handle single image vs array response
    const photos = Array.isArray(response.data) ? response.data : [response.data];
    
    const images = photos.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      altDescription: photo.alt_description || photo.description || 'Random travel photo',
      width: photo.width,
      height: photo.height,
      color: photo.color,
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: photo.user.links.html
      },
      downloadLocation: photo.links.download_location,
      htmlUrl: photo.links.html
    }));

    res.json({
      success: true,
      data: {
        images,
        count: images.length
      }
    });

  } catch (error) {
    console.error('Random images error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        success: false,
        message: 'Unsplash API authentication failed' 
      });
    }
    
    if (error.response?.status === 403) {
      return res.status(429).json({ 
        success: false,
        message: 'Unsplash API rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error fetching random images' 
    });
  }
});

// @route   GET /api/images/wikipedia/:query
// @desc    Search for images on Wikipedia for a specific place
// @access  Private
router.get('/wikipedia/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 5 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 2 characters' 
      });
    }

    const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 5));
    
    // Get Wikipedia place information including images
    const placeInfo = await wikipedia.getPlaceInfo(query.trim(), {
      sentences: 2,
      imageLimit: limitNum
    });

    if (!placeInfo || !placeInfo.images) {
      return res.json({
        success: true,
        data: {
          images: [],
          total: 0,
          query: query.trim(),
          source: 'wikipedia'
        }
      });
    }

    // Transform Wikipedia images to match Unsplash format
    const images = placeInfo.images.map(img => ({
      id: img.title.replace('File:', '').replace(/\s+/g, '_'),
      url: img.url,
      thumb: img.thumbUrl || img.url,
      small: img.thumbUrl || img.url,
      fullsize: img.url,
      altDescription: img.description || `Image of ${query}`,
      width: img.width,
      height: img.height,
      thumbWidth: img.thumbWidth,
      thumbHeight: img.thumbHeight,
      color: '#ffffff', // Wikipedia doesn't provide dominant colors
      likes: 0,
      photographer: {
        name: img.artist || 'Wikipedia Contributor',
        username: 'wikipedia',
        profileUrl: 'https://wikipedia.org',
        portfolioUrl: null
      },
      downloadLocation: img.url,
      htmlUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(img.title)}`,
      tags: [query.trim()],
      license: img.license || 'Wikipedia',
      description: img.description,
      source: 'wikipedia'
    }));

    res.json({
      success: true,
      data: {
        images,
        total: images.length,
        query: query.trim(),
        source: 'wikipedia',
        wikipediaInfo: {
          title: placeInfo.title,
          extract: placeInfo.extract,
          url: placeInfo.url
        }
      }
    });

  } catch (error) {
    console.error('Wikipedia image search error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching images from Wikipedia' 
    });
  }
});

// @route   GET /api/images/combined/:query
// @desc    Get images from both Unsplash and Wikipedia
// @access  Private
router.get('/combined/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, per_page = 12, unsplash_count = 8, wikipedia_count = 4 } = req.query;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 2 characters' 
      });
    }

    const unsplashLimit = Math.min(20, Math.max(0, parseInt(unsplash_count) || 8));
    const wikipediaLimit = Math.min(10, Math.max(0, parseInt(wikipedia_count) || 4));
    const totalLimit = Math.min(30, Math.max(1, parseInt(per_page) || 12));

    let allImages = [];
    let unsplashImages = [];
    let wikipediaImages = [];

    // Get images from both sources in parallel
    const promises = [];
    
    // Add Unsplash promise if key is available and count > 0
    if (accessKey && unsplashLimit > 0) {
      promises.push(
        axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
          headers: {
            'Authorization': `Client-ID ${accessKey}`
          },
          params: {
            query: query.trim(),
            page: parseInt(page) || 1,
            per_page: unsplashLimit,
            orientation: 'landscape',
            order_by: 'relevant'
          }
        }).then(response => {
          return response.data.results.map(photo => ({
            id: `unsplash_${photo.id}`,
            url: photo.urls.regular,
            thumb: photo.urls.thumb,
            small: photo.urls.small,
            fullsize: photo.urls.full,
            altDescription: photo.alt_description || photo.description || `Photo of ${query}`,
            width: photo.width,
            height: photo.height,
            color: photo.color,
            likes: photo.likes,
            photographer: {
              name: photo.user.name,
              username: photo.user.username,
              profileUrl: photo.user.links.html,
              portfolioUrl: photo.user.portfolio_url
            },
            downloadLocation: photo.links.download_location,
            htmlUrl: photo.links.html,
            tags: photo.tags ? photo.tags.map(tag => tag.title) : [],
            source: 'unsplash'
          }));
        }).catch(error => {
          console.warn('Unsplash search failed:', error.message);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Add Wikipedia promise if count > 0
    if (wikipediaLimit > 0) {
      promises.push(
        wikipedia.getPlaceInfo(query.trim(), {
          sentences: 1,
          imageLimit: wikipediaLimit
        }).then(placeInfo => {
          if (!placeInfo || !placeInfo.images) return [];
          
          return placeInfo.images.map(img => ({
            id: `wikipedia_${img.title.replace('File:', '').replace(/\s+/g, '_')}`,
            url: img.url,
            thumb: img.thumbUrl || img.url,
            small: img.thumbUrl || img.url,
            fullsize: img.url,
            altDescription: img.description || `Image of ${query}`,
            width: img.width,
            height: img.height,
            color: '#ffffff',
            likes: 0,
            photographer: {
              name: img.artist || 'Wikipedia Contributor',
              username: 'wikipedia',
              profileUrl: 'https://wikipedia.org',
              portfolioUrl: null
            },
            downloadLocation: img.url,
            htmlUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(img.title)}`,
            tags: [query.trim()],
            source: 'wikipedia'
          }));
        }).catch(error => {
          console.warn('Wikipedia search failed:', error.message);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [unsplashResults, wikipediaResults] = await Promise.all(promises);
    
    unsplashImages = unsplashResults;
    wikipediaImages = wikipediaResults;

    // Combine and limit results
    allImages = [...unsplashImages, ...wikipediaImages].slice(0, totalLimit);

    res.json({
      success: true,
      data: {
        images: allImages,
        total: allImages.length,
        currentPage: parseInt(page) || 1,
        perPage: totalLimit,
        sources: {
          unsplash: unsplashImages.length,
          wikipedia: wikipediaImages.length
        },
        query: query.trim()
      }
    });

  } catch (error) {
    console.error('Combined image search error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching combined images' 
    });
  }
});

module.exports = router;
