
import prisma from './lib/prisma';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
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
            } else {
                console.log(`  Device: ${device.deviceName} has NO datasheet profile.`);
            }
        }
    }
    process.exit(0);
}

check();
