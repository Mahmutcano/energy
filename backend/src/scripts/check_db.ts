import prisma from '../lib/prisma';

async function check() {
    try {
        const count = await prisma.telemetryValue.count();
        const latest = await prisma.telemetryValue.findMany({
            orderBy: { measurementTime: 'desc' },
            take: 5
        });
        console.log('Total Records:', count);
        console.log('Latest Records:', JSON.stringify(latest, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
