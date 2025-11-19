const express = require('express');
const router = express.Router();

// Endpoint to get Amazon product image URL
router.get('/product-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || !url.includes('amazon.com')) {
      return res.status(400).json({ error: 'Valid Amazon URL required' });
    }

    // Fetch the Amazon product page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const html = await response.text();
    
    // Extract image URL from Open Graph meta tag
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogImageMatch && ogImageMatch[1]) {
      const imageUrl = ogImageMatch[1];
      return res.json({ imageUrl });
    }

    // Fallback: Try to find the main product image
    const mainImageMatch = html.match(/data-old-hires="([^"]+)"/);
    if (mainImageMatch && mainImageMatch[1]) {
      return res.json({ imageUrl: mainImageMatch[1] });
    }

    // Another fallback: landingImage
    const landingImageMatch = html.match(/"large":"([^"]+)"/);
    if (landingImageMatch && landingImageMatch[1]) {
      const imageUrl = landingImageMatch[1].replace(/\\/g, '');
      return res.json({ imageUrl });
    }

    return res.status(404).json({ error: 'Could not extract product image' });
    
  } catch (error) {
    console.error('Error fetching Amazon product image:', error);
    res.status(500).json({ error: 'Failed to fetch product image' });
  }
});

module.exports = router;
