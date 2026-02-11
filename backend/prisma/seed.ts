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
    const password = '1';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            password: hashedPassword,
        },
        create: {
            email: email,
            password: hashedPassword,
            name: 'Master Operator',
            role: 'SUPER_ADMIN',
        },
    });

    console.log(`✅ Default user created:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    await pool.end();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
