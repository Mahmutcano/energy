import { server, io } from './app';
import { IEC104Service } from './services/iec104.service';
import modbusService from './services/modbus.service';
import workerService from './services/worker.service';

const PORT = process.env.PORT || 3001;

// Global Error Handling
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    // Give some time for logs to flush before exiting
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const startServer = () => {
    server.listen(PORT, () => {
        console.log(`SCADA Backend running on port ${PORT}`);

        // 1. Veri İşleyiciyi Başlat (Processor/Worker)
        workerService.start();

        // 2. Haberleşme Servislerini Başlat (Collectors)
        const iec104Service = IEC104Service.getInstance();
        iec104Service.start();

        modbusService.start();
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
