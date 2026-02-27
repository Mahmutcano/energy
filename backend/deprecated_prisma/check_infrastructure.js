"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
async function check() {
    try {
        const plants = await prisma_1.default.plant.count();
        const devices = await prisma_1.default.device.count();
        const points = await prisma_1.default.datasheetPoint.count();
        const protocols = await prisma_1.default.protocolConfig.count();
        console.log('Plants:', plants);
        console.log('Devices:', devices);
        console.log('Points:', points);
        console.log('Protocols:', protocols);
    }
    catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
