"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Cpu, Power, Database, Layers,
    XOctagon, RefreshCw, Search,
    Heart, Clock, HardDrive, Server, Wifi, WifiOff, Zap, Settings, Trash2, Timer, Shield
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
    isRecording: boolean;
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
    const [recSettings, setRecSettings] = useState<any>(null);
    const [stats, setStats] = useState({ total: 0, active: 0, passive: 0, totalMeasurements: 0 });

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
        } catch { toast.error("Failed to load"); }
        finally { setLoading(false); }
    };

    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await apiRequest('/api/system/health-check');
            if (res.ok) setHealth(await res.json());
        } catch { }
        finally { setHealthLoading(false); }
    }, []);

    const fetchRecSettings = useCallback(async () => {
        try {
            const res = await apiRequest('/api/system/recording-settings');
            if (res.ok) setRecSettings(await res.json());
        } catch { }
    }, []);

    const updateRecSetting = async (key: string, value: any) => {
        try {
            const res = await apiRequest('/api/system/recording-settings', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
            if (res.ok) { const data = await res.json(); setRecSettings((p: any) => ({ ...p, ...data.settings })); toast.success('Updated'); }
        } catch { toast.error('Failed'); }
    };

    const runRetention = async () => {
        if (!window.confirm('Run cleanup now?')) return;
        const t = toast.loading('Cleaning...');
        try {
            const res = await apiRequest('/api/system/run-retention', { method: 'POST' });
            if (res.ok) { const d = await res.json(); toast.success(`Cleaned ${d.deleted} records`, { id: t }); fetchRecSettings(); }
        } catch { toast.error('Failed', { id: t }); }
    };

    useEffect(() => {
        fetchData(); fetchHealth(); fetchRecSettings();
        const d = setInterval(fetchData, 30000);
        const h = setInterval(fetchHealth, 10000);
        return () => { clearInterval(d); clearInterval(h); };
    }, [fetchHealth, fetchRecSettings]);

    const toggleDeviceField = async (device: Device, field: 'isActive' | 'isRecording') => {
        const next = !device[field];
        const label = field === 'isActive' ? 'Communication' : 'Recording';
        const t = toast.loading(`Toggling ${label}...`);
        try {
            const res = await apiRequest(`/api/devices/${device.id}`, { method: 'PATCH', body: JSON.stringify({ [field]: next }) });
            if (res.ok) {
                toast.success(`${device.deviceName} ${label} ${next ? 'ON' : 'OFF'}`, { id: t });
                setDevices(p => p.map(d => d.id === device.id ? { ...d, [field]: next } : d));
                if (field === 'isActive') {
                    setStats(p => ({ ...p, active: next ? p.active + 1 : p.active - 1, passive: next ? p.passive - 1 : p.passive + 1 }));
                }
            } else toast.error("Failed", { id: t });
        } catch { toast.error("Error", { id: t }); }
    };

    const bulkAction = async (action: 'START' | 'STOP') => {
        if (!window.confirm(`${action} all devices?`)) return;
        const t = toast.loading(`${action}ing all...`);
        try {
            const targets = devices.filter(d => action === 'START' ? !d.isActive : d.isActive);
            for (const d of targets) await apiRequest(`/api/devices/${d.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: action === 'START' }) });
            toast.success("Done", { id: t }); fetchData();
        } catch { toast.error("Error", { id: t }); }
    };

    const filtered = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.configName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.plant.plantName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const S = (props: { label: string; val: string | number; color?: string }) => (
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{props.label}</span>
            <span className={clsx("text-[9px] font-bold tabular-nums", props.color || 'text-white')}>{props.val}</span>
        </div>
    );

    return (
        <div className="space-y-4 pb-10 animate-in-up font-sans selection:bg-brand-green/30">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <Layers size={16} className="text-brand-green" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight uppercase">System <span className="text-brand-green">Control</span></h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Activity size={8} className="text-brand-green animate-pulse" />
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stats.total} Devices • {stats.active} Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => bulkAction('STOP')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-bold hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider">
                        <XOctagon size={11} /> Stop All
                    </button>
                    <button onClick={() => bulkAction('START')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-lg text-[9px] font-bold hover:bg-brand-green hover:text-white transition-all uppercase tracking-wider">
                        <Power size={11} /> Start All
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3 px-1">
                {[
                    { label: 'Nodes', val: stats.total, icon: Cpu, color: 'text-brand-green' },
                    { label: 'Recording', val: stats.active, icon: Activity, color: 'text-emerald-400' },
                    { label: 'Paused', val: stats.passive, icon: Power, color: 'text-slate-500' },
                    { label: 'Data Pts', val: (stats.totalMeasurements / 1000).toFixed(1) + 'K', icon: Database, color: 'text-brand-green' },
                ].map(s => (
                    <div key={s.label} className="card-base p-3 flex items-center gap-3">
                        <s.icon size={14} className={s.color} />
                        <div>
                            <span className="text-lg font-black text-white tabular-nums leading-none">{s.val}</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider block mt-0.5">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid: Devices + Health */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 px-1">
                {/* Device Table */}
                <div className="xl:col-span-2 card-base overflow-hidden relative">
                    <div className="px-4 py-2.5 border-b border-white/[0.03] flex items-center justify-between bg-slate-900/20">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Device Registry</span>
                            <span className="text-[8px] font-bold text-slate-600">{filtered.length} items</span>
                        </div>
                        <div className="relative w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={11} />
                            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-medium text-white placeholder:text-slate-700 outline-none focus:border-brand-green/30 transition-all" />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-[340px]">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 z-10 bg-slate-950">
                                <tr>
                                    <th className="px-4 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.03]">Device</th>
                                    <th className="px-4 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.03] text-center">Protocol</th>
                                    <th className="px-4 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.03] text-center whitespace-nowrap">COM / REC</th>
                                    <th className="px-4 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.03] text-right">Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                <AnimatePresence>
                                    {filtered.map((device, idx) => (
                                        <motion.tr key={device.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-white/[0.01] transition-all">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={clsx("w-6 h-6 rounded-md flex items-center justify-center border text-[10px]",
                                                        device.isActive ? "bg-brand-green/10 border-brand-green/20 text-brand-green" : "bg-slate-900 border-slate-800 text-slate-700")}>
                                                        <Cpu size={11} className={device.isActive ? 'animate-pulse' : ''} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-white block leading-tight">{device.deviceName}</span>
                                                        <span className="text-[7px] font-medium text-slate-600 font-mono">{device.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="text-[9px] font-medium text-slate-400 block leading-tight">{device.protocol.plant.plantName}</span>
                                                <span className="text-[8px] font-medium text-slate-600">{device.protocol.protocolType} • {device.protocol.configName}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-center gap-1">
                                                    <span className={clsx("flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase",
                                                        device.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-900 text-slate-600 border border-slate-800")}>
                                                        {device.isActive ? <Timer size={7} className="animate-pulse" /> : <WifiOff size={7} />} {device.isActive ? 'Active' : 'Idle'}
                                                    </span>
                                                    <span className={clsx("flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase",
                                                        device.isRecording ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-900 text-slate-600 border border-slate-800")}>
                                                        <Database size={7} /> {device.isRecording ? 'Record' : 'Skip'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-end gap-3">
                                                    {/* COM Toggle */}
                                                    <div className="flex flex-col items-center gap-1">
                                                        <button onClick={() => toggleDeviceField(device, 'isActive')}
                                                            title="Toggle Communication"
                                                            className={clsx("relative w-8 h-4 rounded-full transition-all duration-300 flex items-center p-0.5 border",
                                                                device.isActive ? "bg-brand-green/20 border-brand-green/40" : "bg-slate-900 border-slate-800")}>
                                                            <div className={clsx("w-3 h-3 rounded-full transition-all duration-500 shadow",
                                                                device.isActive ? "translate-x-4 bg-brand-green" : "translate-x-0 bg-slate-700")}></div>
                                                        </button>
                                                        <span className="text-[6px] font-bold text-slate-600 uppercase">COM</span>
                                                    </div>
                                                    {/* REC Toggle */}
                                                    <div className="flex flex-col items-center gap-1">
                                                        <button onClick={() => toggleDeviceField(device, 'isRecording')}
                                                            title="Toggle Recording"
                                                            className={clsx("relative w-8 h-4 rounded-full transition-all duration-300 flex items-center p-0.5 border",
                                                                device.isRecording ? "bg-blue-500/20 border-blue-500/40" : "bg-slate-900 border-slate-800")}>
                                                            <div className={clsx("w-3 h-3 rounded-full transition-all duration-500 shadow",
                                                                device.isRecording ? "translate-x-4 bg-blue-500" : "translate-x-0 bg-slate-700")}></div>
                                                        </button>
                                                        <span className="text-[6px] font-bold text-slate-600 uppercase">REC</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                    {loading && (
                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-20 flex items-center justify-center gap-2">
                            <RefreshCw size={16} className="text-brand-green animate-spin" />
                            <span className="text-[9px] font-bold text-brand-green uppercase tracking-widest">Syncing...</span>
                        </div>
                    )}
                </div>

                {/* Health Sidebar */}
                <div className="space-y-3">
                    {/* Overall */}
                    <div className={clsx("card-base p-4 relative overflow-hidden", health?.status === 'OPERATIONAL' ? 'bg-brand-green/5 border-brand-green/20' : 'bg-red-500/5 border-red-500/20')}>
                        <div className={clsx("absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full animate-pulse -mr-10 -mt-10", health?.status === 'OPERATIONAL' ? 'bg-brand-green/10' : 'bg-red-500/10')}></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <span className={clsx("text-[8px] font-bold uppercase tracking-[0.2em]", health?.status === 'OPERATIONAL' ? 'text-brand-green' : 'text-red-500')}>System Status</span>
                                <h4 className="text-xl font-black text-white italic tracking-tight leading-none mt-0.5">{health?.status === 'OPERATIONAL' ? 'ALL GO' : health?.status || '...'}</h4>
                            </div>
                            <button onClick={fetchHealth} disabled={healthLoading}
                                className={clsx("px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all",
                                    health?.status === 'OPERATIONAL' ? 'bg-brand-green text-white hover:bg-emerald-500' : 'bg-red-500 text-white')}>
                                {healthLoading ? <RefreshCw size={10} className="animate-spin" /> : 'Check'}
                            </button>
                        </div>
                        <div className="w-full h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                            <div className={clsx("h-full rounded-full transition-all duration-700", health?.status === 'OPERATIONAL' ? 'w-full bg-brand-green' : 'w-3/4 bg-red-500')}></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 relative z-10">
                            <div className="text-center">
                                <span className={clsx("text-sm font-black tabular-nums", (health?.responseTime ?? 0) < 100 ? 'text-brand-green' : 'text-yellow-500')}>{health?.responseTime ?? '--'}</span>
                                <span className="text-[7px] font-bold text-slate-500 uppercase block">ms API</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-black text-purple-400 tabular-nums">{health?.checks.uptime.formatted?.split(' ')[0] || '--'}</span>
                                <span className="text-[7px] font-bold text-slate-500 uppercase block">Uptime</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-black text-white tabular-nums">{health?.checks.memory.heapUsed ?? '--'}</span>
                                <span className="text-[7px] font-bold text-slate-500 uppercase block">MB Heap</span>
                            </div>
                        </div>
                    </div>

                    {/* PostgreSQL */}
                    <div className={clsx("card-base p-3 border-l-2", health?.checks.postgresql.status === 'HEALTHY' ? 'border-l-brand-green' : 'border-l-red-500')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Database size={11} className={health?.checks.postgresql.status === 'HEALTHY' ? 'text-brand-green' : 'text-red-500'} />
                                <span className="text-[9px] font-bold text-white uppercase">PostgreSQL</span>
                            </div>
                            <span className={clsx("text-[7px] font-bold uppercase px-1.5 py-0.5 rounded", health?.checks.postgresql.status === 'HEALTHY' ? 'text-brand-green bg-brand-green/10' : 'text-red-500 bg-red-500/10')}>{health?.checks.postgresql.status || '...'}</span>
                        </div>
                        <div className="space-y-1.5">
                            <S label="Latency" val={`${health?.checks.postgresql.latency ?? '--'}ms`} color={(health?.checks.postgresql.latency ?? 0) < 50 ? 'text-brand-green' : 'text-yellow-500'} />
                            <S label="Records" val={health?.checks.postgresql.totalRecords?.toLocaleString() ?? '--'} />
                            <S label="Last Record" val={health?.checks.postgresql.lastRecordAge != null ? `${health.checks.postgresql.lastRecordAge}s ago` : 'N/A'} color={health?.checks.postgresql.recording ? 'text-brand-green' : 'text-orange-400'} />
                            <S label="Stream" val={health?.checks.postgresql.recording ? '● LIVE' : '○ Idle'} color={health?.checks.postgresql.recording ? 'text-brand-green' : 'text-slate-600'} />
                        </div>
                    </div>

                    {/* Redis */}
                    <div className={clsx("card-base p-3 border-l-2", health?.checks.redis.status === 'HEALTHY' ? 'border-l-blue-500' : 'border-l-yellow-500')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Zap size={11} className={health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400' : 'text-yellow-500'} />
                                <span className="text-[9px] font-bold text-white uppercase">Redis</span>
                            </div>
                            <span className={clsx("text-[7px] font-bold uppercase px-1.5 py-0.5 rounded", health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400 bg-blue-400/10' : 'text-yellow-500 bg-yellow-500/10')}>{health?.checks.redis.status || '...'}</span>
                        </div>
                        <div className="space-y-1.5">
                            <S label="Mode" val={health?.checks.redis.mode || '--'} color={health?.checks.redis.mode === 'REDIS' ? 'text-blue-400' : 'text-yellow-500'} />
                            <S label="Queue" val={`${health?.checks.redis.queueLength ?? '--'} pending`} color={(health?.checks.redis.queueLength ?? 0) > 100 ? 'text-red-500' : 'text-brand-green'} />
                            <S label="Link" val={health?.checks.redis.status === 'HEALTHY' ? 'Connected' : 'Fallback'} color={health?.checks.redis.status === 'HEALTHY' ? 'text-blue-400' : 'text-yellow-500'} />
                        </div>
                    </div>

                    {/* Worker + Memory */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={clsx("card-base p-3 border-l-2", health?.checks.worker.status === 'ACTIVE' ? 'border-l-emerald-400' : 'border-l-slate-700')}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Server size={11} className={health?.checks.worker.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-600'} />
                                <span className="text-[9px] font-bold text-white uppercase">Worker</span>
                            </div>
                            <div className="space-y-1.5">
                                <S label="Status" val={health?.checks.worker.status || '--'} color={health?.checks.worker.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'} />
                                <S label="Devices" val={`${health?.checks.postgresql.activeDevices ?? '-'}/${health?.checks.postgresql.totalDevices ?? '-'}`} color="text-brand-green" />
                            </div>
                        </div>
                        <div className="card-base p-3 border-l-2 border-l-purple-500">
                            <div className="flex items-center gap-1.5 mb-2">
                                <HardDrive size={11} className="text-purple-400" />
                                <span className="text-[9px] font-bold text-white uppercase">Memory</span>
                            </div>
                            <div className="space-y-1.5">
                                <S label="Heap" val={`${health?.checks.memory.heapUsed ?? '--'}MB`} />
                                <S label="RSS" val={`${health?.checks.memory.rss ?? '--'}MB`} />
                            </div>
                            <div className="w-full h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${health ? Math.min((health.checks.memory.heapUsed / health.checks.memory.heapTotal) * 100, 100) : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Governance - Compact */}
            <div className="card-base px-4 py-3 mx-1">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Shield size={12} className="text-orange-500" />
                        <span className="text-[9px] font-black text-white uppercase tracking-wider">Data Governance</span>
                        {recSettings && (
                            <span className="text-[8px] font-medium text-slate-500 ml-2">
                                {recSettings.db?.tableSize || '--'} • {recSettings.db?.totalRecords?.toLocaleString() || '--'} records
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={runRetention} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[8px] font-bold hover:bg-red-500 hover:text-white transition-all uppercase">
                            <Trash2 size={9} /> Cleanup
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    {/* Interval */}
                    <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Timer size={9} className="text-blue-400" /> Interval</label>
                        <select value={recSettings?.sampleIntervalSec || 10} onChange={e => updateRecSetting('sampleIntervalSec', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all">
                            <option value={5}>5s</option><option value={10}>10s</option><option value={15}>15s</option><option value={30}>30s</option><option value={60}>60s</option>
                        </select>
                    </div>
                    {/* Retention */}
                    <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Clock size={9} className="text-orange-400" /> Retention</label>
                        <select value={recSettings?.retentionHours || 72} onChange={e => updateRecSetting('retentionHours', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white outline-none focus:border-orange-500/50 transition-all">
                            <option value={12}>12h</option><option value={24}>24h</option><option value={48}>48h</option><option value={72}>3 days</option><option value={168}>7 days</option><option value={720}>30 days</option>
                        </select>
                    </div>
                    {/* Max Records */}
                    <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Database size={9} className="text-purple-400" /> Max Rec</label>
                        <select value={recSettings?.maxRecordsTotal || 500000} onChange={e => updateRecSetting('maxRecordsTotal', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white outline-none focus:border-purple-500/50 transition-all">
                            <option value={100000}>100K</option><option value={250000}>250K</option><option value={500000}>500K</option><option value={1000000}>1M</option><option value={5000000}>5M</option>
                        </select>
                    </div>
                    {/* Recording Toggle */}
                    <div className="col-span-2 md:col-span-2">
                        <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-2">
                                <Settings size={11} className={recSettings?.isRecording ? 'text-brand-green animate-spin' : 'text-slate-600'} style={{ animationDuration: '3s' }} />
                                <div>
                                    <span className="text-[9px] font-bold text-white uppercase block leading-none">Global Recording</span>
                                    <span className="text-[7px] text-slate-500">{recSettings?.isRecording ? 'Active' : 'Paused'}</span>
                                </div>
                            </div>
                            <button onClick={() => updateRecSetting('isRecording', !recSettings?.isRecording)}
                                className={clsx("relative w-10 h-5 rounded-full transition-all duration-300 flex items-center p-0.5 border",
                                    recSettings?.isRecording ? "bg-brand-green/20 border-brand-green/40" : "bg-slate-900 border-slate-800")}>
                                <div className={clsx("w-4 h-4 rounded-full transition-all duration-500 shadow",
                                    recSettings?.isRecording ? "translate-x-5 bg-brand-green" : "translate-x-0 bg-slate-700")}></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
