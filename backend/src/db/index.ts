
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

const timescalePool = new Pool({
    connectionString: process.env.TIMESCALE_URL,
    ssl: process.env.TIMESCALE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 50, // Higher limit for telemetry
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
export const timescaleDb = drizzle(timescalePool, { schema });
export { pool, timescalePool };
