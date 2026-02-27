
import prisma from './lib/prisma';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = new Redis(process.env.REDIS_URL as string);
    console.log('--- Redis Content Check ---');
    const len = await client.llen('telemetry_queue');
    console.log('Queue Length:', len);

    if (len > 0) {
        console.log('Popping 50 items and saving to DB...');
        const items = [];
        for (let i = 0; i < 50; i++) {
            const data = await client.lpop('telemetry_queue');
            if (data) {
                const parsed = JSON.parse(data);
                items.push({
                    deviceId: parsed.deviceId,
                    pointId: parsed.pointId,
                    value: parsed.value,
                    timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date()
                });
            }
        }

        console.log(`Popped ${items.length} items.`);

        if (items.length > 0) {
            const { saveTelemetryBatch } = await import('./utils/telemetry');
            await saveTelemetryBatch(items);
            console.log('Successfully saved to DB.');
        }
    }

    const dbCount = await prisma.telemetryValue.count();
    console.log('DB Telemetry Count:', dbCount);

    await client.quit();
    process.exit(0);
}

check();
