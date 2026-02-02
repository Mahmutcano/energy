import * as net from 'net';

/**
 * MOCK IEC 60870-5-104 RTU SERVER (SLAVE)
 * This script simulates a real industrial hardware device on port 2404.
 */

const PORT = 2404;
const HOST = '127.0.0.1';

const server = net.createServer((socket) => {
    console.log(`[RTU SIM] Master connected from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        // Basic IEC 104 Handshake Handling
        // 68 04 07 00 00 00 -> STARTDT ACT
        if (data[0] === 0x68 && data[2] === 0x07) {
            console.log('[RTU SIM] Received STARTDT ACT. Sending STARTDT CON...');
            const response = Buffer.from([0x68, 0x04, 0x0b, 0x00, 0x00, 0x00]);
            socket.write(response);

            // Start sending telemetry data periodically
            const interval = setInterval(() => {
                if (socket.writable) {
                    // Sending M_ME_NC_1 (Measured value, short floating point)
                    // ASDU Type 13
                    const dataPacket = generateDataPacket(100, 250 + Math.random() * 50); // IOA 100: Active Power
                    socket.write(dataPacket);

                    const dataPacket2 = generateDataPacket(101, 230 + Math.random() * 2); // IOA 101: Voltage
                    socket.write(dataPacket2);
                } else {
                    clearInterval(interval);
                }
            }, 2000);
        }
    });

    socket.on('end', () => console.log('[RTU SIM] Master disconnected'));
    socket.on('error', (err) => console.error('[RTU SIM] Socket error:', err));
});

function generateDataPacket(ioa: number, value: number): Buffer {
    // Minimalistic IEC 104 Frame for demonstrating connection
    // This is a simplified version of ASDU Type 13
    const apdu = Buffer.alloc(20);
    apdu[0] = 0x68; // Start byte
    apdu[1] = 18;   // Length
    apdu[2] = 0x00; // Control field
    apdu[3] = 0x00;
    apdu[4] = 0x00;
    apdu[5] = 0x00;

    // ASDU Header
    apdu[6] = 13;   // Type ID: M_ME_NC_1
    apdu[7] = 1;    // Variable Structure Qualifier
    apdu[8] = 3;    // COT: Spontaneous
    apdu[9] = 0;
    apdu[10] = 1;   // Common Address
    apdu[11] = 0;

    // IOA (3 bytes)
    apdu[12] = ioa & 0xFF;
    apdu[13] = (ioa >> 8) & 0xFF;
    apdu[14] = (ioa >> 16) & 0xFF;

    // Value (Float32)
    const floatBuf = Buffer.alloc(4);
    floatBuf.writeFloatLE(value);
    floatBuf.copy(apdu, 15);

    apdu[19] = 0x00; // SIQ (Status)

    return apdu;
}

server.listen(PORT, HOST, () => {
    console.log(`[RTU SIM] Virtual Device (Slave) running at ${HOST}:${PORT}`);
});
