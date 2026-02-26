
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: url,
    ssl: url?.includes('localhost') ? false : { rejectUnauthorized: false },
    // Connection pool tuning for SCADA workload
    max: 20,             // Increased from 10 for concurrent batch writes
    min: 5,              // Keep minimum connections warm
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout for new connections
    statement_timeout: 10000, // 10s query timeout to prevent hung queries
});

// Monitor pool health
pool.on('error', (err) => {
    console.error('[POOL] Unexpected error on idle client:', err);
});

const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma = new PrismaClient({ adapter });

export default prisma;
export { pool };
