
import prisma from './lib/prisma';
import simulationService from './services/simulation.service';
import workerService from './services/worker.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function debug() {
    console.log('--- Telemetry Flow Debugger ---');
    try {
        const countBefore = await prisma.telemetryValue.count();
        console.log('Count Before:', countBefore);

        console.log('Starting services manually...');
        // We won't call service.start() because it has internal loops.
        // Instead, we will simulate ONE cycle.

        // 1. Check points
        const protocols = await prisma.protocolConfig.findMany({
            where: { isActive: true },
            include: {
                devices: {
                    where: { isActive: true },
                    include: {
                        datasheetProfile: {
                            include: {
                                points: { where: { isActive: true } }
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${protocols.length} active protocols.`);

        const redisService = (await import('./services/redis.service')).default;

        console.log('Simulating telemetry generation...');
        let generatedCount = 0;
        for (const proto of protocols) {
            for (const device of proto.devices) {
                if (device.datasheetProfile) {
                    for (const point of device.datasheetProfile.points) {
                        const address = proto.protocolType === 'MODBUS'
                            ? point.registerAddress
                            : (point.scadaAddress || point.ioa1ObjectAddress);

                        if (address !== null) {
                            await redisService.pushTelemetry({
                                deviceId: device.id,
                                pointId: point.id,
                                value: 200 + Math.random() * 50,
                                timestamp: new Date()
                            });
                            generatedCount++;
                        }
                    }
                }
            }
        }
        console.log(`Generated ${generatedCount} items.`);

        // 2. Wait a bit
        console.log('Waiting for queue to sync...');
        await new Promise(r => setTimeout(r, 2000));

        // 3. Process items manually
        console.log('Processing items in worker...');
        let processedCount = 0;
        const itemsToSave = [];

        // Try to pop items (since we are in same process, memory queue might be used)
        while (true) {
            // We use a small timeout to not wait forever if queue becomes empty
            // popTelemetry uses brpop 0 if redis is connected, which blocks forever.
            // Let's use redis client directly to check length if possible.
            // Actually, for debug, we will just assume they go to buffer.
            const item = await redisService.popTelemetry();
            if (item) {
                itemsToSave.push({
                    deviceId: item.deviceId,
                    pointId: item.pointId,
                    value: item.value,
                    timestamp: item.timestamp
                });
                processedCount++;
                if (processedCount >= generatedCount) break;
            } else {
                break;
            }
        }
        console.log(`Popped ${processedCount} items from Redis.`);

        // 4. Save to DB
        if (itemsToSave.length > 0) {
            const { saveTelemetryBatch } = await import('./utils/telemetry');
            console.log(`Saving batch of ${itemsToSave.length} to DB...`);
            await saveTelemetryBatch(itemsToSave);
        }

        const countAfter = await prisma.telemetryValue.count();
        console.log('Count After:', countAfter);
        console.log('Delta:', countAfter - countBefore);

    } catch (err: any) {
        console.error('Debug Error:', err.message);
        if (err.stack) console.error(err.stack);
    }
    process.exit(0);
}

debug();
