import prisma from '../lib/prisma';

async function check() {
    try {
        const plants = await prisma.plant.count();
        const devices = await prisma.device.count();
        const points = await prisma.datasheetPoint.count();
        const protocols = await prisma.protocolConfig.count();
        console.log('Plants:', plants);
        console.log('Devices:', devices);
        console.log('Points:', points);
        console.log('Protocols:', protocols);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
