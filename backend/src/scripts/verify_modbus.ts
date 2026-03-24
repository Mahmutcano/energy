
import { ModbusService } from '../services/modbus.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
    console.log('--- MODBUS PROTOCOL VERIFICATION ---');
    const service = ModbusService.getInstance();

    const testParams = {
        ip: '127.0.0.1',
        port: 5020,
        slaveId: 1,
        address: 0,
        quantity: 2,
        functionCode: 3
    };

    console.log(`Connecting to simulator at ${testParams.ip}:${testParams.port}...`);
    
    try {
        const result = await service.testModbusConnection(testParams);
        console.log('✅ Connection Success!');
        console.log('Values:', result.values);
        
        if (result.values && result.values.length >= 2) {
            console.log('✅ Data read successfully.');
        } else {
            console.warn('⚠️ No values returned.');
        }
    } catch (err: any) {
        console.error('❌ Connection Failed:', err.message);
        process.exit(1);
    }
    
    process.exit(0);
}

verify();
