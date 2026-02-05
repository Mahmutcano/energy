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

// Simulate dynamic data in registers
setInterval(() => {
    // Register 0: Voltage (210-230V)
    const voltage = Math.floor(210 + Math.random() * 20);
    holdingRegisters.writeUInt16BE(voltage, 0);

    // Register 1: Current (5-15A)
    const current = Math.floor(5 + Math.random() * 10);
    holdingRegisters.writeUInt16BE(current, 2); // Each register is 2 bytes

    // Register 2: Power (kW)
    const power = Math.floor((voltage * current) / 100);
    holdingRegisters.writeUInt16BE(power, 4);

    // console.log(`[MODBUS SIM] Data updated - V: ${voltage}V, I: ${current}A, P: ${power}kW`);
}, 2000);

netServer.listen(PORT, () => {
    console.log(`[MODBUS SIM] Virtual Modbus Slave running on port ${PORT}`);
});

netServer.on('connection', (socket) => {
    console.log(`[MODBUS SIM] Master connected from ${socket.remoteAddress}`);
});
