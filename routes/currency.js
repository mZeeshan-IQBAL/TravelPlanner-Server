const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /api/currency/convert?from=USD&to=EUR&amount=100
router.get('/convert', async (req, res) => {
  try {
    const { from = 'USD', to = 'USD', amount = 1 } = req.query;
    const amt = parseFloat(amount);
    if (Number.isNaN(amt)) return res.status(400).json({ success: false, message: 'Invalid amount' });

    // Using exchangerate.host (free, no key)
    const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${amt}`;
    const resp = await axios.get(url, { timeout: 8000 });
    const rate = resp.data?.info?.rate || 1;
    const result = resp.data?.result || amt;

    res.json({ success: true, data: { from, to, amount: amt, rate, result } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Conversion failed' });
  }
});

module.exports = router;
