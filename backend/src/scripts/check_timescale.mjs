const { Pool } = require('pg');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, '../.env') });

async function checkHypertable() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query("SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'TelemetryValue'");
    if (res.rows.length > 0) {
      console.log('✅ TelemetryValue is already a TimescaleDB Hypertable.');
    } else {
      console.log('❌ TelemetryValue is a standard table. Need conversion.');
    }
  } catch (e) {
    console.error('TimescaleDB check error (extension might not be enabled):', e.message);
  } finally {
    await pool.end();
  }
}

checkHypertable();
