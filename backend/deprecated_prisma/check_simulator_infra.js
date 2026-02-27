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
async function check() {
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
    console.log('Found', protocols.length, 'active protocols');
    for (const proto of protocols) {
        console.log(`Protocol: ${proto.configName} (${proto.protocolType}) - ${proto.devices.length} devices`);
        for (const device of proto.devices) {
            if (device.datasheetProfile) {
                console.log(`  Device: ${device.deviceName} has datasheet profile: ${device.datasheetProfile.name}`);
                console.log(`    Total Points in Profile: ${device.datasheetProfile.points.length}`);
                const validPoints = device.datasheetProfile.points.filter(p => {
                    const address = proto.protocolType === 'MODBUS'
                        ? p.registerAddress
                        : (p.scadaAddress || p.ioa1ObjectAddress);
                    return address !== null;
                });
                console.log(`    Valid Points (with addresses): ${validPoints.length}`);
                if (validPoints.length > 0) {
                    console.log(`    Sample Point Address: ${proto.protocolType === 'MODBUS' ? validPoints[0].registerAddress : (validPoints[0].scadaAddress || validPoints[0].ioa1ObjectAddress)}`);
                }
            }
            else {
                console.log(`  Device: ${device.deviceName} has NO datasheet profile.`);
            }
        }
    }
    process.exit(0);
}
check();
