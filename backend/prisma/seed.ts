import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('🌱 Starting Demo Seeding...');

    // 1. Create User
    const user = await prisma.appUser.upsert({
        where: { email: '1' },
        update: {},
        create: {
            userCode: 'SUPER_01',
            email: '1',
            firstName: 'Master',
            lastName: 'Operator',
            adminType: 'SUPER_ADMIN',
        },
    });

    // 2. Create Company
    const company = await prisma.companyProfile.upsert({
        where: { name: 'Demo Energy Corp' },
        update: {},
        create: {
            name: 'Demo Energy Corp',
            isActive: true,
        },
    });

    // 3. Create Plant
    const plant = await prisma.plant.create({
        data: {
            company_id: company.id,
            plantName: 'Demo Solar Farm',
            plantType: 'SOLAR',
            isActive: true,
        }
    });

    // 4. Create Protocol Config (Modbus)
    const modbusProto = await prisma.protocolConfig.create({
        data: {
            plant_id: plant.id,
            protocolType: 'MODBUS',
            configName: 'Inverter Protocol',
            isActive: true,
            modbusConfig: {
                create: {
                    ipAddress: '127.0.0.1',
                    port: 5020,
                    slaveId: 1,
                    timeout: 5000,
                    retryCount: 3
                }
            }
        }
    });

    // 5. Create Datasheet Profile
    const profile = await prisma.datasheetProfile.create({
        data: {
            name: 'Generic Inverter Profile',
            protocolType: 'MODBUS',
            points: {
                create: [
                    { dataName: 'Active Power', registerAddress: 0, dataType: 'kW' },
                    { dataName: 'Grid Voltage', registerAddress: 1, dataType: 'V' },
                    { dataName: 'Current', registerAddress: 2, dataType: 'A' },
                    { dataName: 'Frequency', registerAddress: 3, dataType: 'Hz' }
                ]
            }
        }
    });

    // 6. Create Device
    await prisma.device.create({
        data: {
            deviceName: 'Solar Inverter 01',
            deviceType: 'INVERTER',
            protocol_config_id: modbusProto.id,
            datasheet_profile_id: profile.id,
            isActive: true
        }
    });

    console.log('✅ Demo Seeding Finished!');
    console.log('--- Summary ---');
    console.log('User:', user.email);
    console.log('Plant:', plant.plantName);
    console.log('Protocol:', modbusProto.configName);
    console.log('--- Now the simulation will push data for these points ---');

    await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
