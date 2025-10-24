const fs = require('fs');
const path = require('path');
const pool = require('../database/db');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read and execute user schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('User schema created successfully!');
    
    // Read and execute camping schema
    const campingSchemaPath = path.join(__dirname, '../database/camping_schema.sql');
    const campingSchema = fs.readFileSync(campingSchemaPath, 'utf8');
    await pool.query(campingSchema);
    console.log('Camping schema created successfully!');
    
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables in database:', result.rows.map(row => row.table_name));
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

initializeDatabase();
