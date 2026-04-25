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
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

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
            <div className="absolute inset-0 bg-grafana-accent-blue/5 pointer-events-none" />
            <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center relative z-10">
                <span className="text-[10px] font-bold text-grafana-accent-blue tracking-widest uppercase flex items-center gap-2">
                    <Terminal size={12} /> Global Feed
                </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-hide relative z-10">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-800 animate-pulse text-center tracking-widest uppercase">Initializing...</div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="text-slate-500 hover:text-grafana-accent-blue transition-colors border-l-2 border-transparent hover:border-grafana-accent-blue/30 pl-3">
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
                borderColor: isUpdating ? 'rgba(87, 148, 242, 0.5)' : (hasData ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.2)'),
                backgroundColor: isUpdating ? 'rgba(87, 148, 242, 0.08)' : (hasData ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.1)')
            }}
            className="card-base p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden border transition-all"
        >
            <div className="flex justify-between items-start">
                <div className="space-y-1 overflow-hidden">
                    <span className={`text-[10px] font-bold tracking-widest uppercase block truncate ${hasData ? 'text-grafana-accent-blue' : 'text-slate-600'}`}>{point.dataName}</span>
                    <span className="text-[9px] font-mono text-slate-500">ADDR: {point.scadaAddress || point.registerAddress || 'N/A'}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-grafana-accent-blue shadow-[0_0_8px_rgba(87, 148, 242, 0.5)]' : (hasData ? 'bg-slate-500' : 'bg-slate-800')}`} />
            </div>
            <div className="flex items-baseline gap-2 mt-4">
                <span className={`text-4xl font-bold tabular-nums tracking-tighter ${hasData ? 'text-white' : 'text-slate-800'}`}>
                    {hasData ? (typeof value === 'number' ? value.toFixed(2) : value) : '--.--'}
                </span>
                <span className="text-[10px] font-bold text-slate-600 lowercase">{point.dataType || ''}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-3">
                <div className={`flex items-center gap-1 text-[10px] font-bold ${!hasData ? 'text-slate-800' : delta === 0 ? 'text-slate-600' : isUp ? 'text-grafana-accent-green' : 'text-grafana-accent-red'}`}>
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
        <tr className={`border-b border-white/[0.03] transition-colors ${isUpdating ? 'bg-grafana-accent-blue/10' : 'hover:bg-white/[0.02]'}`}>
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

    // API side-effects
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

    // Telemetry Handler
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

    // UI Handlers
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
            if (res.ok) toast.success('Genel Tarama (GI) Başlatıldı');
        } catch (err) { toast.error('GI İşlemi Başarısız'); }
    };

    return (
        <div className="space-y-8 pb-20 font-sans">
            <PageHeader 
                title="CANLI" 
                highlightedTitle="İZLEME"
                subtitle="Saha düğümlerinden gelen anlık telemetri matrisi"
                icon={Activity}
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-grafana-bg border border-grafana-border rounded-sm">
                        <div className={cn("w-2 h-2 rounded-full", socketConnected ? 'bg-grafana-accent-green animate-pulse shadow-[0_0_10px_#73bf69]' : 'bg-grafana-accent-red')} />
                        <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">{socketConnected ? 'BAĞLANTI AKTİF' : 'BAĞLANTI YOK'}</span>
                    </div>
                    {selectedDevice && (
                        <button onClick={handleGI} className="px-5 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[10px] font-bold transition-all flex items-center gap-2 tracking-widest uppercase shadow-lg shadow-grafana-accent-blue/20 font-mono">
                            <RefreshCw size={14} className="text-white" /> GENEL TARAMA
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: 'KURUM', val: selectedCompany, handler: handleCompanyChange, data: companies, nameKey: 'name' },
                    { label: 'SANTRAL', val: selectedPlant, handler: handlePlantChange, data: plants, nameKey: 'plantName', disabled: !selectedCompany },
                    { label: 'CİHAZ DÜĞÜMÜ', val: selectedDevice?.id || '', handler: handleDeviceChange, data: devices, nameKey: 'deviceName', disabled: !selectedPlant }
                ].map((sel, idx) => (
                    <div key={idx} className="space-y-2">
                        <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1">{sel.label}</label>
                        <select 
                            value={sel.val} 
                            onChange={e => sel.handler(e.target.value)} 
                            disabled={sel.disabled}
                            className="w-full bg-grafana-panel border border-grafana-border rounded-sm p-4 text-[11px] font-bold text-white outline-none focus:border-grafana-accent-blue transition-all disabled:opacity-20 cursor-pointer appearance-none shadow-sm font-mono"
                        >
                            <option value="">{sel.label} SEÇİNİZ...</option>
                            {Array.isArray(sel.data) ? sel.data.map((item: any) => <option key={item.id} value={item.id}>{item[sel.nameKey]}</option>) : null}
                        </select>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-6">
                    {selectedDevice ? (
                        <>
                            <div className="flex items-center gap-4 bg-grafana-panel/40 p-4 rounded-sm border border-grafana-border/60">
                                <Search className="text-grafana-text-secondary ml-2" size={18} />
                                <input placeholder="SİNYAL VEYA ADRES FİLTRELE..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:text-grafana-text-secondary/30 font-mono tracking-tight" />
                                <div className="flex gap-1.5 p-1 bg-grafana-bg rounded-sm border border-grafana-border">
                                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-grafana-accent-blue/10 text-grafana-accent-blue' : 'text-grafana-text-secondary hover:text-white'}`}><Layers size={16}/></button>
                                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-sm transition-all ${viewMode === 'table' ? 'bg-grafana-accent-blue/10 text-grafana-accent-blue' : 'text-grafana-text-secondary hover:text-white'}`}><TableIcon size={16}/></button>
                                </div>
                            </div>
                            
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <AnimatePresence mode="popLayout">
                                        {filtered.map(p => <PointCard key={p.id} point={p} liveData={liveValues.get(p.id)} />)}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="bg-grafana-panel/40 border border-grafana-border rounded-sm overflow-hidden">
                                    <table className="scada-table">
                                        <thead>
                                            <tr><th>SİNYAL ETİKETİ</th><th>ADRES</th><th>DEĞER</th><th>TİP</th><th className="text-right">SON GÜNCELLEME</th></tr>
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
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-grafana-accent-orange/30 to-transparent" />
                                        <h2 className="text-[11px] font-black text-grafana-accent-orange/80 uppercase tracking-[0.5em] flex items-center gap-2 font-mono">
                                            <AlertTriangle size={16}/> EŞLEŞMEMİŞ VERİLER ({unmatchedValues.size})
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-grafana-accent-orange/30 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {Array.from(unmatchedValues.values()).map(pkt => <UnmappedPortCard key={pkt.ioa} p={pkt} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-48 bg-grafana-panel/10 border border-dashed border-grafana-border rounded-sm opacity-40">
                            <Database size={64} className="text-grafana-text-secondary/30 mb-6" />
                            <h3 className="text-xs font-black text-grafana-text-secondary uppercase tracking-[0.6em]">Sistem Beklemede</h3>
                            <p className="text-[9px] text-grafana-text-secondary/50 mt-2 font-bold uppercase tracking-widest font-mono">Lütfen izlenecek bir düğüm seçiniz</p>
                        </div>
                    )}
                </div>
                <div className="xl:col-span-1 space-y-6">
                    <GlobalStream />
                    <div className="card-base p-6 bg-grafana-panel/50 space-y-5 border border-grafana-border">
                        <h4 className="text-[11px] font-black text-grafana-text-secondary tracking-[0.2em] uppercase flex items-center gap-2 font-mono">
                            <Zap size={14} className="text-grafana-accent-blue" /> SİSTEM NABZI
                        </h4>
                        <div className="space-y-4 pt-1">
                            <div className="flex justify-between items-center text-[10px] font-black font-mono">
                                <span className="text-grafana-text-secondary tracking-wider">İLETİŞİM KARARLILIĞI</span>
                                <span className="text-grafana-accent-green">99.8%</span>
                            </div>
                            <div className="w-full h-1 bg-grafana-bg rounded-full overflow-hidden">
                                <div className="w-[99%] h-full bg-grafana-accent-green rounded-full shadow-[0_0_12px_#73bf69]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
