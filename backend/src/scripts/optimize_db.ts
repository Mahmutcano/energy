
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function optimizeDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database. Starting optimization...');

        // 1. Convert to Hypertable (This might fail if data already exists and isn't partitioned, but we'll try)
        // Note: Prisma uses double quotes for table names usually
        try {
            await client.query(`SELECT create_hypertable('"TelemetryValue"', 'measurementTime', if_not_exists => TRUE);`);
            console.log('Successfully converted TelemetryValue to Hypertable.');
        } catch (e: any) {
            console.warn('Hypertable conversion notice:', e.message);
        }

        // 2. Set Compression Policy (Compression reduces disk usage by 90%+)
        await client.query(`
            ALTER TABLE "TelemetryValue" SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = '"pointId"'
            );
        `);

        try {
            await client.query(`SELECT add_compression_policy('"TelemetryValue"', INTERVAL '7 days', if_not_exists => TRUE);`);
            console.log('Enabled compression policy (older than 7 days).');
        } catch (e: any) {
            console.warn('Compression policy notice:', e.message);
        }

        // 3. Set Retention Policy (Delete data older than 30 days)
        try {
            await client.query(`SELECT add_retention_policy('"TelemetryValue"', INTERVAL '30 days', if_not_exists => TRUE);`);
            console.log('Enabled retention policy (30 days).');
        } catch (e: any) {
            console.warn('Retention policy notice:', e.message);
        }

        console.log('Optimization completed successfully!');
    } catch (err) {
        console.error('Optimization failed:', err);
    } finally {
        await client.end();
    }
}

optimizeDatabase();
