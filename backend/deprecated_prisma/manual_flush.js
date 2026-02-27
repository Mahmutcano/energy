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
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function check() {
    const client = new ioredis_1.default(process.env.REDIS_URL);
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
            const { saveTelemetryBatch } = await Promise.resolve().then(() => __importStar(require('./utils/telemetry')));
            await saveTelemetryBatch(items);
            console.log('Successfully saved to DB.');
        }
    }
    const dbCount = await prisma_1.default.telemetryValue.count();
    console.log('DB Telemetry Count:', dbCount);
    await client.quit();
    process.exit(0);
}
check();
