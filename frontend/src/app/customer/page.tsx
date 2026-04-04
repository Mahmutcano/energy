"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Activity, Zap, Cpu, AlertTriangle, BarChart3, Clock, Database, ArrowUpRight, ArrowDownRight, Droplets, Waves, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { io, Socket } from "socket.io-client";

export default function KineticDashboard() {
    const { companyProfile, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState<any[]>([]);
    const [liveData, setLiveData] = useState<Record<string, any>>({});
    const [stats, setStats] = useState({ L1: 230.1, L2: 231.5, L3: 229.8, TotalA: 0 });
    const socketRef = useRef<Socket | null>(null);

    // Initial load: Fetch plants and their points
    useEffect(() => {
        const init = async () => {
            try {
                const plants = await apiRequest('/plants');
                if (plants && plants.length > 0) {
                    const protocolId = plants[0].protocolConfigId;
                    setupSocket(protocolId);
                }
            } catch (err) {
                console.error("Dashboard Init Error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => { socketRef.current?.disconnect(); };
    }, []);

    const setupSocket = (protocolId: string) => {
        const socket = io(process.env.NEXT_PUBLIC_API_URL || '', {
            path: '/socket.io',
            transports: ['websocket']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("[SOCKET] Connected, Joining Room:", protocolId);
            socket.emit('join:protocol', { protocolId });
        });

        socket.on('telemetry:update', (data: any) => {
            setLiveData(prev => {
                const updated = { ...prev };
                const history = prev[data.PointID] ? [...prev[data.PointID].history, data] : [data];
                updated[data.PointID] = { ...data, history: history.slice(-50) };
                return updated;
            });

            // Update stats based on measurement type
            // Note: This mapping should match your actual MEASUREMENT_TYPES
            if (data.Name.includes('Phase A') || data.Name.includes('L1')) setStats(prev => ({ ...prev, L1: data.Value }));
            if (data.Name.includes('Phase B') || data.Name.includes('L2')) setStats(prev => ({ ...prev, L2: data.Value }));
            if (data.Name.includes('Phase C') || data.Name.includes('L3')) setStats(prev => ({ ...prev, L3: data.Value }));
        });
    };

    // Helper to get history for a specific measurement category
    const getCategoryData = (types: string[]) => {
        // Simplified for visual review - in real app we filter by measurementType
        const merged: any[] = [];
        // Map last 20 points from history
        return Array.from({ length: 20 }, (_, i) => ({
            time: `${i}:00`,
            p1: (stats.L1 || 230) + Math.random() * 2,
            p2: (stats.L2 || 231) + Math.random() * 2,
            p3: (stats.L3 || 229) + Math.random() * 2,
            power: 800 + Math.random() * 50,
            energy: 1200 + i * 2,
        }));
    };

    if (loading) {
        return <div className="min-h-screen bg-[#05080F] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-neon-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#00E5FF]" />
                <span className="text-[10px] font-black text-neon-blue tracking-[0.5em] animate-pulse uppercase">Syncing Live Stream</span>
            </div>
        </div>;
    }

    return (
        <div className="space-y-10 pb-24 customer-theme">
            {/* VOLTAGE MONITORING SECTION */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Waves size={18} className="text-neon-blue" />
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase">Voltage Monitoring</h2>
                    <div className="h-px flex-1 bg-white/5" />
                    <div className="flex gap-4">
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-cyan"><span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_#00E5FF]" /> PHASE A</span>
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-lime"><span className="w-1.5 h-1.5 rounded-full bg-neon-lime shadow-[0_0_8px_#CCFF00]" /> PHASE B</span>
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-orange"><span className="w-1.5 h-1.5 rounded-full bg-neon-orange shadow-[0_0_8px_#FF3300]" /> PHASE C</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="volt-card p-6 h-[320px] relative overflow-hidden">
                        <div className="absolute top-4 left-6 z-10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Phase-to-Neutral (L-N)</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getCategoryData(['PHASE_VOLTAGE'])}>
                                <defs>
                                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.1}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[210, 250]} hide />
                                <Tooltip contentStyle={{ background: '#0A0E17', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                                <Area type="monotone" dataKey="p1" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorA)" />
                                <Area type="monotone" dataKey="p2" stroke="#CCFF00" strokeWidth={2} fill="transparent" />
                                <Area type="monotone" dataKey="p3" stroke="#FF3300" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex justify-between mt-4 px-2">
                             {[
                                { l: 'L1:N', v: `${stats.L1.toFixed(1)}v`, c: 'text-neon-cyan' },
                                { l: 'L2:N', v: `${stats.L2.toFixed(1)}v`, c: 'text-neon-lime' },
                                { l: 'L3:N', v: `${stats.L3.toFixed(1)}v`, c: 'text-white' },
                                { l: 'AVG', v: `${((stats.L1+stats.L2+stats.L3)/3).toFixed(1)}v`, c: 'text-white/40' },
                             ].map((v, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-[8px] font-bold text-white/20 uppercase mb-1">{v.l}</div>
                                    <div className={`text-sm font-black italic tracking-tighter ${v.c}`}>{v.v}</div>
                                </div>
                             ))}
                        </div>
                    </div>

                    <div className="volt-card p-6 h-[320px] relative overflow-hidden">
                        <div className="absolute top-4 left-6 z-10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Load Distribution</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getCategoryData(['PHASE_CURRENT'])}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide />
                                <Tooltip contentStyle={{ background: '#0A0E17', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                                <Line type="stepAfter" dataKey="power" stroke="#00E5FF" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="p1" stroke="#FF3300" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* LOWER STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Power Factor */}
                 <div className="volt-card p-6 bg-gradient-to-t from-neon-blue/5 to-transparent flex flex-col justify-between items-center text-center h-64">
                    <span className="text-[10px] font-black text-white/20 tracking-[0.4em] uppercase italic">Power Factor</span>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-white/5 rounded-full border-t-neon-blue shadow-[0_0_20px_#00E5FF] animate-spin-slow rotate-[230deg]" />
                        <div className="text-3xl font-black italic text-white">0.98</div>
                    </div>
                    <span className="text-[8px] font-black text-neon-blue tracking-[0.5em] uppercase italic bg-neon-blue/10 px-4 py-1 rounded-full">Lagging</span>
                 </div>

                 {/* Active Power */}
                 <div className="volt-card p-6 h-64 flex flex-col justify-between border-l-2 border-neon-orange">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Live Active Power</span>
                    <div className="space-y-1">
                        <div className="text-3xl font-black text-white italic tracking-tighter">842.5 <span className="text-xs text-neon-orange">kW</span></div>
                        <div className="text-[8px] font-bold text-neon-lime tracking-widest uppercase">Stable Load</div>
                    </div>
                    <div className="h-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getCategoryData(['ACTIVE_POWER'])}>
                                <Bar dataKey="p1" fill="#FF3300" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Energy */}
                 <div className="volt-card p-6 h-64 flex flex-col justify-between">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Energy Accumulation</span>
                    <div className="text-3xl font-black text-white italic">1,240 <span className="text-xs text-neon-lime">kWh</span></div>
                    <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getCategoryData(['ENERGY'])}>
                                <Area type="step" dataKey="energy" stroke="#CCFF00" fill="#CCFF00" fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            </div>

            <style jsx global>{`
                .customer-theme {
                    --neon-blue: #00E5FF;
                    --neon-orange: #FF3300;
                    --neon-lime: #CCFF00;
                }
                .volt-card {
                    background: rgba(10, 14, 23, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .volt-card:hover {
                    border-color: rgba(0, 229, 255, 0.2);
                    box-shadow: 0 0 30px rgba(0, 229, 255, 0.08);
                }
                .text-neon-cyan { color: #00E5FF; }
                .text-neon-lime { color: #CCFF00; }
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
