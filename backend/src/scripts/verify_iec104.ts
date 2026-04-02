
import { Protocol } from 'iec104-protocol';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
    console.log('--- IEC 60870-5-104 PROTOCOL VERIFICATION ---');
    
    // Config parameters (matched with setup_104_hardware.ts)
    const testParams = {
        ip: '178.242.103.255',
        port: 2404,
        asduAddr: 15644
    };

    console.log(`Connecting to hardware at ${testParams.ip}:${testParams.port} (ASDU: ${testParams.asduAddr})...`);
    
    const discoveredIOAs = new Set<number>();
    const conn = new Protocol(testParams.ip, testParams.port, (data: any[]) => {
        console.log(`✅ Data Received: ${data.length} PDUs detected.`);
        if (data.length > 0) {
            data.forEach(p => discoveredIOAs.add(p.IOA));
            console.log('--- DISCOVERED IOAs ---');
            console.log(Array.from(discoveredIOAs).sort((a,b) => a-b));
            console.log('--- EXAMPLE PAKET ---');
            console.log(JSON.stringify(data[0], null, 2));
            
            // Allow some time for more packets if needed, then exit
            setTimeout(() => {
                console.log(`Total Unique IOAs: ${discoveredIOAs.size}`);
                process.exit(0);
            }, 2000);
        }
    }, { autoReconnect: false, quiet: false });


    // Set connection handler to send GI once connected
    if ((conn as any).connection) {
        (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
            if (event === 2) { // STARTDT_CON
                console.log('🚀 Link Layer Established. Sending General Interrogation (GI)...');
                try {
                    (conn as any).connection.SendInterrogationCommand(6, testParams.asduAddr, 20);
                } catch (err) {
                    console.error('❌ Failed to send GI:', err);
                }
            } else if (event === 4) { // ERROR
                console.error('❌ Connection Error occurred.');
                process.exit(1);
            }
        }, null);
    }

    try {
        conn.connect();
        
        // Timeout after 15 seconds
        setTimeout(() => {
            console.error('❌ Timeout: No response received from hardware within 15s.');
            process.exit(1);
        }, 15000);
        
    } catch (err: any) {
        console.error('❌ Execution Failed:', err.message);
        process.exit(1);
    }
}

verify();
