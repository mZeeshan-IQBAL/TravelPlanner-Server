const axios = require('axios');
const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/ai/itinerary
// Body: { destination, durationDays, budgetLevel, interests: [..] }
router.post('/itinerary', auth, async (req, res) => {
  try {
    const { destination, durationDays = 3, budgetLevel = 'medium', interests = [] } = req.body;
    if (!destination) return res.status(400).json({ success: false, message: 'destination is required' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    let plan;

    if (apiKey) {
      // Use OpenRouter chat completions to generate a structured plan
      const prompt = `Create a day-wise travel itinerary in JSON with keys days:[{day, items:[{title, location, startTime, endTime, notes, cost}]}] for ${destination} over ${durationDays} days for a ${budgetLevel} budget. Focus on ${interests.join(', ') || 'general highlights' }. Keep costs approximate in USD.`;
      const resp = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'anthropic/claude-3.5-haiku', // Using Claude Haiku - fast and efficient
        messages: [ 
          { role: 'system', content: 'You are a travel planner that outputs only valid JSON. Do not include any markdown formatting or explanatory text - just the JSON object.' }, 
          { role: 'user', content: prompt } 
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }, {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5000', // Required by OpenRouter
          'X-Title': 'Travel Planner App' // Optional but recommended
        }
      });

      // Attempt to parse JSON from the response
      const text = resp.data.choices?.[0]?.message?.content || '{}';
      try { plan = JSON.parse(text); } catch (_) { plan = { days: [] }; }
    } else {
      // Fallback simple rule-based generator
      const defaultItems = [
        { title: 'City Center Walk', startTime: '09:00', endTime: '11:00' },
        { title: 'Museum Visit', startTime: '11:30', endTime: '13:00' },
        { title: 'Local Lunch', startTime: '13:00', endTime: '14:00' },
        { title: 'Park/Scenic Spot', startTime: '15:00', endTime: '17:00' },
        { title: 'Dinner', startTime: '19:00', endTime: '20:30' },
      ];
      plan = { days: Array.from({ length: Math.max(1, durationDays) }, (_, idx) => ({
        day: idx + 1,
        items: defaultItems.map(i => ({ ...i, location: destination, notes: interests[0] || '', cost: budgetLevel === 'low' ? 10 : budgetLevel === 'high' ? 60 : 30 }))
      }))};
    }

    return res.json({ success: true, data: plan });
  } catch (e) {
    console.error('AI itinerary error:', e?.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Failed to generate itinerary' });
  }
});

module.exports = router;
