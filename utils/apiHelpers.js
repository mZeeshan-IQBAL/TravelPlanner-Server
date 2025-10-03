const axios = require('axios');

// Nominatim API helper functions
class NominatimAPI {
  constructor() {
    this.baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
    this.userAgent = process.env.NOMINATIM_USER_AGENT || 'TravelPlanner/1.0';
    this.email = process.env.NOMINATIM_EMAIL || '';
    this.limit = parseInt(process.env.NOMINATIM_LIMIT) || 5;
    this.format = process.env.NOMINATIM_FORMAT || 'json';
  }

  // Search for places
  async search(query, options = {}) {
    try {
      const params = {
        q: query,
        format: this.format,
        limit: options.limit || this.limit,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        ...options
      };

      const headers = {
        'User-Agent': this.userAgent
      };
      
      if (this.email) {
        headers['Email'] = this.email;
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params,
        headers
      });

      return response.data.map(item => ({
        provider: 'nominatim',
        providerId: item.place_id,
        name: this.extractBestName(item, query),
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        type: item.type,
        category: item.category,
        importance: item.importance,
        boundingBox: item.boundingbox,
        extraTags: item.extratags || {}
      }));
    } catch (error) {
      console.error('Nominatim search error:', error.message);
      throw new Error('Failed to search places with Nominatim');
    }
  }

  // Extract the best available name, preferring English
  extractBestName(item, query) {
    // Try to get English name first
    if (item.namedetails) {
      // Look for English name variants
      if (item.namedetails['name:en']) return item.namedetails['name:en'];
      if (item.namedetails['name:eng']) return item.namedetails['name:eng'];
      if (item.namedetails.name) return item.namedetails.name;
    }
    
    // If we have the regular name field and it looks like Latin characters
    if (item.name && /^[a-zA-Z0-9\s\-\.,']+$/.test(item.name)) {
      return item.name;
    }
    
    // Fall back to extracting from display_name
    if (item.display_name) {
      const namePart = item.display_name.split(',')[0].trim();
      // If the first part looks like Latin characters, use it
      if (/^[a-zA-Z0-9\s\-\.,']+$/.test(namePart)) {
        return namePart;
      }
    }
    
    // Last resort: return the original query
    return query;
  }

  // Reverse geocoding
  async reverse(lat, lng, options = {}) {
    try {
      const params = {
        lat,
        lon: lng,
        format: this.format,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        ...options
      };

      const headers = {
        'User-Agent': this.userAgent
      };
      
      if (this.email) {
        headers['Email'] = this.email;
      }

      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params,
        headers
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return {
        provider: 'nominatim',
        providerId: response.data.place_id,
        name: response.data.name || response.data.display_name?.split(',')[0],
        fullName: response.data.display_name,
        lat: parseFloat(response.data.lat),
        lng: parseFloat(response.data.lon),
        address: response.data.display_name,
        type: response.data.type,
        category: response.data.category,
        extraTags: response.data.extratags || {}
      };
    } catch (error) {
      console.error('Nominatim reverse error:', error.message);
      throw new Error('Failed to reverse geocode with Nominatim');
    }
  }
}

// Overpass API helper functions
class OverpassAPI {
  constructor() {
    this.baseUrl = process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter';
    this.timeout = parseInt(process.env.OVERPASS_TIMEOUT) || 25;
    this.outputFormat = process.env.OVERPASS_OUTPUT_FORMAT || 'json';
  }

  // Search for POIs around a location
  async searchPOI(lat, lng, radius = 1000, tags = {}, limit = 50) {
    try {
      // Build Overpass QL query
      let query = `[out:${this.outputFormat}][timeout:${this.timeout}];\n`;
      query += `(\n`;

      // Handle different tag types
      const tagQueries = [];
      if (Object.keys(tags).length === 0) {
        // Default search for common POIs
        tagQueries.push('node["tourism"~"attraction|museum|monument|viewpoint"]');
        tagQueries.push('node["amenity"~"restaurant|cafe|hospital|pharmacy|bank"]');
        tagQueries.push('way["tourism"~"attraction|museum|monument"]');
      } else {
        Object.entries(tags).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            tagQueries.push(`node["${key}"~"${value.join('|')}"]`);
            tagQueries.push(`way["${key}"~"${value.join('|')}"]`);
          } else {
            tagQueries.push(`node["${key}"="${value}"]`);
            tagQueries.push(`way["${key}"="${value}"]`);
          }
        });
      }

      tagQueries.forEach(tagQuery => {
        query += `  ${tagQuery}(around:${radius},${lat},${lng});\n`;
      });

      query += `);\n`;
      query += `out center meta ${limit};`;

      const response = await axios.post(this.baseUrl, query, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      return this.parseOverpassResponse(response.data);
    } catch (error) {
      console.error('Overpass search error:', error.message);
      throw new Error('Failed to search POIs with Overpass API');
    }
  }

  // Search for specific amenity types
  async searchAmenity(lat, lng, amenityType, radius = 5000, limit = 20) {
    const tags = { amenity: amenityType };
    return this.searchPOI(lat, lng, radius, tags, limit);
  }

  // Search for tourism POIs
  async searchTourism(lat, lng, tourismType, radius = 5000, limit = 20) {
    const tags = { tourism: Array.isArray(tourismType) ? tourismType : [tourismType] };
    return this.searchPOI(lat, lng, radius, tags, limit);
  }

  // Parse Overpass API response
  parseOverpassResponse(data) {
    if (!data.elements) return [];

    return data.elements.map(element => {
      const lat = element.lat || (element.center && element.center.lat);
      const lng = element.lon || (element.center && element.center.lon);
      
      return {
        provider: 'overpass',
        providerId: `${element.type}/${element.id}`,
        name: element.tags?.name || 'Unnamed location',
        lat,
        lng,
        type: element.tags?.amenity || element.tags?.tourism || element.tags?.shop || 'unknown',
        category: this.getCategoryFromTags(element.tags),
        tags: element.tags || {},
        address: this.buildAddress(element.tags),
        phone: element.tags?.phone,
        website: element.tags?.website,
        openingHours: element.tags?.opening_hours,
        wheelchair: element.tags?.wheelchair,
        elementType: element.type // node, way, relation
      };
    }).filter(poi => poi.lat && poi.lng);
  }

  getCategoryFromTags(tags) {
    if (tags.tourism) return 'tourism';
    if (tags.amenity) return 'amenity';
    if (tags.shop) return 'shop';
    if (tags.leisure) return 'leisure';
    return 'unknown';
  }

  buildAddress(tags) {
    const addressParts = [];
    if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
    if (tags['addr:street']) addressParts.push(tags['addr:street']);
    if (tags['addr:city']) addressParts.push(tags['addr:city']);
    if (tags['addr:postcode']) addressParts.push(tags['addr:postcode']);
    if (tags['addr:country']) addressParts.push(tags['addr:country']);
    
    return addressParts.length > 0 ? addressParts.join(', ') : '';
  }
}

