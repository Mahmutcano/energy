import express from 'express';
import cors from 'cors';
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

const app = express();
app.use(cors());
app.use(express.json());

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

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // In production, replace with specific domain
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 10000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['websocket', 'polling']
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
