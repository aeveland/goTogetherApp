const express = require('express');
const pool = require('../database/db');
const router = express.Router();

// Endpoint to fetch and store Amazon product images for all items
router.post('/populate', async (req, res) => {
  try {
    // Get all shopping items with Amazon links but no image URL
    const result = await pool.query(`
      SELECT id, item_name, amazon_url
      FROM trip_shopping_items
      WHERE amazon_url IS NOT NULL 
      AND amazon_url != ''
      AND (amazon_image_url IS NULL OR amazon_image_url = '')
    `);

    const items = result.rows;
    console.log(`Found ${items.length} items to fetch images for`);

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        console.log(`Fetching image for: ${item.item_name}`);
        
        // Fetch the Amazon product page
        const response = await fetch(item.amazon_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          console.log(`Failed to fetch page for ${item.item_name}: ${response.status}`);
          failCount++;
          continue;
        }

        const html = await response.text();
        
        // Try to extract image URL (multiple methods)
        let imageUrl = null;

        // Method 1: Open Graph image
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrl = ogImageMatch[1];
        }

        // Method 2: data-old-hires attribute
        if (!imageUrl) {
          const mainImageMatch = html.match(/data-old-hires="([^"]+)"/);
          if (mainImageMatch && mainImageMatch[1]) {
            imageUrl = mainImageMatch[1];
          }
        }

        // Method 3: landingImage in JSON
        if (!imageUrl) {
          const landingImageMatch = html.match(/"large":"([^"]+)"/);
          if (landingImageMatch && landingImageMatch[1]) {
            imageUrl = landingImageMatch[1].replace(/\\/g, '');
          }
        }

        if (imageUrl) {
          // Update the database with the image URL
          await pool.query(`
            UPDATE trip_shopping_items
            SET amazon_image_url = $1
            WHERE id = $2
          `, [imageUrl, item.id]);
          
          console.log(`✓ Saved image URL for ${item.item_name}`);
          successCount++;
        } else {
          console.log(`✗ Could not find image for ${item.item_name}`);
          failCount++;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error fetching image for ${item.item_name}:`, error.message);
        failCount++;
      }
    }

    res.json({
      message: 'Image fetch complete',
      total: items.length,
      success: successCount,
      failed: failCount
    });

  } catch (error) {
    console.error('Error populating Amazon images:', error);
    res.status(500).json({ error: 'Failed to populate images' });
  }
});

module.exports = router;