// Wikipedia API helper functions
class WikipediaAPI {
  constructor() {
    this.baseUrl = process.env.WIKIPEDIA_BASE_URL || 'https://en.wikipedia.org/w/api.php';
    this.format = process.env.WIKIPEDIA_FORMAT || 'json';
    this.exintro = process.env.WIKIPEDIA_EXINTRO === 'true';
    this.explaintext = process.env.WIKIPEDIA_EXPLAINTEXT === 'true';
    this.thumbSize = parseInt(process.env.WIKIPEDIA_THUMB_SIZE) || 500;
  }

  // Search for Wikipedia articles
  async search(query, limit = 5) {
    try {
      const params = {
        action: 'query',
        format: this.format,
        list: 'search',
        srsearch: query,
        srlimit: limit,
        srprop: 'snippet|titlesnippet|size|wordcount|timestamp'
      };

      const response = await axios.get(this.baseUrl, { params });
      
      if (response.data.query && response.data.query.search) {
        return response.data.query.search.map(result => ({
          provider: 'wikipedia',
          title: result.title,
          pageid: result.pageid,
          size: result.size,
          wordcount: result.wordcount,
          snippet: result.snippet,
          timestamp: result.timestamp
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      throw new Error('Failed to search Wikipedia');
    }
  }

  // Get page summary/extract
  async getPageSummary(title, sentences = 3) {
    try {
      const params = {
        action: 'query',
        format: this.format,
        titles: title,
        prop: 'extracts|pageimages|info',
        exintro: this.exintro,
        explaintext: this.explaintext,
        exsentences: sentences,
        piprop: 'thumbnail|original',
        pithumbsize: this.thumbSize,
        inprop: 'url'
      };

      const response = await axios.get(this.baseUrl, { params });
      
      if (response.data.query && response.data.query.pages) {
        const pages = Object.values(response.data.query.pages);
        const page = pages[0];
        
        if (page && page.pageid) {
          return {
            provider: 'wikipedia',
            title: page.title,
            pageid: page.pageid,
            extract: page.extract || '',
            url: page.fullurl,
            thumbnail: page.thumbnail ? {
              source: page.thumbnail.source,
              width: page.thumbnail.width,
              height: page.thumbnail.height
            } : null,
            originalImage: page.original ? {
              source: page.original.source,
              width: page.original.width,
              height: page.original.height
            } : null
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Wikipedia page summary error:', error.message);
      throw new Error('Failed to get Wikipedia page summary');
    }
  }

  // Get images from a Wikipedia page
  async getPageImages(title, limit = 10) {
    try {
      const params = {
        action: 'query',
        format: this.format,
        titles: title,
        prop: 'images',
        imlimit: limit
      };

      const response = await axios.get(this.baseUrl, { params });
      
      if (response.data.query && response.data.query.pages) {
        const pages = Object.values(response.data.query.pages);
        const page = pages[0];
        
        if (page && page.images) {
          // Get detailed info for each image
          const imagePromises = page.images.slice(0, limit).map(img => 
            this.getImageInfo(img.title)
          );
          
          const imageDetails = await Promise.all(imagePromises);
          return imageDetails.filter(img => img !== null);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Wikipedia page images error:', error.message);
      return [];
    }
  }

  // Get detailed information about an image
  async getImageInfo(imageTitle) {
    try {
      const params = {
        action: 'query',
        format: this.format,
        titles: imageTitle,
        prop: 'imageinfo',
        iiprop: 'url|size|mime|extmetadata',
        iiurlwidth: this.thumbSize
      };

      const response = await axios.get(this.baseUrl, { params });
      
      if (response.data.query && response.data.query.pages) {
        const pages = Object.values(response.data.query.pages);
        const page = pages[0];
        
        if (page && page.imageinfo && page.imageinfo[0]) {
          const info = page.imageinfo[0];
          return {
            provider: 'wikipedia',
            title: page.title,
            url: info.url,
            thumbUrl: info.thumburl,
            width: info.width,
            height: info.height,
            thumbWidth: info.thumbwidth,
            thumbHeight: info.thumbheight,
            mime: info.mime,
            size: info.size,
            description: info.extmetadata?.ImageDescription?.value || '',
            artist: info.extmetadata?.Artist?.value || '',
            license: info.extmetadata?.LicenseShortName?.value || ''
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Wikipedia image info error:', error.message);
      return null;
    }
  }

  // Search for place-related articles and images
  async getPlaceInfo(placeName, options = {}) {
    try {
      const searchResults = await this.search(placeName, 3);
      
      if (searchResults.length === 0) {
        return null;
      }

      // Get detailed info for the best match
      const bestMatch = searchResults[0];
      const [summary, images] = await Promise.all([
        this.getPageSummary(bestMatch.title, options.sentences || 3),
        this.getPageImages(bestMatch.title, options.imageLimit || 5)
      ]);

      return {
        ...summary,
        images: images.slice(0, options.imageLimit || 5),
        alternativeResults: searchResults.slice(1)
      };
    } catch (error) {
      console.error('Wikipedia place info error:', error.message);
      return null;
    }
  }
}

// Export instances
module.exports = {
  nominatim: new NominatimAPI(),
  overpass: new OverpassAPI(),
  wikipedia: new WikipediaAPI(),
  NominatimAPI,
  OverpassAPI,
  WikipediaAPI
};