const express = require('express');
const router = express.Router();

// Weather system diagnostics
router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const hasApiKey = apiKey && apiKey !== 'demo_key' && apiKey.length > 10;
    
    // Test API key if available
    let apiTest = null;
    if (hasApiKey) {
      try {
        const testResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey}`);
        apiTest = {
          status: testResponse.status,
          ok: testResponse.ok,
          statusText: testResponse.statusText
        };
      } catch (error) {
        apiTest = { error: error.message };
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weather System Diagnostics</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f5f5f7; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .status { padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 500; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
          .code { background: #f8f9fa; padding: 15px; border-radius: 6px; font-family: monospace; margin: 15px 0; }
          button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌤️ Weather System Diagnostics</h1>
          
          ${hasApiKey ? `
            <div class="status success">
              <h3>✅ OpenWeatherMap API Key: CONFIGURED</h3>
              <p>API key is present and appears valid (${apiKey.length} characters)</p>
              ${apiTest ? `
                <p><strong>API Test Result:</strong> ${apiTest.ok ? '✅ Working' : '❌ Failed'} (Status: ${apiTest.status})</p>
              ` : ''}
            </div>
          ` : `
            <div class="status error">
              <h3>❌ OpenWeatherMap API Key: MISSING</h3>
              <p>Current value: "${apiKey || 'undefined'}"</p>
              <p><strong>This is why weather is broken!</strong></p>
            </div>
          `}

          <div class="status info">
            <h3>🔧 How to Fix Weather</h3>
            <p>You need to set the <code>OPENWEATHER_API_KEY</code> environment variable in Render:</p>
            
            <ol>
              <li><strong>Get API Key:</strong> Sign up at <a href="https://openweathermap.org/api" target="_blank">OpenWeatherMap</a> (free)</li>
              <li><strong>Set in Render:</strong> Go to your service → Environment → Add Variable</li>
              <li><strong>Variable Name:</strong> <code>OPENWEATHER_API_KEY</code></li>
              <li><strong>Variable Value:</strong> Your API key from OpenWeatherMap</li>
              <li><strong>Redeploy:</strong> Weather will work immediately</li>
            </ol>
          </div>

          <div class="status warning">
            <h3>📋 Current Environment Variables</h3>
            <div class="code">
              OPENWEATHER_API_KEY: ${apiKey ? `"${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}"` : 'NOT SET'}<br>
              NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}<br>
              DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}
            </div>
          </div>

          <div style="margin-top: 40px;">
            <button onclick="window.location.href='https://gotogether-m2g9.onrender.com'">
              🏕️ Back to GoTogether
            </button>
            <button onclick="window.location.href='https://openweathermap.org/api'" target="_blank">
              🌤️ Get API Key
            </button>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Weather diagnostics error:', error);
    res.status(500).send(`
      <h1>❌ Weather Diagnostics Failed</h1>
      <p>Error: ${error.message}</p>
    `);
  }
});

module.exports = router;
