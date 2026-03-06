import { server, io, app } from './app';
import { IEC104Service } from './services/iec104.service';
import modbusService from './services/modbus.service';
import workerService from './services/worker.service';

const PORT = process.env.PORT || 3001;

// Global Error Handling
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    // Only kill the process for truly unrecoverable errors
    const fatalErrors = ['ENOMEM', 'ENOSPC', 'ERR_WORKER_OUT_OF_MEMORY'];
    const isFatal = fatalErrors.some(code => err.message?.includes(code) || (err as any).code === code);

    if (isFatal) {
        console.error('[CRITICAL] Fatal error detected. Shutting down...');
        setTimeout(() => process.exit(1), 1000);
    } else {
        console.warn('[CRITICAL] Non-fatal uncaught exception. Continuing operation for 24/7 data recording...');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Root health check for cloud providers
app.get('/', (req, res) => {
    res.send('OK');
});

const startServer = () => {
    console.log(`[INIT] Starting SCADA Backend... Env PORT: ${process.env.PORT || 'not set'}`);

    // Explicitly bind to 0.0.0.0 for Docker containers
    const host = '0.0.0.0';
    const portNumber = Number(PORT);

    server.listen(portNumber, host, async () => {
        console.log(`=================================================`);
        console.log(`SCADA Backend is now listening on http://${host}:${portNumber}`);
        console.log(`Active Environment Variables: ${Object.keys(process.env).filter(k => !k.includes('PASS') && !k.includes('SECRET') && !k.includes('URL')).join(', ')}`);
        console.log(`=================================================`);

        try {
            // 0. Initialize TimescaleDB (Async, in background after listen)
            console.log('[INIT] Initializing TimescaleDB...');
            const { initTimescaleDb } = await import('./utils/telemetry');
            await initTimescaleDb();
            console.log('[INIT] TimescaleDB initialization finished.');

            // 1. Start Persistence & Watchdog
            console.log('[INIT] Starting Worker service...');
            workerService.start();

            // 2. Start Communication Services (Collectors)
            console.log('[INIT] Starting Communication services...');
            const iec104Service = IEC104Service.getInstance();
            iec104Service.start();
            modbusService.start();
            console.log('[INIT] All services are running.');

        } catch (err) {
            console.error('[INIT] Critical Error during background initialization:', err);
            // We don't exit here because the HTTP server is alive and handles requests
        }
    });

    server.on('error', (err: any) => {
        console.error('[SERVER ERROR] Error:', err);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Retrying in 5s...`);
            setTimeout(startServer, 5000);
        } else {
            process.exit(1);
        }
    });
};

// Graceful Shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        io.close(() => {
            console.log('Sockets closed.');
            process.exit(0);
        });
    });

    // Force exit after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
