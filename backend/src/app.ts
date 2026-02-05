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
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

export { app, server, io };
