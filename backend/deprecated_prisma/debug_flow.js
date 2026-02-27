"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function debug() {
    console.log('--- Telemetry Flow Debugger ---');
    try {
        const countBefore = await prisma_1.default.telemetryValue.count();
        console.log('Count Before:', countBefore);
        console.log('Starting services manually...');
        // We won't call service.start() because it has internal loops.
        // Instead, we will simulate ONE cycle.
        // 1. Check points
        const protocols = await prisma_1.default.protocolConfig.findMany({
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
        const redisService = (await Promise.resolve().then(() => __importStar(require('./services/redis.service')))).default;
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
                if (processedCount >= generatedCount)
                    break;
            }
            else {
                break;
            }
        }
        console.log(`Popped ${processedCount} items from Redis.`);
        // 4. Save to DB
        if (itemsToSave.length > 0) {
            const { saveTelemetryBatch } = await Promise.resolve().then(() => __importStar(require('./utils/telemetry')));
            console.log(`Saving batch of ${itemsToSave.length} to DB...`);
            await saveTelemetryBatch(itemsToSave);
        }
        const countAfter = await prisma_1.default.telemetryValue.count();
        console.log('Count After:', countAfter);
        console.log('Delta:', countAfter - countBefore);
    }
    catch (err) {
        console.error('Debug Error:', err.message);
        if (err.stack)
            console.error(err.stack);
    }
    process.exit(0);
}
debug();
