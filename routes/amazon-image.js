const express = require('express');
const router = express.Router();

// Endpoint to proxy Amazon product image
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    // Expand shortened Amazon URLs (a.co links)
    let expandedUrl = url;
    if (url.includes('a.co')) {
      const expandResponse = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      expandedUrl = expandResponse.url || url;
    }

    console.log('Fetching Amazon page:', expandedUrl);

    // Fetch the Amazon product page
    const response = await fetch(expandedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch Amazon page:', response.status);
      return res.status(404).json({ error: 'Product page not found' });
    }

    const html = await response.text();
    let imageUrl = null;
    
    // Method 1: Open Graph image (usually best quality)
    const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogMatch && ogMatch[1]) {
      imageUrl = ogMatch[1];
      console.log('Found image via og:image:', imageUrl);
    }

    // Method 2: Main product image data-old-hires
    if (!imageUrl) {
      const hiresMatch = html.match(/data-old-hires="([^"]+)"/);
      if (hiresMatch && hiresMatch[1]) {
        imageUrl = hiresMatch[1];
        console.log('Found image via data-old-hires:', imageUrl);
      }
    }

    // Method 3: landingImage JSON
    if (!imageUrl) {
      const landingMatch = html.match(/"large":"([^"]+)"/);
      if (landingMatch && landingMatch[1]) {
        imageUrl = landingMatch[1].replace(/\\/g, '');
        console.log('Found image via landingImage:', imageUrl);
      }
    }

    // Method 4: imageBlock large image
    if (!imageUrl) {
      const blockMatch = html.match(/"hiRes":"([^"]+)"/);
      if (blockMatch && blockMatch[1]) {
        imageUrl = blockMatch[1].replace(/\\/g, '');
        console.log('Found image via hiRes:', imageUrl);
      }
    }

    if (imageUrl) {
      // Return just the URL so frontend can load it
      return res.json({ imageUrl });
    }

    console.error('Could not find any image in HTML');
    return res.status(404).json({ error: 'Could not extract product image' });
    
  } catch (error) {
    console.error('Error fetching Amazon product image:', error);
    res.status(500).json({ error: 'Failed to fetch product image', details: error.message });
  }
});

module.exports = router;
