import { io, Socket } from 'socket.io-client';

const PRODUCTION_URL = 'https://amusing-inspiration-production-a099.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
        ? PRODUCTION_URL
        : 'http://localhost:3001');

class SocketService {
    private static instance: SocketService;
    public socket: Socket;

    private constructor() {
        this.socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            transports: ['websocket', 'polling']
        });

        this.setupListeners();
    }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('[SOCKET] Connected to server');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SOCKET] Disconnected:', reason);
            if (reason === 'io server disconnect') {
                // The disconnection was initiated by the server, you need to reconnect manually
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[SOCKET] Connection Error:', error);
        });

        this.socket.on('reconnect_attempt', () => {
            console.log('[SOCKET] Reconnecting...');
        });
    }
}

export const socketService = SocketService.getInstance();
export const socket = socketService.socket;
