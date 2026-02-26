import express from 'express';
import cors from 'cors';
import compression from 'compression';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import deviceRoutes from './routes/device.routes';
import plantRoutes from './routes/plant.routes';
import categoryRoutes from './routes/device-category.routes';
import protocolRoutes from './routes/protocol.routes';
import alarmRoutes from './routes/alarm.routes';
import userRoutes from './routes/user.routes';
import companyRoutes from './routes/company.routes';
import datasheetRoutes from './routes/datasheet.routes';
import systemRoutes from './routes/system.routes';
import telemetryRoutes from './routes/telemetry.routes';

const app = express();
app.use(compression({ threshold: 1024 })); // Compress responses > 1KB
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
// Admin routes (Modbus Test)
app.use('/api/admin', adminRoutes);

// Resource routes
app.use('/api', deviceRoutes);
app.use('/api', plantRoutes);
app.use('/api', categoryRoutes);
app.use('/api', protocolRoutes);
app.use('/api', alarmRoutes);
app.use('/api', userRoutes);
app.use('/api', companyRoutes);
app.use('/api', datasheetRoutes);
app.use('/api', telemetryRoutes);
app.use('/api/system', systemRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 15000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['websocket', 'polling'],
    // Enable WebSocket compression for telemetry streams
    perMessageDeflate: {
        threshold: 256, // Compress messages > 256 bytes
        zlibDeflateOptions: { level: 1 } // Fast compression (level 1)
    },
    maxHttpBufferSize: 1e6, // 1MB max message size
});

io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
        console.log(`[SOCKET] Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (error) => {
        console.error(`[SOCKET] Error for client ${socket.id}:`, error);
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

export { app, server, io };
