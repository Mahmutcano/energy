"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Activity, 
    Zap, 
    ArrowUpRight, 
    ArrowDownRight, 
    Signal, 
    Layers, 
    BarChart3, 
    ChevronRight,
    ShieldAlert,
    Cpu,
    Terminal,
    TrendingUp,
    ZapOff
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    BarChart, 
    Bar,
    Cell
} from 'recharts';

// --- MEASUREMENT CATEGORIES ---
const CATEGORIES = [
    { id: 'voltage', label: 'VOLTAGE', icon: Zap, color: '#00E5FF' },
    { id: 'current', label: 'CURRENT', icon: Activity, color: '#CCFF00' },
    { id: 'power', label: 'POWER', icon: BarChart3, color: '#FF3300' },
    { id: 'energy', label: 'ENERGY', icon: Layers, color: '#8B5CF6' },
    { id: 'quality', label: 'QUALITY', icon: ShieldAlert, color: '#10B981' },
    { id: 'system', label: 'SYSTEM', icon: Cpu, color: '#6366F1' },
];

export default function KineticDashboard() {
    const { user } = useAuth();
    const [status, setStatus] = useState<string>("DISCONNECTED");
    const [liveData, setLiveData] = useState<Record<string, any>>({});
    const [activeTab, setActiveTab] = useState('voltage');

    useEffect(() => {
        const init = async () => {
            try {
                const res = await apiRequest('/api/comm-protocols');
                if (res.ok) {
                    const result = await res.json();
                    const protocols = (result && result.success) ? result.data : result;
                    if (Array.isArray(protocols) && protocols.length > 0) {
                        const pId = protocols[0].id;
                        setupSocket(pId);
                    }
                }
            } catch (err) {
                console.error("Dashboard Init Error:", err);
            }
        };
        init();
        return () => {
            socket.off('protocol:status');
            socket.off('telemetry:update');
        };
    }, []);

    const setupSocket = (pId: string) => {
        socket.emit('join:protocol', { protocolId: pId });

        socket.on('protocol:status', (data: any) => {
            if (data.status) setStatus(data.status);
        });

        socket.on('telemetry:update', (data: any) => {
            setLiveData(prev => {
                const updated = { ...prev };
                const pointId = data.pointId;
                const history = prev[pointId]?.history || [];
                updated[pointId] = { 
                    ...data, 
                    history: [...history, { ...data, t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }].slice(-30) 
                };
                return updated;
            });
        });
    };

    // Data Categorization Logic
    const categorizedData = useMemo(() => {
        const groups: Record<string, any[]> = { voltage: [], current: [], power: [], energy: [], quality: [], system: [] };

        Object.values(liveData).forEach(item => {
            const name = (item.name || '').toLowerCase();
            if (name.includes('voltage') || name.includes('gerilim') || name.includes('volt')) groups.voltage.push(item);
            else if (name.includes('current') || name.includes('akım') || name.includes('amper')) groups.current.push(item);
            else if (name.includes('power') || name.includes('güç') || name.includes('watt') || name.includes('kw')) groups.power.push(item);
            else if (name.includes('energy') || name.includes('enerji') || name.includes('kwh')) groups.energy.push(item);
            else if (name.includes('harmon') || name.includes('thd') || name.includes('flicker')) groups.quality.push(item);
            else groups.system.push(item);
        });

        return groups;
    }, [liveData]);

    const activeInfo = CATEGORIES.find(c => c.id === activeTab);

    return (
        <div className="space-y-8 animate-in-up">
            {/* Top Navigation / Tab Bar */}
            <div className="flex flex-wrap gap-4 p-2 bg-[#0A0E17]/60 backdrop-blur-xl border border-white/5 rounded-2xl">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all relative overflow-hidden group ${
                            activeTab === cat.id 
                            ? 'text-white' 
                            : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        <cat.icon size={16} className={activeTab === cat.id ? 'text-neon-blue' : 'opacity-40'} />
                        <span className="text-[10px] font-black tracking-[0.2em]">{cat.label}</span>
                        {activeTab === cat.id && (
                            <motion.div 
                                layoutId="active-tab-bg" 
                                className="absolute inset-0 bg-white/[0.03] -z-10" 
                            />
                        )}
                        {activeTab === cat.id && (
                            <motion.div 
                                layoutId="active-tab-glow" 
                                className="absolute bottom-0 left-4 right-4 h-0.5 bg-neon-blue shadow-[0_0_15px_#00E5FF]" 
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Dashboard Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-8"
                >
                    {/* Hero Section per Category */}
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-neon-blue/60 text-[10px] font-black tracking-[0.4em] uppercase">
                                <TrendingUp size={14} /> Vector Analysis
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                                {activeInfo?.label} OBSERVATORY
                            </h3>
                        </div>
                        <div className="flex items-center gap-4 bg-black/20 border border-white/5 px-4 py-2 rounded-xl">
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'CONNECTED' ? 'bg-neon-lime shadow-[0_0_10px_#CCFF00]' : 'bg-red-500'} animate-pulse`} />
                            <span className="text-[9px] font-black tracking-widest text-white/50 uppercase">REAL-TIME LINK: {status}</span>
                        </div>
                    </div>

                    <MeasurementGrid 
                        id={activeTab} 
                        data={categorizedData[activeTab]} 
                        color={activeInfo?.color} 
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function MeasurementGrid({ id, data, color }: { id: string, data: any[], color?: string }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center volt-card border-dashed">
                <div className="flex flex-col items-center opacity-20">
                    <ZapOff size={60} className="mb-6" />
                    <p className="text-xl font-black tracking-[0.5em] uppercase">No Active Stream</p>
                    <p className="text-[9px] uppercase tracking-widest mt-2">Awaiting hardware uplink for {id}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Value Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.slice(0, 4).map((p, i) => (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ delay: i * 0.1 }}
                        key={p.pointId}
                    >
                        <PointTile point={p} color={color} />
                    </motion.div>
                ))}
            </div>

            {/* Analysis Center */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 volt-card p-10 h-[450px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/5 blur-[120px] -z-10 transition-all group-hover:bg-neon-blue/10" />
                    
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-white/20 tracking-[0.4em] uppercase">Time-Series Data</span>
                            <h4 className="text-lg font-black text-white tracking-widest uppercase">System Evolution</h4>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-black tracking-[0.2em] text-slate-500 flex items-center gap-2">
                             <Terminal size={12} className="text-neon-blue" /> LIVE_UPLINK_1Hz
                        </div>
                    </div>

                    <div className="h-full w-full pb-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data[0]?.history || []}>
                                <defs>
                                    <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.01)" vertical={false} />
                                <XAxis dataKey="t" hide />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip 
                                    contentStyle={{ background: '#0A0E17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                    cursor={{ stroke: color, strokeWidth: 1 }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={color} 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill={`url(#grad-${id})`}
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="volt-card p-10 flex flex-col justify-between overflow-hidden relative">
                    <div className="space-y-1 mb-8">
                        <span className="text-[9px] font-black text-white/20 tracking-[0.4em] uppercase">Delta Variance</span>
                        <h4 className="text-lg font-black text-white tracking-widest uppercase">Point Spread</h4>
                    </div>
                    
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.slice(0, 5)}>
                                <XAxis dataKey="name" hide />
                                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                                    {data.slice(0, 5).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? color : 'rgba(255,255,255,0.05)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-8 space-y-4">
                        {data.slice(0, 3).map(p => (
                            <div key={p.pointId} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 group cursor-default">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-neon-blue transition-colors truncate max-w-[140px]">{p.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-white tabular-nums">{p.value?.toFixed(2)}</span>
                                    <span className="text-[9px] font-black text-slate-700">{p.unit}</span>
                                </div>
                            </div>
                        ))}
                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[9px] font-black tracking-[0.4em] text-white/40 hover:text-white uppercase mt-4">
                            Full Analysis <ChevronRight size={10} className="inline ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PointTile({ point, color }: { point: any, color?: string }) {
    const history = point.history || [];
    const val = typeof point.value === 'number' ? point.value : 0;
    const prev = history.length > 2 ? history[history.length - 2].value : val;
    const isUp = val >= prev;
    const delta = prev !== 0 ? ((val - prev) / Math.abs(prev)) * 100 : 0;

    return (
        <div className="volt-card p-8 h-64 flex flex-col justify-between group relative overflow-hidden backdrop-blur-3xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={50} className="text-white" />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${isUp ? 'text-neon-lime border-neon-lime/20 bg-neon-lime/10' : 'text-danger border-danger/20 bg-danger/10'}`}>
                    {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(delta).toFixed(1)}%
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_10px_#00E5FF] animate-pulse" />
            </div>

            <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase block leading-none truncate opacity-60" title={point.name}>
                    {point.name}
                </span>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white tracking-tighter italic">
                        {typeof val === 'number' ? val.toFixed(2) : val}
                    </h3>
                    <span className="text-xs font-black text-neon-blue lowercase tracking-tighter">{point.unit || ''}</span>
                </div>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-4 relative z-10">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(val / 5, 100)}%` }}
                    style={{ backgroundColor: color }}
                    className="h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    transition={{ duration: 1.5, ease: "circOut" }}
                />
            </div>
        </div>
    );
}
