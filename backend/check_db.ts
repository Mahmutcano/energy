import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- COMPANIES ---");
    const companies = await prisma.companyProfile.findMany();
    console.log(JSON.stringify(companies, null, 2));

    console.log("\n--- PLANTS ---");
    const plants = await prisma.plant.findMany();
    console.log(JSON.stringify(plants, null, 2));

    console.log("\n--- PROTOCOLS ---");
    const protocols = await prisma.protocolConfig.findMany({
        include: { modbusConfig: true, iec104Config: true }
    });
    console.log(JSON.stringify(protocols, null, 2));

    console.log("\n--- DEVICES ---");
    const devices = await prisma.device.findMany({
        include: { datasheetProfile: { include: { points: true } } }
    });
    console.log(JSON.stringify(devices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
