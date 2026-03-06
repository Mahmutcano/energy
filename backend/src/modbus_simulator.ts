import * as Modbus from 'jsmodbus';
import * as net from 'net';

/**
 * MODBUS TCP SLAVE SIMULATOR
 * This script simulates a real industrial Modbus device on port 5020.
 */

const PORT = 5020;
const netServer = new net.Server();
const server = new Modbus.server.TCP(netServer);

// Initialize some holding registers
const holdingRegisters = server.holding;

console.log('[MODBUS SIM] Starting Virtual Modbus Device...');

// Simulate high-frequency dynamic data
setInterval(() => {
    // Voltage (220.0 - 224.0V)
    const voltage = 220 + Math.random() * 4;
    // Write Float32 for more precision (takes 2 registers)
    holdingRegisters.writeFloatBE(voltage, 0);

    const current = 10 + Math.random() * 2;
    holdingRegisters.writeFloatBE(current, 4);

    const power = (voltage * current) / 10;
    holdingRegisters.writeFloatBE(power, 8);
}, 200);

netServer.listen(PORT, () => {
    console.log(`[MODBUS SIM] Virtual Modbus Slave running on port ${PORT}`);
});

netServer.on('connection', (socket) => {
    console.log(`[MODBUS SIM] Master connected from ${socket.remoteAddress}`);
});
