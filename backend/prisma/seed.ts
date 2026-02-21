import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('🌱 Seeding database...');

    const email = '1';
    const user = await prisma.appUser.upsert({
        where: { email: email },
        update: {},
        create: {
            userCode: Math.random().toString(36).substring(7),
            email: email,
            firstName: 'Master',
            lastName: 'Operator',
            adminType: 'SUPER_ADMIN',
        },
    });

    console.log(`✅ Default user created:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.adminType}`);

    await pool.end();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
