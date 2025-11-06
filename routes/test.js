const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Comprehensive test page
router.get('/', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time');
    
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Check camping_trips columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'camping_trips'
      ORDER BY ordinal_position
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    const columns = columnsResult.rows;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GoTogether System Test</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f5f5f7; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .status { padding: 15px; border-radius: 8px; margin: 15px 0; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
          .test-section { margin: 30px 0; padding: 20px; border: 1px solid #e5e5e7; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f8f9fa; font-weight: 600; }
          button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; }
          button:hover { background: #0056b3; }
          .test-result { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏕️ GoTogether System Test Dashboard</h1>
          
          <div class="status success">
            <h3>✅ System Status: OPERATIONAL</h3>
            <p>Database connected at: ${dbTest.rows[0].current_time}</p>
          </div>

          <div class="test-section">
            <h3>📊 Database Tables (${tables.length} found)</h3>
            <div class="status info">
              <strong>Tables:</strong> ${tables.join(', ')}
            </div>
            
            <h4>camping_trips Table Structure:</h4>
            <table>
              <thead>
                <tr><th>Column Name</th><th>Data Type</th></tr>
              </thead>
              <tbody>
                ${columns.map(col => `<tr><td>${col.column_name}</td><td>${col.data_type}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>

          <div class="test-section">
            <h3>🧪 API Tests</h3>
            <button onclick="testAPI('/api/test')">Test Basic API</button>
            <button onclick="testAPI('/api/status/version')">Test Version</button>
            <button onclick="testAPI('/api/status/db')">Test DB Status</button>
            
            <div id="testResults"></div>
          </div>

          <div class="test-section">
            <h3>🎯 Quick Actions</h3>
            <button onclick="window.location.href='https://gotogether-m2g9.onrender.com'">
              🏕️ Go to Main App
            </button>
            <button onclick="window.location.href='/api/migrate/fix-coordinates-now'">
              🔧 Run Database Fix Again
            </button>
          </div>
        </div>

        <script>
          async function testAPI(endpoint) {
            const resultsDiv = document.getElementById('testResults');
            resultsDiv.innerHTML += '<div class="test-result">Testing ' + endpoint + '...</div>';
            
            try {
              const response = await fetch(endpoint);
              const data = await response.json();
              
              resultsDiv.innerHTML += '<div class="test-result"><strong>' + endpoint + ':</strong><br>' + 
                JSON.stringify(data, null, 2) + '</div>';
            } catch (error) {
              resultsDiv.innerHTML += '<div class="test-result" style="background: #f8d7da; color: #721c24;"><strong>' + 
                endpoint + ' ERROR:</strong><br>' + error.message + '</div>';
            }
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Test page error:', error);
    res.status(500).send(`
      <h1>❌ System Test Failed</h1>
      <p>Error: ${error.message}</p>
      <p>Check server logs for details.</p>
    `);
  }
});

module.exports = router;
