"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Activity,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Database,
    Layers,
    Terminal,
    RefreshCw,
    AlertTriangle,
    Table as TableIcon,
    Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company { id: string; name: string; }
interface Plant { id: string; plantName: string; }
interface Device { id: string; deviceName: string; deviceType: string; protocolConfigId: string; datasheetProfileId: string; }
interface DataPoint {
    id: string;
    dataName: string;
    dataValue: string | null;
    registerAddress: number | null;
    scadaAddress: number | null;
    ioa1ObjectAddress: number | null;
    dataType: string | null;
    signalDescription: string | null;
}

// ─── Helper Components ──────────────────────────────────────────────────────

const GlobalStream = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        socket.emit('join:protocol', { protocolId: 'admin:telemetry' });
        const handleData = (data: any) => {
            if (!data) return;
            setLogs(prev => {
                const newLog = {
                    id: Math.random().toString(36).substring(2, 9),
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    message: `[BUS] CH:${data.protocolId?.substring(0, 4) || '??'} ADDR:${data.ioa} VAL:${typeof data.value === 'number' ? data.value.toFixed(2) : data.value}`,
                };
                return [newLog, ...prev].slice(0, 20);
            });
        };
        socket.on('telemetry:raw', handleData);
        return () => { socket.off('telemetry:raw', handleData); };
    }, []);

    return (
        <div className="card-base bg-slate-950 border-slate-900 overflow-hidden flex flex-col h-[400px] shadow-2xl relative">
            <div className="absolute inset-0 bg-brand-green/2 pointer-events-none" />
            <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center relative z-10">
                <span className="text-[10px] font-bold text-brand-green tracking-widest uppercase flex items-center gap-2">
                    <Terminal size={12} /> Global Feed
                </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-hide relative z-10">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-800 animate-pulse text-center tracking-widest uppercase">Initializing...</div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="text-slate-500 hover:text-brand-green transition-colors border-l-2 border-transparent hover:border-brand-green/30 pl-3">
                            <span className="text-slate-900 mr-2 opacity-30">[{log.time}]</span> {log.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const UnmappedPortCard = ({ p }: { p: any }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    useEffect(() => {
        const s = setTimeout(() => setIsUpdating(true), 0);
        const e = setTimeout(() => setIsUpdating(false), 800);
        return () => { clearTimeout(s); clearTimeout(e); };
    }, [p?.timestamp]);

    return (
        <div className={`card-base p-3 border border-orange-500/10 bg-slate-950/40 flex flex-col gap-1 transition-all ${isUpdating ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
            <span className="text-[9px] font-mono text-slate-600">IOA: {p.ioa}</span>
            <span className="text-sm font-bold text-white tabular-nums">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
            <span className="text-[8px] text-slate-800 font-mono italic">{new Date(p.timestamp).toLocaleTimeString([], {hour12: false})}</span>
        </div>
    );
};

const PointCard = ({ point, liveData }: { point: DataPoint, liveData?: any }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const hasData = !!liveData;
    const value = liveData?.value;

    useEffect(() => {
        if (hasData) {
            const s = setTimeout(() => setIsUpdating(true), 0);
            const e = setTimeout(() => setIsUpdating(false), 800);
            return () => { clearTimeout(s); clearTimeout(e); };
        }
    }, [liveData?.timestamp, hasData]);

    useEffect(() => {
        if (typeof value === 'number') {
            const timer = setTimeout(() => setPrevValue(value), 1000);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const delta = (typeof value === 'number' && typeof prevValue === 'number') ? value - prevValue : 0;
    const isUp = delta > 0;

    return (
        <motion.div
            animate={{
                borderColor: isUpdating ? 'rgba(16,185,129,0.5)' : (hasData ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.2)'),
                backgroundColor: isUpdating ? 'rgba(16,185,129,0.08)' : (hasData ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.1)')
            }}
            className="card-base p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden border transition-all"
        >
            <div className="flex justify-between items-start">
                <div className="space-y-1 overflow-hidden">
                    <span className={`text-[10px] font-bold tracking-widest uppercase block truncate ${hasData ? 'text-brand-green' : 'text-slate-600'}`}>{point.dataName}</span>
                    <span className="text-[9px] font-mono text-slate-500">ADDR: {point.scadaAddress || point.registerAddress || 'N/A'}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : (hasData ? 'bg-slate-500' : 'bg-slate-800')}`} />
            </div>
            <div className="flex items-baseline gap-2 mt-4">
                <span className={`text-4xl font-bold tabular-nums tracking-tighter ${hasData ? 'text-white' : 'text-slate-800'}`}>
                    {hasData ? (typeof value === 'number' ? value.toFixed(2) : value) : '--.--'}
                </span>
                <span className="text-[10px] font-bold text-slate-600 lowercase">{point.dataType || ''}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-3">
                <div className={`flex items-center gap-1 text-[10px] font-bold ${!hasData ? 'text-slate-800' : delta === 0 ? 'text-slate-600' : isUp ? 'text-brand-green/90' : 'text-red-500/90'}`}>
                    {hasData && delta !== 0 && (isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                    <span>{hasData ? (delta === 0 ? 'STABLE' : Math.abs(delta).toFixed(3)) : 'STANDBY'}</span>
                </div>
                {liveData?.timestamp && <span className="text-[9px] font-mono text-slate-700">{new Date(liveData.timestamp).toLocaleTimeString([], { hour12: false })}</span>}
            </div>
        </motion.div>
    );
};

const PointRow = ({ point, liveData }: { point: DataPoint, liveData?: any }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    useEffect(() => {
        if (liveData) {
            const s = setTimeout(() => setIsUpdating(true), 0);
            const e = setTimeout(() => setIsUpdating(false), 800);
            return () => { clearTimeout(s); clearTimeout(e); };
        }
    }, [liveData?.timestamp]);
    return (
        <tr className={`border-b border-white/[0.03] transition-colors ${isUpdating ? 'bg-brand-green/10' : 'hover:bg-white/[0.02]'}`}>
            <td className="py-3 px-4 text-[10px] font-mono text-slate-500 uppercase truncate max-w-[200px]">{point.dataName}</td>
            <td className="py-3 px-4 text-[10px] font-mono text-slate-500">{point.scadaAddress || point.registerAddress || '-'}</td>
            <td className="py-3 px-4 font-bold tabular-nums text-white">
                {liveData?.value !== undefined ? (typeof liveData.value === 'number' ? liveData.value.toFixed(3) : liveData.value) : '---'}
            </td>
            <td className="py-3 px-4 text-[9px] text-slate-600 uppercase">{point.dataType || '-'}</td>
            <td className="py-3 px-4 text-[9px] text-slate-600 font-mono">
                {liveData?.timestamp ? new Date(liveData.timestamp).toLocaleTimeString([], { hour12: false }) : '-'}
            </td>
        </tr>
    );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LiveMonitoringPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);
    
    const [liveValues, setLiveValues] = useState<Map<string, any>>(new Map());
    const [unmatchedValues, setUnmatchedValues] = useState<Map<number, any>>(new Map());

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [socketConnected, setSocketConnected] = useState(() => socket.connected);

    const pointsRef = useRef<DataPoint[]>([]);
    useEffect(() => { pointsRef.current = points; }, [points]);

    // Initial load & Socket Status
    useEffect(() => {
        const c = () => setSocketConnected(true);
        const d = () => setSocketConnected(false);
        socket.on('connect', c);
        socket.on('disconnect', d);
        apiRequest('/api/companies').then(r => r.json()).then(res => {
            const data = res?.data || res;
            setCompanies(Array.isArray(data) ? data : []);
        }).catch(() => {});
        return () => { socket.off('connect', c); socket.off('disconnect', d); };
    }, []);

    // API side-effects (Only fetching, no resets)
    useEffect(() => {
        if (!selectedCompany) return;
        apiRequest('/api/plants').then(r => r.json()).then(res => {
            const data = res.data || res;
            setPlants(Array.isArray(data) ? data.filter((p: any) => p.companyId === selectedCompany) : []);
        });
    }, [selectedCompany]);

    useEffect(() => {
        if (!selectedPlant) return;
        apiRequest('/api/devices').then(r => r.json()).then(res => {
            const data = res.data || res;
            setDevices(Array.isArray(data) ? data.filter((d: any) => d.protocol?.plant?.id === selectedPlant) : []);
        });
    }, [selectedPlant]);

    useEffect(() => {
        if (!selectedDevice) return;
        apiRequest(`/api/datasheets?profileId=${selectedDevice.datasheetProfileId}`)
            .then(r => r.json())
            .then(res => setPoints(res.data || res));
        socket.emit('join:protocol', { protocolId: selectedDevice.protocolConfigId });
    }, [selectedDevice]);

    // Optimized Telemetry Handler
    useEffect(() => {
        if (!selectedDevice) return;
        const handle = (data: any) => {
            const items = Array.isArray(data) ? data : [data];
            const currentPoints = pointsRef.current;
            
            items.forEach(pkt => {
                const ioa = pkt.ioa !== undefined ? Number(pkt.ioa) : null;
                if (ioa === null) return;

                const match = currentPoints.find(p => {
                    const addr = Number(p.scadaAddress || p.registerAddress || p.ioa1ObjectAddress);
                    return addr === ioa && addr !== 0; 
                });

                if (match) {
                    setLiveValues(prev => {
                        const next = new Map(prev);
                        next.set(match.id, { ...pkt, timestamp: pkt.timestamp || new Date().toISOString() });
                        return next;
                    });
                } else {
                    setUnmatchedValues(prev => {
                        const next = new Map(prev);
                        next.set(ioa, { ...pkt, timestamp: pkt.timestamp || new Date().toISOString() });
                        return next;
                    });
                }
            });
        };
        socket.on('telemetry:update', handle);
        return () => { socket.off('telemetry:update', handle); };
    }, [selectedDevice]);

    // UI Handlers (Handles all resets to prevent cascading renders)
    const handleCompanyChange = (id: string) => {
        setSelectedCompany(id);
        setPlants([]);
        setDevices([]);
        setPoints([]);
        setSelectedPlant('');
        setSelectedDevice(null);
        setLiveValues(new Map());
        setUnmatchedValues(new Map());
    };

    const handlePlantChange = (id: string) => {
        setSelectedPlant(id);
        setDevices([]);
        setPoints([]);
        setSelectedDevice(null);
        setLiveValues(new Map());
        setUnmatchedValues(new Map());
    };

    const handleDeviceChange = (deviceId: string) => {
        const d = devices.find(x => x.id === deviceId) || null;
        setSelectedDevice(d);
        setPoints([]);
        setLiveValues(new Map());
        setUnmatchedValues(new Map());
    };

    const filtered = useMemo(() => points.filter(p => 
        p.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.signalDescription && p.signalDescription.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [points, searchQuery]);

    const handleGI = async () => {
        if (!selectedDevice) return;
        try {
            const res = await apiRequest('/api/admin/iec104-gi', { 
                method: 'POST', 
                body: JSON.stringify({ protocolId: selectedDevice.protocolConfigId, asduAddr: 1 }) 
            });
            if (res.ok) toast.success('GI Scan Dispatched');
        } catch (err) { toast.error('GI Scan Failed'); }
    };

    return (
        <div className="space-y-8 pb-20 font-sans selection:bg-brand-green/30">
            {/* Header Area */}
            <div className="flex justify-between items-center bg-slate-900/10 p-5 rounded-[2rem] border border-white/[0.02]">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-brand-green/10 rounded-2xl border border-brand-green/20">
                        <Activity className="text-brand-green" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Live SCADA Core</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-brand-green animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{socketConnected ? 'Link Active' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
                {selectedDevice && (
                    <button onClick={handleGI} className="px-5 py-2.5 bg-slate-950 border border-slate-800 hover:border-brand-green/40 rounded-xl text-[10px] font-black text-white transition-all flex items-center gap-2 tracking-widest uppercase shadow-xl hover:shadow-brand-green/5">
                        <RefreshCw size={14} className="text-brand-green" /> General Scan
                    </button>
                )}
            </div>

            {/* Selection Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: 'Company', val: selectedCompany, handler: handleCompanyChange, data: companies, nameKey: 'name' },
                    { label: 'Plant', val: selectedPlant, handler: handlePlantChange, data: plants, nameKey: 'plantName', disabled: !selectedCompany },
                    { label: 'Device Node', val: selectedDevice?.id || '', handler: handleDeviceChange, data: devices, nameKey: 'deviceName', disabled: !selectedPlant }
                ].map((sel, idx) => (
                    <div key={idx} className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">{sel.label}</label>
                        <select 
                            value={sel.val} 
                            onChange={e => sel.handler(e.target.value)} 
                            disabled={sel.disabled}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-brand-green/40 transition-all disabled:opacity-20 cursor-pointer appearance-none shadow-sm"
                        >
                            <option value="">Select {sel.label}...</option>
                            {Array.isArray(sel.data) ? sel.data.map((item: any) => <option key={item.id} value={item.id}>{item[sel.nameKey]}</option>) : null}
                        </select>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-6">
                    {selectedDevice ? (
                        <>
                            <div className="flex items-center gap-4 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/40">
                                <Search className="text-slate-600 ml-2" size={18} />
                                <input placeholder="Filter by Name or IOA..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:text-slate-700" />
                                <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-green/10 text-brand-green' : 'text-slate-600'}`}><Layers size={16}/></button>
                                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-brand-green/10 text-brand-green' : 'text-slate-600'}`}><TableIcon size={16}/></button>
                                </div>
                            </div>
                            
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <AnimatePresence mode="popLayout">
                                        {filtered.map(p => <PointCard key={p.id} point={p} liveData={liveValues.get(p.id)} />)}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="card-base overflow-hidden border border-slate-800/50 bg-slate-950/20">
                                    <table className="w-full text-left font-bold border-collapse">
                                        <thead className="bg-slate-900/50 uppercase text-[10px] text-slate-500 tracking-[0.2em] border-b border-white/[0.02]">
                                            <tr><th className="p-4">Signal Alias</th><th className="p-4">IOA</th><th className="p-4">Data Value</th><th className="p-4">Type</th><th className="p-4">Last Sync</th></tr>
                                        </thead>
                                        <tbody className="text-[11px]">
                                            {filtered.map(p => <PointRow key={p.id} point={p} liveData={liveValues.get(p.id)} />)}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {unmatchedValues.size > 0 && (
                                <div className="pt-10 space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                                        <h2 className="text-[11px] font-black text-orange-500/80 uppercase tracking-[0.5em] flex items-center gap-2">
                                            <AlertTriangle size={16}/> Unmapped Bus Inputs ({unmatchedValues.size})
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {Array.from(unmatchedValues.values()).map(pkt => <UnmappedPortCard key={pkt.ioa} p={pkt} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-48 bg-slate-900/5 border-2 border-dashed border-slate-900/40 rounded-[3rem] grayscale opacity-40">
                            <Database size={72} className="text-slate-800 mb-6" />
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-[0.6em]">System Standby</h3>
                            <p className="text-[10px] text-slate-800 mt-2 font-black uppercase tracking-widest">Awaiting Uplink Node Selection</p>
                        </div>
                    )}
                </div>
                <div className="xl:col-span-1 space-y-6">
                    <GlobalStream />
                    <div className="card-base p-6 bg-slate-900/30 space-y-5 border border-white/[0.03] backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase flex items-center gap-2">
                            <Zap size={14} className="text-brand-green shadow-[0_0_10px_currentColor]" /> Resource Pulse
                        </h4>
                        <div className="space-y-4 pt-1">
                            <div className="flex justify-between items-center text-[10px] font-black">
                                <span className="text-slate-600 tracking-wider">UPLINK STABILITY</span>
                                <span className="text-brand-green">99.8%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                <div className="w-[99%] h-full bg-brand-green rounded-full shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
