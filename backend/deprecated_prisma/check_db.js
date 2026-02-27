"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
async function check() {
    try {
        const count = await prisma_1.default.telemetryValue.count();
        const latest = await prisma_1.default.telemetryValue.findMany({
            orderBy: { measurementTime: 'desc' },
            take: 5
        });
        console.log('Total Records:', count);
        console.log('Latest Records:', JSON.stringify(latest, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    }
    catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
