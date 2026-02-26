const { Pool } = require('pg');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, '../.env') });

async function check() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query('SELECT COUNT(*) FROM "TelemetryValue"');
    console.log('Total Telemetry Records:', res.rows[0].count);
    
    const latest = await pool.query('SELECT * FROM "TelemetryValue" ORDER BY "measurementTime" DESC LIMIT 1');
    console.log('Latest Record:', latest.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
