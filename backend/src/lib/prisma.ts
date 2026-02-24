import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool optimizations
    max: 20,                    // Maximum pool size (default is 10)
    min: 2,                     // Keep minimum connections warm
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
    statement_timeout: 10000,   // Kill queries running longer than 10s
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
