
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;

// Historical data is saved to PostgreSQL (TelemetryValue table).
// For Prisma 7.3.0 + Accelerate Proxy (db.prisma.io), we use the Driver Adapter.
// We must carefully handle the SSL for this proxy.
const pool = new Pool({
    connectionString: url,
    // Some proxies like db.prisma.io work better without manual SSL object 
    // if the connection string already has sslmode=require.
    // However, if that fails, we try rejectUnauthorized: false.
    ssl: url?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
});

const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma = new PrismaClient({ adapter });

export default prisma;
