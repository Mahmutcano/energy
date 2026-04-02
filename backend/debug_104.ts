
import { db } from './src/db';
import * as schema from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("--- IEC104 CONFIGS ---");
    const iecConfigs = await db.query.iec104Config.findMany({
        with: { protocol: true }
    });
    console.log(JSON.stringify(iecConfigs, null, 2));

    console.log("\n--- DATASHEET POINTS (IEC104) ---");
    const points = await db.query.datasheetPoint.findMany({
        limit: 10
    });
    console.log(JSON.stringify(points, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
