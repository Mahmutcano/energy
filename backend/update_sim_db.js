const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateConfigs() {
    try {
        console.log('Connecting to database...');
        // Update ModbusConfig
        await pool.query('UPDATE "ModbusConfig" SET "ipAddress" = $1, "port" = $2', ['127.0.0.1', 5020]);
        console.log('ModbusConfig updated to 127.0.0.1:5020');

        // Update IEC104Config
        await pool.query('UPDATE "IEC104Config" SET "ipAddress" = $1, "port" = $2', ['127.0.0.1', 2404]);
        console.log('IEC104Config updated to 127.0.0.1:2404');

        console.log('Successfully updated all simulation addresses in DB');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await pool.end();
    }
}

updateConfigs();
