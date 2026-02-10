import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import deviceRoutes from './routes/device.routes';
import powerPlantRoutes from './routes/powerPlant.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', deviceRoutes);
app.use('/api', powerPlantRoutes);

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
