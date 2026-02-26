import prisma from './src/lib/prisma';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("--- IEC104 CONFIGS ---");
    const iecConfigs = await prisma.iEC104Config.findMany({
        include: { protocol: true }
    });
    console.log(JSON.stringify(iecConfigs, null, 2));

    console.log("\n--- DATASHEET POINTS (IEC104) ---");
    const points = await prisma.datasheetPoint.findMany({
        where: { scadaAddress: { not: null } },
        take: 10
    });
    console.log(JSON.stringify(points, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
