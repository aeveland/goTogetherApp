// Amazon URL parsing and affiliate link service
const ASSOCIATE_TAG = 'gotogether-20';

class AmazonService {
  /**
   * Extract ASIN from Amazon URL
   */
  extractASIN(url) {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/d\/([A-Z0-9]{10})/,
      /amazon\.com\/([A-Z0-9]{10})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Add affiliate tag to Amazon URL
   */
  addAffiliateTag(url) {
    try {
      const urlObj = new URL(url);
      
      // Only process Amazon URLs
      if (!urlObj.hostname.includes('amazon.com')) {
        throw new Error('Not an Amazon URL');
      }

      // Remove existing affiliate tags
      urlObj.searchParams.delete('tag');
      urlObj.searchParams.delete('linkCode');
      urlObj.searchParams.delete('creative');
      urlObj.searchParams.delete('creativeASIN');
      
      // Add our affiliate tag
      urlObj.searchParams.set('tag', ASSOCIATE_TAG);

      return urlObj.toString();
    } catch (error) {
      console.error('Error adding affiliate tag:', error);
      return url;
    }
  }

  /**
   * Clean and validate Amazon URL
   */
  cleanAmazonUrl(url) {
    try {
      // Add https:// if missing
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const urlObj = new URL(url);
      
      // Validate it's Amazon
      if (!urlObj.hostname.includes('amazon.com')) {
        throw new Error('Not an Amazon URL');
      }

      // Extract ASIN
      const asin = this.extractASIN(url);
      if (!asin) {
        throw new Error('Could not extract product ASIN from URL');
      }

      // Create clean URL with ASIN and affiliate tag
      return {
        cleanUrl: `https://www.amazon.com/dp/${asin}?tag=${ASSOCIATE_TAG}`,
        asin: asin
      };
    } catch (error) {
      throw new Error(`Invalid Amazon URL: ${error.message}`);
    }
  }

  /**
   * Parse basic product info from Amazon URL
   * Note: Without PA-API, we can only get limited info from the URL
   */
  parseProductFromUrl(url) {
    const { cleanUrl, asin } = this.cleanAmazonUrl(url);
    
    return {
      amazon_url: cleanUrl,
      asin: asin,
      product_title: null, // Will be filled by user or later scraping
      product_image_url: null,
      product_price: null
    };
  }
}

module.exports = new AmazonService();
