"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Cpu, Power, ShieldAlert, Database, Layers,
    XOctagon, RefreshCw, Search, Filter,
    Heart, Clock, HardDrive, Server, Wifi, WifiOff, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface Device {
    id: string;
    deviceName: string;
    deviceType: string;
    isActive: boolean;
    protocol: {
        id: string;
        configName: string;
        protocolType: string;
        plant: { plantName: string }
    };
}

interface HealthData {
    status: string;
    responseTime: number;
    timestamp: string;
    checks: {
        postgresql: {
            status: string;
            latency: number | null;
            totalRecords: number;
            lastRecordAge: number | null;
            activeDevices: number;
            totalDevices: number;
            recording: boolean;
        };
        redis: {
            status: string;
            mode: string;
            queueLength: number | null;
        };
        worker: {
            status: string;
            bufferMode: string;
        };
        memory: {
            heapUsed: number;
            heapTotal: number;
            rss: number;
            external: number;
        };
        uptime: {
            seconds: number;
            formatted: string;
        };
    };
}

export default function SystemControl() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [health, setHealth] = useState<HealthData | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0, active: 0, passive: 0, totalMeasurements: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                const data = await res.json();
                setDevices(data);
                const active = data.filter((d: any) => d.isActive).length;
                setStats({ total: data.length, active, passive: data.length - active, totalMeasurements: 0 });
            }
            const statRes = await apiRequest('/api/system/schema-stats');
            if (statRes.ok) {
                const schema = await statRes.json();
                const telStat = schema.find((s: any) => s.id === 'TelemetryValue');
                if (telStat) setStats(prev => ({ ...prev, totalMeasurements: telStat.count }));
            }
        } catch (err) {
            toast.error("Failed to fetch system state");
        } finally {
            setLoading(false);
        }
    };

    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await apiRequest('/api/system/health-check');
            if (res.ok) setHealth(await res.json());
        } catch (err) {
            console.error('Health check failed:', err);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchHealth();
        const deviceInterval = setInterval(fetchData, 30000);
        const healthInterval = setInterval(fetchHealth, 10000);
        return () => { clearInterval(deviceInterval); clearInterval(healthInterval); };
    }, [fetchHealth]);

    const toggleDevice = async (device: Device) => {
        const nextState = !device.isActive;
        const loadingToast = toast.loading(`Toggling ${device.deviceName}...`);
        try {
            const res = await apiRequest(`/api/devices/${device.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: nextState })
            });
            if (res.ok) {
                toast.success(`${device.deviceName} is now ${nextState ? 'RECORDING' : 'PAUSED'}`, { id: loadingToast });
                setDevices(prev => prev.map(d => d.id === device.id ? { ...d, isActive: nextState } : d));
                setStats(prev => ({
                    ...prev,
                    active: nextState ? prev.active + 1 : prev.active - 1,
                    passive: nextState ? prev.passive - 1 : prev.passive + 1
                }));
            } else {
                toast.error("Failed to toggle device", { id: loadingToast });
            }
        } catch (err) {
            toast.error("Network error", { id: loadingToast });
        }
    };

    const bulkAction = async (action: 'START_ALL' | 'STOP_ALL') => {
        const confirm = window.confirm(`${action === 'START_ALL' ? 'Start recording for ALL devices?' : 'Emergency Stop for ALL recordings?'}`);
        if (!confirm) return;
        const loadingToast = toast.loading(`${action === 'START_ALL' ? 'Starting' : 'Stopping'} all devices...`);
        try {
            const targets = devices.filter(d => action === 'START_ALL' ? !d.isActive : d.isActive);
            for (const d of targets) {
                await apiRequest(`/api/devices/${d.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isActive: action === 'START_ALL' })
                });
            }
            toast.success("System state updated successfully", { id: loadingToast });
            fetchData();
        } catch (err) {
            toast.error("Error during bulk action", { id: loadingToast });
        }
    };

    const filteredDevices = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.configName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.plant.plantName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20 animate-in-up font-sans selection:bg-brand-green/30">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative p-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative group overflow-hidden">
                            <Layers size={28} className="text-brand-green relative z-10" />
                            <div className="absolute inset-0 bg-brand-green/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System <span className="text-brand-green">Control</span> Center</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                                    <Activity size={12} className="text-brand-green animate-pulse" /> Supervisor Mode
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stats.total} Linked Devices</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <button onClick={() => bulkAction('STOP_ALL')} className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest shadow-2xl group">
                        <XOctagon size={18} className="group-hover:rotate-12 transition-transform" /> Emergency Stop
                    </button>
                    <button onClick={() => bulkAction('START_ALL')} className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-2xl text-xs font-black hover:bg-brand-green hover:text-white transition-all uppercase tracking-widest shadow-2xl group">
                        <Power size={18} className="group-hover:scale-110 transition-transform" /> Start All
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-2">
                {[
                    { label: 'Instrumentation Health', val: stats.total, sub: 'Connected Nodes', icon: Cpu, color: 'text-brand-green', bg: 'bg-brand-green/5' },
                    { label: 'Recording Threads', val: stats.active, sub: 'Active Sampling', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/5', trend: 'ACTIVE', trendColor: 'text-brand-green' },
                    { label: 'Hibernation State', val: stats.passive, sub: 'Paused Devices', icon: Power, color: 'text-slate-500', bg: 'bg-slate-500/5', trend: 'OFFLINE', trendColor: 'text-slate-500' },
                    { label: 'Historical Reservoir', val: (stats.totalMeasurements / 1000).toFixed(1) + ' k', sub: 'Total Logged Points', icon: Database, color: 'text-brand-green', bg: 'bg-brand-green/5' },
                ].map((stat) => (
                    <div key={stat.label} className="card-base bg-slate-950/40 border-slate-800 shadow-2xl p-7 flex flex-col justify-between group">
                        <div className="flex justify-between items-start">
                            <div className={clsx("p-3 rounded-xl", stat.bg)}><stat.icon size={20} className={stat.color} /></div>
                            {stat.trend && (<span className={clsx("text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border border-white/5", stat.trendColor)}>{stat.trend}</span>)}
                        </div>
                        <div className="mt-8">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{stat.val}</span>
                                <span className="text-[10px] font-bold text-slate-700 uppercase">{stat.sub}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Device Table */}
            <div className="card-base bg-slate-950/60 border-slate-800 shadow-3xl overflow-hidden relative group">
                <div className="p-8 border-b border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 bg-slate-900/20">
                    <div className="flex items-center gap-6">
                        <h3 className="text-lg font-black text-white tracking-widest uppercase italic">Device <span className="text-brand-green">Registry</span></h3>
                        <div className="hidden md:block h-6 w-px bg-slate-800"></div>
                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div> Active</span>
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div> Paused</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input type="text" placeholder="Search device code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder:text-slate-700 outline-none focus:border-brand-green/30 transition-all" />
                        </div>
                        <button className="p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-white transition-colors"><Filter size={18} /></button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/40">
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/[0.03]">Device Identity</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/[0.03]">Context / Infrastructure</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/[0.03]">Protocol</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/[0.03] text-center">Persistence Status</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/[0.03] text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            <AnimatePresence>
                                {filteredDevices.map((device, idx) => (
                                    <motion.tr key={device.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="group/row hover:bg-white/[0.01] transition-all">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500", device.isActive ? "bg-brand-green/10 border-brand-green/20 text-brand-green shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-slate-900 border-slate-800 text-slate-700")}>
                                                    <Cpu size={18} className={device.isActive ? 'animate-pulse' : ''} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{device.deviceName}</span>
                                                    <span className="text-[9px] font-bold text-slate-600 font-mono tracking-widest uppercase">ID::{device.id.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-300">{device.protocol.plant.plantName}</span>
                                                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">{device.deviceType}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono">
                                                {device.protocol.protocolType} :: {device.protocol.configName}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center">
                                                {device.isActive ? (
                                                    <div className="flex flex-col items-center gap-1 group/status">
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                            <Activity size={12} className="animate-pulse" /> Recording
                                                        </div>
                                                        <span className="text-[8px] font-bold text-slate-700 uppercase opacity-0 group-hover/status:opacity-100 transition-opacity">Streaming to PostgreSQL</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                        <Power size={12} /> Paused
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-end">
                                                <button onClick={() => toggleDevice(device)}
                                                    className={clsx("relative w-14 h-7 rounded-full transition-all duration-300 flex items-center p-1 border shadow-inner",
                                                        device.isActive ? "bg-brand-green/20 border-brand-green/40 shadow-brand-green/10" : "bg-slate-900 border-slate-800")}>
                                                    <div className={clsx("w-5 h-5 rounded-full transition-all duration-500 shadow-xl",
                                                        device.isActive ? "translate-x-7 bg-brand-green shadow-brand-green/50" : "translate-x-0 bg-slate-700")}></div>
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {loading && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                        <RefreshCw size={40} className="text-brand-green animate-spin" />
                        <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.3em]">Synchronizing State...</span>
                    </div>
                )}
            </div>

            {/* Health Check & System Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-2">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 rounded-xl border border-white/[0.05]">
                                <Heart size={18} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Live Health Check</h3>
                                <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">Auto-refresh every 10 seconds</p>
                            </div>
                        </div>
                        <button onClick={fetchHealth} disabled={healthLoading} className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-brand-green/30 transition-all disabled:opacity-50">
                            <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* PostgreSQL */}
                        <div className={clsx("card-base p-6 space-y-5 border-l-4 transition-all", health?.checks.postgresql.status === 'HEALTHY' ? 'border-l-brand-green' : 'border-l-red-500')}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database size={20} className={health?.checks.postgresql.status === 'HEALTHY' ? 'text-brand-green' : 'text-red-500'} />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">PostgreSQL</span>
                                </div>
                                <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", health?.checks.postgresql.status === 'HEALTHY' ? 'text-brand-green bg-brand-green/10' : 'text-red-500 bg-red-500/10')}>{health?.checks.postgresql.status || '...'}</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Query Latency</span>
                                    <span className={clsx((health?.checks.postgresql.latency ?? 0) < 50 ? 'text-brand-green' : (health?.checks.postgresql.latency ?? 0) < 200 ? 'text-yellow-500' : 'text-red-500')}>{health?.checks.postgresql.latency ?? '--'}ms</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Total Records</span>
                                    <span className="text-white">{health?.checks.postgresql.totalRecords?.toLocaleString() ?? '--'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Last Record</span>
                                    <span className={clsx(health?.checks.postgresql.recording ? 'text-brand-green' : 'text-orange-400')}>{health?.checks.postgresql.lastRecordAge != null ? `${health.checks.postgresql.lastRecordAge}s ago` : 'No data'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Historian Stream</span>
                                    {health?.checks.postgresql.recording ? (<span className="flex items-center gap-1.5 text-brand-green"><Activity size={10} className="animate-pulse" /> Live</span>) : (<span className="text-slate-600">Idle</span>)}
                                </div>
                            </div>
                        </div>
                        {/* Redis */}
                        <div className={clsx("card-base p-6 space-y-5 border-l-4 transition-all", health?.checks.redis.status === 'HEALTHY' ? 'border-l-blue-500' : health?.checks.redis.status === 'FALLBACK' ? 'border-l-yellow-500' : 'border-l-red-500')}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap size={20} className={health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400' : 'text-yellow-500'} />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Redis Queue</span>
                                </div>
                                <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400 bg-blue-400/10' : health?.checks.redis.status === 'FALLBACK' ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10')}>{health?.checks.redis.status || '...'}</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Mode</span>
                                    <span className={clsx(health?.checks.redis.mode === 'REDIS' ? 'text-blue-400' : 'text-yellow-500')}>{health?.checks.redis.mode || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Queue Pending</span>
                                    <span className={clsx((health?.checks.redis.queueLength ?? 0) > 100 ? 'text-red-500' : 'text-brand-green')}>{health?.checks.redis.queueLength ?? '--'} items</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Connectivity</span>
                                    {health?.checks.redis.status === 'HEALTHY' ? (<span className="flex items-center gap-1.5 text-blue-400"><Wifi size={10} /> Connected</span>) : (<span className="flex items-center gap-1.5 text-yellow-500"><WifiOff size={10} /> Fallback</span>)}
                                </div>
                            </div>
                        </div>
                        {/* Worker */}
                        <div className={clsx("card-base p-6 space-y-5 border-l-4 transition-all", health?.checks.worker.status === 'ACTIVE' ? 'border-l-emerald-400' : 'border-l-slate-700')}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Server size={20} className={health?.checks.worker.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-600'} />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Worker Service</span>
                                </div>
                                <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", health?.checks.worker.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-900')}>{health?.checks.worker.status || '...'}</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Buffer Mode</span>
                                    <span className="text-white">{health?.checks.worker.bufferMode || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Active Devices</span>
                                    <span className="text-brand-green">{health?.checks.postgresql.activeDevices ?? '--'} / {health?.checks.postgresql.totalDevices ?? '--'}</span>
                                </div>
                            </div>
                        </div>
                        {/* Memory & Uptime */}
                        <div className="card-base p-6 space-y-5 border-l-4 border-l-purple-500 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <HardDrive size={20} className="text-purple-400" />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Runtime</span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-purple-400 uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-400/10">
                                    <Clock size={10} /> {health?.checks.uptime.formatted || '--'}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Heap Used</span>
                                    <span className="text-white">{health?.checks.memory.heapUsed ?? '--'} MB</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">Heap Total</span>
                                    <span className="text-white">{health?.checks.memory.heapTotal ?? '--'} MB</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">RSS Memory</span>
                                    <span className="text-white">{health?.checks.memory.rss ?? '--'} MB</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${health ? Math.min((health.checks.memory.heapUsed / health.checks.memory.heapTotal) * 100, 100) : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Overall Status */}
                <div className={clsx("card-base p-8 space-y-8 relative overflow-hidden transition-all", health?.status === 'OPERATIONAL' ? 'bg-brand-green/5 border-brand-green/20' : 'bg-red-500/5 border-red-500/20')}>
                    <div className={clsx("absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 rounded-full animate-pulse", health?.status === 'OPERATIONAL' ? 'bg-brand-green/10' : 'bg-red-500/10')}></div>
                    <div className="flex flex-col gap-2 relative z-10">
                        <span className={clsx("text-[10px] font-black uppercase tracking-[0.3em]", health?.status === 'OPERATIONAL' ? 'text-brand-green' : 'text-red-500')}>System Health</span>
                        <h4 className="text-3xl font-black text-white italic tracking-tighter">{health?.status === 'OPERATIONAL' ? 'ALL SYSTEMS GO' : health?.status || 'CHECKING...'}</h4>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                            <div className={clsx("h-full rounded-full transition-all duration-1000", health?.status === 'OPERATIONAL' ? 'w-full bg-brand-green' : 'w-3/4 bg-red-500')}></div>
                        </div>
                    </div>
                    <div className="space-y-5 relative z-10">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">API Response</span>
                            <span className={clsx((health?.responseTime ?? 0) < 100 ? 'text-brand-green' : (health?.responseTime ?? 0) < 500 ? 'text-yellow-500' : 'text-red-500')}>{health?.responseTime ?? '--'}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">PostgreSQL</span>
                            <span className={health?.checks.postgresql.status === 'HEALTHY' ? 'text-brand-green' : 'text-red-500'}>{health?.checks.postgresql.status || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Redis</span>
                            <span className={clsx(health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400' : health?.checks.redis.status === 'FALLBACK' ? 'text-yellow-500' : 'text-red-500')}>{health?.checks.redis.status || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Worker</span>
                            <span className={health?.checks.worker.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'}>{health?.checks.worker.status || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Uptime</span>
                            <span className="text-purple-400">{health?.checks.uptime.formatted || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Last Check</span>
                            <span className="text-slate-400">{health ? new Date(health.timestamp).toLocaleTimeString() : '--'}</span>
                        </div>
                    </div>
                    <div className="pt-4 relative z-10">
                        <button onClick={fetchHealth} className={clsx("w-full py-5 text-white rounded-2xl text-[10px] font-black shadow-2xl transition-all uppercase tracking-[0.2em]", health?.status === 'OPERATIONAL' ? 'bg-brand-green hover:bg-emerald-500 shadow-brand-green/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20')}>
                            {healthLoading ? 'Checking...' : 'Run Health Check Now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
