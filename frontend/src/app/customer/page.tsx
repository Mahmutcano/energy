"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    History,
    Zap,
    Cpu,
    Activity,
    Search,
    CircleDashed,
    ChevronRight,
    LayoutGrid,
    Table,
    Clock,
    RefreshCw,
    Server,
    ShieldCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

/** API / socket telemetry point (customer dashboard) */
interface TelemetryPoint {
    pointId: string;
    deviceId: string;
    name?: string;
    signalDescription?: string;
    measurementType?: string;
    unit?: string;
    value: number | null;
    history: HistoryEntry[];
}

interface HistoryEntry {
    t: string;
    value?: number | null;
}

interface PlantRow {
    id: string;
    plantName?: string;
}

interface DeviceRow {
    id: string;
    deviceName?: string;
    protocolConfigId?: string | null;
    datasheetProfileId?: string | null;
    protocol?: { plant?: { id: string } };
}

interface DatasheetPointRow {
    id: string;
    dataName?: string;
    dataExplanation?: string;
    signalDescription?: string;
    measurementType?: string;
    unit?: string;
}

interface TelemetryHistoryApiRow {
    pointId: string;
    time: string;
    value?: number;
}

interface ProtocolStatusPayload {
    status?: string;
}

type TelemetryUpdatePayload = Partial<Omit<TelemetryPoint, 'pointId' | 'history'>> & {
    pointId: string;
};

interface DashboardState {
    voltage: { ln: TelemetryPoint[]; ll: TelemetryPoint[] };
    current: { l: TelemetryPoint[] };
    power: {
        active: TelemetryPoint[];
        apparent: TelemetryPoint[];
        reactive: TelemetryPoint[];
        totals: TelemetryPoint[];
    };
    energy: { active: TelemetryPoint[]; reactive: TelemetryPoint[] };
    quality: { thd_v: TelemetryPoint[]; thd_i: TelemetryPoint[] };
    system: { metrics: TelemetryPoint[] };
    allRaw: TelemetryPoint[];
}

function emptyDashboardState(): DashboardState {
    return {
        voltage: { ln: [], ll: [] },
        current: { l: [] },
        power: { active: [], apparent: [], reactive: [], totals: [] },
        energy: { active: [], reactive: [] },
        quality: { thd_v: [], thd_i: [] },
        system: { metrics: [] },
        allRaw: [],
    };
}

interface TradingViewCardProps {
    title: string;
    points: TelemetryPoint[];
    unit: string;
    isHistory: boolean;
    type?: 'line' | 'area' | 'bar';
}

interface CombinedHistoryRow {
    t?: string;
    [key: string]: string | number | undefined | null;
}

// TradingView Color Palette
const COLORS = {
    blue: '#2962ff',
    red: '#f23645',
    green: '#089981',
    amber: '#fbbc04',
    slate: '#787b86',
    border: '#2a2e39',
    bg: '#131722',
    muted: '#1e222d',
    text: '#d1d4dc'
};

const CHART_SERIES_COLORS = [COLORS.blue, COLORS.red, COLORS.green, COLORS.amber];

const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
};

export default function KineticDashboardContent() {
    const searchParams = useSearchParams();
    const activeTab = (searchParams?.get('cat') || 'voltage').toLowerCase(); 
    
    const [status, setStatus] = useState<string>("INITIALIZING");
    const [liveData, setLiveData] = useState<Record<string, TelemetryPoint>>({});
    const [historyData, setHistoryData] = useState<Record<string, TelemetryPoint>>({});
    const [isDevMode, setIsDevMode] = useState(false);
    const [isHistoricalMode, setIsHistoricalMode] = useState(false);
    const historicalModeRef = React.useRef(isHistoricalMode);
    useEffect(() => { historicalModeRef.current = isHistoricalMode; }, [isHistoricalMode]);

    const [hours, setHours] = useState<number>(24);
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return { start: formatDateForInput(oneMonthAgo), end: formatDateForInput(now) };
    });

    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [devices, setDevices] = useState<DeviceRow[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (hours > 0) {
            const now = new Date();
            const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
            setDateRange({ start: formatDateForInput(start), end: formatDateForInput(now) });
        }
    }, [hours]);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await apiRequest('/api/plants');
                if (res.ok) {
                    const result = await res.json();
                    const data = result.success ? result.data : result;
                    if (Array.isArray(data)) {
                        setPlants(data);
                        if (data.length > 0 && !selectedPlantId) setSelectedPlantId(data[0].id);
                    }
                }
            } catch (err) { console.error("Fetch plants error:", err); }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        if (!selectedPlantId) return;
        const fetchDevices = async () => {
            try {
                const res = await apiRequest('/api/devices');
                if (res.ok) {
                    const result = await res.json();
                    const all = (result.success ? result.data : result) as DeviceRow[];
                    const filtered = all.filter((d) => d.protocol?.plant?.id === selectedPlantId);
                    setDevices(filtered);
                    if (filtered.length > 0) setSelectedDeviceId(filtered[0].id);
                    else setSelectedDeviceId('');
                }
            } catch (err) { console.error("Fetch devices error:", err); }
        };
        fetchDevices();
    }, [selectedPlantId]);

    useEffect(() => {
        if (!selectedDeviceId) { setLiveData({}); return; }
        
        const initDevice = async () => {
            setLoading(true);
            try {
                const device = devices.find(d => d.id === selectedDeviceId);
                if (device) {
                    if (device.protocolConfigId) setupSocket(device.protocolConfigId);
                    if (device.datasheetProfileId) {
                        const res = await apiRequest(`/api/datasheets?profileId=${device.datasheetProfileId}`);
                        if (res.ok) {
                            const result = await res.json();
                            const pointsData = (result.success ? result.data : result) as DatasheetPointRow[];
                            const initialData: Record<string, TelemetryPoint> = {};
                            pointsData.forEach((p) => {
                                initialData[p.id] = {
                                    pointId: p.id,
                                    deviceId: device.id,
                                    name: p.dataName,
                                    signalDescription: p.dataExplanation || p.signalDescription,
                                    measurementType: p.measurementType,
                                    unit: p.unit,
                                    value: null,
                                    history: []
                                };
                            });
                            setLiveData(initialData);
                            setHistoryData({});
                            setIsHistoricalMode(false);
                        }
                    }
                }
            } catch (err) { console.error("Init device error:", err); }
            finally { setLoading(false); }
        };
        initDevice();

        return () => {
            socket.off('protocol:status');
            socket.off('telemetry:update');
            const device = devices.find(d => d.id === selectedDeviceId);
            if (device?.protocolConfigId) {
                socket.off(`telemetry:raw:${device.protocolConfigId}`);
            }
        };
    }, [selectedDeviceId, devices]);

    const setupSocket = (pId: string) => {
        socket.emit('join:protocol', { protocolId: pId });
        socket.on('protocol:status', (data: ProtocolStatusPayload) => {
            if (data.status) setStatus(data.status);
        });
        const handleUpdate = (data: TelemetryUpdatePayload) => {
            if (historicalModeRef.current) return;
            setLiveData(prev => {
                const pointId = data.pointId;
                if (!pointId || !prev[pointId]) return prev;
                const history = prev[pointId]?.history ?? [];
                const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return {
                    ...prev,
                    [pointId]: {
                        ...prev[pointId],
                        ...data,
                        history: [...history, { value: data.value ?? 0, t }].slice(-60),
                    }
                };
            });
        };

        socket.on('telemetry:update', handleUpdate);
        socket.on(`telemetry:raw:${pId}`, (data: TelemetryUpdatePayload | TelemetryUpdatePayload[]) => {
            if (Array.isArray(data)) data.forEach(handleUpdate);
            else handleUpdate(data);
        });
    };

    const fetchHistory = async () => {
        setIsHistoricalMode(true);
        const pointIds = Object.keys(liveData);
        if (pointIds.length === 0) return;

        try {
            setLoading(true);
            const firstPoint = Object.values(liveData)[0];
            const deviceId = firstPoint.deviceId;
            const queryParams = new URLSearchParams({
                deviceId,
                pointId: pointIds.join(','),
                ...(hours > 0 ? { hours: hours.toString() } : { startDate: dateRange.start, endDate: dateRange.end })
            });

            const res = await apiRequest(`/api/telemetry/history?${queryParams.toString()}`);
            if (res.ok) {
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                    const grouped: Record<string, TelemetryPoint> = {};
                    pointIds.forEach((id) => { grouped[id] = { ...liveData[id], history: [] }; });

                    (result.data as TelemetryHistoryApiRow[]).forEach((row) => {
                        const bucket = grouped[row.pointId];
                        if (bucket) {
                            const date = new Date(row.time);
                            bucket.history.push({
                                ...row,
                                t: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                            } as HistoryEntry);
                        }
                    });
                    setHistoryData(grouped);
                }
            }
        } catch (err) { console.error("History Fetch Error:", err); }
        finally { setLoading(false); }
    };

    const dashboardState = useMemo((): DashboardState => {
        const dataArr = Object.values(isHistoricalMode ? historyData : liveData);
        if (dataArr.length === 0) return emptyDashboardState();

        const testMatch = (point: TelemetryPoint, searchTerms: string[], typeMatch: string[]) => {
            const n = (point.name || "").toLowerCase();
            const d = (point.signalDescription || "").toLowerCase();
            const t = (point.measurementType || "").toLowerCase();
            const combined = `${n} ${d} ${t}`;
            if (typeMatch.length > 0 && typeMatch.some(tm => t === tm.toLowerCase())) return true;
            return searchTerms.some(term => combined.includes(term.toLowerCase()));
        };

        const groupPhase = (s: string[], t: string[], m: string[]) => {
            const res: TelemetryPoint[] = [];
            m.forEach(mark => {
                const found = dataArr.find(item => {
                    if (!testMatch(item, s, t)) return false;
                    const c = `${item.name} ${item.signalDescription}`.toLowerCase();
                    return c.includes(mark.toLowerCase());
                });
                if (found) res.push(found);
            });
            return res.length > 0 ? res : dataArr.filter(p => testMatch(p, s, t)).slice(0, 3);
        };

        const phaseM = ['l1', 'l2', 'l3', 'phase 1', 'phase 2', 'phase 3', 'a faz', 'b faz', 'c faz'];
        const llM = ['l1-l2', 'l2-l3', 'l3-l1', 'ab', 'bc', 'ca'];
        
        return {
            voltage: { ln: groupPhase(['gerilim', 'voltage', 'v', 'faz_nötr'], ['PHASE_VOLTAGE'], phaseM), ll: groupPhase(['faz-faz', 'll', 'u'], [], llM) },
            current: { l: groupPhase(['akım', 'current', 'i', 'amp'], ['PHASE_CURRENT'], phaseM) },
            power: {
                active: groupPhase(['aktif güç', 'p', 'kw'], ['ACTIVE_POWER'], phaseM),
                apparent: groupPhase(['görünür güç', 's', 'kva'], ['APPARENT_POWER'], phaseM),
                reactive: groupPhase(['reaktif güç', 'q', 'kvar'], ['REACTIVE_POWER'], phaseM),
                totals: dataArr.filter(p => testMatch(p, ['toplam', 'total', 'sigma'], ['TOTAL_ACTIVE_POWER', 'TOTAL_APPARENT_POWER', 'TOTAL_REACTIVE_POWER']))
            },
            energy: { active: dataArr.filter(p => testMatch(p, ['aktif enerji', 'kwh'], ['IMPORT_ACTIVE_ENERGY', 'EXPORT_ACTIVE_ENERGY'])), reactive: dataArr.filter(p => testMatch(p, ['reaktif enerji', 'kvarh'], ['INDUCTIVE_REACTIVE_ENERGY', 'CAPACITIVE_REACTIVE_ENERGY'])) },
            quality: { thd_v: dataArr.filter(p => testMatch(p, ['harmonik gerilim', 'thdv'], ['HARMONIC_VOLTAGE'])), thd_i: dataArr.filter(p => testMatch(p, ['harmonik akım', 'thdi'], ['HARMONIC_CURRENT'])) },
            system: { metrics: dataArr.filter(p => testMatch(p, ['güç faktörü', 'frekans', 'hz', 'pf'], ['FREQUENCY', 'POWER_FACTOR'])) },
            allRaw: dataArr
        };
    }, [liveData, historyData, isHistoricalMode]);

    const titleMap: Record<string, string> = { 
        voltage: 'VOLTAGE ANALYSIS', 
        current: 'LOAD TERMINALS', 
        power: 'POWER SYSTEMS', 
        energy: 'ACCUMULATED RECORD', 
        quality: 'SYSTEM QUALITY / THD', 
        system: 'STABILITY METRICS' 
    };

    return (
        <div className="min-h-screen bg-[#0b0e14] text-[#d1d4dc] font-sans">
            {/* System Status Banner */}
            <div className="flex h-8 items-center justify-between border-b border-[#2a2e39] bg-[#1e222d] px-6 text-[10px] font-bold">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Server size={10} className="text-[#787b86]" />
                        <span className="text-[#787b86]">INFRASTRUCTURE:</span>
                        <span className="text-white uppercase tracking-wider">{plants.find(p => p.id === selectedPlantId)?.plantName || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-[#2a2e39] pl-6">
                        <Activity size={10} className="text-[#2962ff]" />
                        <span className="text-white uppercase tracking-wider">{devices.find(d => d.id === selectedDeviceId)?.deviceName || '--'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${status === 'CONNECTED' ? 'bg-[#089981]' : 'bg-red-500'}`} />
                        <span className="uppercase text-[#787b86]">COMM LINK:</span>
                        <span className={status === 'CONNECTED' ? 'text-[#089981]' : 'text-red-500'}>{status}</span>
                    </div>
                    <div className="h-3 w-px bg-[#2a2e39]" />
                    <div className="flex items-center gap-2">
                        <Clock size={10} className="text-[#787b86]" />
                        <span className="text-white tabular-nums">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* TradingView Navigation / Toolbar */}
            <header className="sticky top-0 z-50 flex flex-col border-b border-[#2a2e39] bg-[#131722]/95 backdrop-blur-md">
                <div className="flex h-14 items-center justify-between px-6">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {Object.keys(titleMap).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('cat', tab);
                                    window.history.pushState({}, '', `?${params.toString()}`);
                                }}
                                className={`whitespace-nowrap px-4 py-1.5 text-[11px] font-bold uppercase transition-all rounded ${activeTab === tab ? 'bg-[#2962ff] text-white shadow-lg' : 'text-[#787b86] hover:bg-white/5 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex h-8 bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
                            <button 
                                onClick={() => setIsHistoricalMode(false)}
                                className={`px-4 text-[10px] font-bold uppercase rounded transition-all ${!isHistoricalMode ? 'bg-[#2962ff] text-white shadow-sm' : 'text-[#787b86] hover:text-white'}`}
                            >
                                Live
                            </button>
                            <button 
                                onClick={() => { if (Object.keys(historyData).length === 0) fetchHistory(); else setIsHistoricalMode(true); }}
                                className={`px-4 text-[10px] font-bold uppercase rounded transition-all ${isHistoricalMode ? 'bg-[#2962ff] text-white shadow-sm' : 'text-[#787b86] hover:text-white'}`}
                            >
                                Historical
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsDevMode(!isDevMode)}
                            className={`flex h-8 w-8 items-center justify-center rounded border transition-all ${isDevMode ? 'bg-amber-500/10 text-amber-500 border-amber-500' : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39] hover:text-white'}`}
                            title="Toggle Developer Engine"
                        >
                            <Server size={14} />
                        </button>
                    </div>
                </div>

                {isHistoricalMode && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex items-center gap-6 px-6 py-2 bg-[#1e222d] border-t border-[#2a2e39]"
                     >
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-[#787b86] uppercase">Calendar Start:</span>
                            <input type="datetime-local" className="bg-[#131722] text-[11px] font-bold text-white outline-none border border-[#2a2e39] rounded px-2 py-1" 
                                   value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                            <ChevronRight size={14} className="text-[#2a2e39]" />
                            <span className="text-[10px] font-bold text-[#787b86] uppercase">Target End:</span>
                            <input type="datetime-local" className="bg-[#131722] text-[11px] font-bold text-white outline-none border border-[#2a2e39] rounded px-2 py-1"
                                   value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                        </div>
                        <button 
                            onClick={fetchHistory}
                            className="ml-auto bg-[#2962ff] hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-1.5 rounded transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> RE-SYNC ARCHIVE
                        </button>
                     </motion.div>
                )}
            </header>

            <main className="p-6">
                <AnimatePresence>
                    {isDevMode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            className="mb-8 overflow-hidden rounded border border-[#2a2e39] bg-[#131722]"
                        >
                             <div className="flex items-center justify-between bg-[#1e222d] px-4 py-2 border-b border-[#2a2e39]">
                                <span className="flex items-center gap-2 text-[10px] font-bold text-[#787b86] uppercase tracking-widest">
                                    <Cpu size={12} /> System Kernel Diagnostics
                                </span>
                                <span className="text-[10px] font-mono text-white/40">MEMORY_BUFFER: {dashboardState.allRaw.length} NODES</span>
                             </div>
                             <div className="grid grid-cols-2 gap-px bg-[#2a2e39] sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
                                {dashboardState.allRaw.map(p => (
                                    <div key={p.pointId} className="bg-[#131722] p-3 transition-colors hover:bg-white/[0.02]">
                                        <span className="block truncate text-[8px] font-bold text-[#787b86] uppercase mb-1">{p.name || 'NODATA'}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xs font-bold text-white tabular-nums">{p.value?.toFixed(3)}</span>
                                            <span className="text-[8px] text-[#787b86]">{p.unit}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mb-6 flex items-center justify-between border-b border-[#2a2e39] pb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{titleMap[activeTab]}</h2>
                            <div className="flex items-center gap-2 rounded bg-[#089981]/10 px-2 py-0.5 border border-[#089981]/20">
                                <ShieldCheck size={12} className="text-[#089981]" />
                                <span className="text-[9px] font-bold text-[#089981] uppercase tracking-wider">Verified Link</span>
                            </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[#787b86] uppercase font-bold tracking-widest">{isHistoricalMode ? 'ARCHIVE DATASET' : 'REAL-TIME TELEMETRY STREAMING'}</p>
                    </div>
                    {loading && <CircleDashed className="animate-spin text-[#2962ff]" size={20} />}
                </div>

                <DashboardGrid tab={activeTab} data={dashboardState} isHistorical={isHistoricalMode} />
            </main>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}

function DashboardGrid({ tab, data, isHistorical }: { tab: string; data: DashboardState; isHistorical: boolean }) {
    const gridStyle = "grid grid-cols-1 gap-6 xl:grid-cols-2";
    return (
        <div className="space-y-6">
            {tab === 'voltage' && (
                <div className={gridStyle}>
                    <TradingViewCard title="Phase to Neutral Potentials" points={data.voltage.ln} unit="V" isHistory={isHistorical} />
                    <TradingViewCard title="Phase to Phase Potentials" points={data.voltage.ll} unit="V" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'current' && <div className={gridStyle}><TradingViewCard title="Phase Current Density" points={data.current.l} unit="A" isHistory={isHistorical} /></div>}
            {tab === 'power' && (
                <div className="space-y-6">
                    <div className={gridStyle}>
                         <TradingViewCard title="Active Power Flow" points={data.power.active} unit="kW" type="area" isHistory={isHistorical} />
                         <TradingViewCard title="Total System Power" points={data.power.totals} unit="kWh" type="bar" isHistory={isHistorical} />
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2">
                        <TradingViewCard title="Apparent Power State" points={data.power.apparent} unit="kVA" type="line" isHistory={isHistorical} />
                        <TradingViewCard title="Reactive Power State" points={data.power.reactive} unit="kVAr" type="line" isHistory={isHistorical} />
                    </div>
                </div>
            )}
            {tab === 'energy' && (
                <div className={gridStyle}>
                    <TradingViewCard title="Cumulative Active Energy" points={data.energy.active} unit="kWh" type="area" isHistory={isHistorical} />
                    <TradingViewCard title="Cumulative Reactive Energy" points={data.energy.reactive} unit="kVArh" type="area" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'quality' && (
                <div className={gridStyle}>
                    <TradingViewCard title="Voltage Total Harmonic Distortion" points={data.quality.thd_v} unit="%" type="bar" isHistory={isHistorical} />
                    <TradingViewCard title="Current Total Harmonic Distortion" points={data.quality.thd_i} unit="%" type="bar" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'system' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {data.system.metrics.map((p) => (
                        <div key={p.pointId} className="bg-[#131722] border border-[#2a2e39] rounded p-5">
                            <span className="text-[10px] font-black text-[#787b86] uppercase tracking-widest">{p.name}</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white tabular-nums">{p.value?.toFixed(3)}</span>
                                <span className="text-xs font-bold text-[#787b86]">{p.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TradingViewCard({ title, points, unit, isHistory, type = 'line' }: TradingViewCardProps) {
    const [view, setView] = useState<'chart' | 'table'>('chart');

    const combinedHistory = useMemo((): CombinedHistoryRow[] => {
        if (points.length === 0) return [];
        const maxLen = Math.max(...points.map((p) => p.history?.length || 0));
        const res: CombinedHistoryRow[] = [];
        for (let i = 0; i < maxLen; i++) {
            const entry: CombinedHistoryRow = { t: points[0].history?.[i]?.t };
            points.forEach((p, idx) => { entry[`val${idx}`] = p.history?.[i]?.value; });
            res.push(entry);
        }
        return res;
    }, [points]);

    const chartOption = useMemo(() => {
        if (combinedHistory.length === 0) return {};
        const categories = combinedHistory.map(r => r.t);

        return {
            backgroundColor: 'transparent',
            animation: false,
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#1e222d',
                borderColor: '#2a2e39',
                borderWidth: 1,
                padding: [12, 16],
                textStyle: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
                axisPointer: { type: 'cross', lineStyle: { color: COLORS.slate, type: 'dashed' } }
            },
            grid: { left: 50, right: 10, top: 40, bottom: 30 },
            legend: {
                show: points.length > 1,
                icon: 'rect',
                itemWidth: 10,
                itemHeight: 2,
                top: 10,
                right: 10,
                textStyle: { color: COLORS.slate, fontSize: 10, fontWeight: 'bold' }
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisLine: { lineStyle: { color: COLORS.border } },
                axisLabel: { color: COLORS.slate, fontSize: 10, margin: 12 },
                splitLine: { show: true, lineStyle: { color: '#1e222d', type: 'dashed' } },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'left',
                axisLine: { show: false },
                axisLabel: { color: COLORS.slate, fontSize: 10, margin: 12, formatter: (v: number) => v.toFixed(1) },
                splitLine: { show: true, lineStyle: { color: '#1e222d', type: 'dashed' } }
            },
            series: points.map((p, i) => ({
                name: p.name,
                type: type === 'bar' ? 'bar' : 'line',
                symbol: 'none',
                smooth: true,
                lineStyle: { width: 2, color: CHART_SERIES_COLORS[i % 4] },
                itemStyle: { color: CHART_SERIES_COLORS[i % 4] },
                areaStyle: type === 'area' ? {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${CHART_SERIES_COLORS[i % 4]}22` },
                        { offset: 1, color: 'transparent' }
                    ])
                } : undefined,
                data: p.history.map(h => h.value)
            }))
        };
    }, [combinedHistory, points, type]);

    if (points.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded border border-[#2a2e39] bg-[#131722] text-[#787b86]">
                <CircleDashed className="animate-spin mr-3" size={18} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Awaiting Link: {title}</span>
            </div>
        );
    }

    return (
        <div className="bg-[#131722] border border-[#2a2e39] rounded overflow-hidden flex flex-col shadow-2xl">
            {/* Real-time Ticker Header */}
            <div className="flex h-16 items-center justify-between border-b border-[#2a2e39] bg-[#1a1e2a] px-5">
                <div className="flex items-center gap-4">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">{title}</h4>
                    <div className="flex bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
                        <button onClick={() => setView('chart')} className={`px-3 py-1 text-[9px] font-black uppercase rounded ${view === 'chart' ? 'bg-[#2962ff] text-white shadow-sm' : 'text-[#787b86] hover:text-white'}`}>
                            <LayoutGrid size={10} className="inline mr-1.5" /> Chart
                        </button>
                        <button onClick={() => setView('table')} className={`px-3 py-1 text-[9px] font-black uppercase rounded ${view === 'table' ? 'bg-[#2962ff] text-white shadow-sm' : 'text-[#787b86] hover:text-white'}`}>
                            <Table size={10} className="inline mr-1.5" /> Data
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 border-l border-[#2a2e39] pl-4">
                    {points.slice(0, 3).map((p, i) => (
                        <div key={p.pointId} className="text-right">
                            <span className="block text-[8px] font-bold text-[#787b86] uppercase leading-none mb-1">{p.name || 'NOD'}</span>
                            <span className="text-sm font-black tabular-nums transition-all" style={{ color: CHART_SERIES_COLORS[i % 4] }}>
                                {p.value != null ? p.value.toFixed(2) : '--'}
                                <small className="ml-1 text-[8px] text-[#787b86] font-normal">{unit}</small>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 flex-1">
                {isHistory && (
                    <div className="mb-4 flex items-center justify-center gap-2 bg-[#2962ff]/5 border border-[#2962ff]/20 py-1 text-[9px] font-black text-blue-500 rounded uppercase tracking-widest">
                        <History size={10} /> Historical Analysis Buffer (Archive)
                    </div>
                )}
                
                <div className="h-[340px] w-full">
                    {view === 'chart' ? (
                        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
                    ) : (
                        <div className="h-full overflow-auto border border-[#2a2e39] rounded scrollbar-hide">
                            <table className="w-full text-[10px] text-left">
                                <thead className="sticky top-0 bg-[#2a2e39] text-white font-black text-[9px] uppercase tracking-widest">
                                    <tr>
                                        <th className="py-2.5 px-4 font-bold border-r border-white/5">Time Record</th>
                                        {points.map(p => <th key={p.pointId} className="py-2.5 px-4 font-bold">{p.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2e39] text-[#d1d4dc] font-mono">
                                    {[...combinedHistory].reverse().slice(0, 50).map((row, i) => (
                                        <tr key={i} className="hover:bg-blue-500/[0.03]">
                                            <td className="py-2 px-4 text-[#787b86] border-r border-[#2a2e39]">{row.t}</td>
                                            {points.map((_, idx) => (
                                                <td key={idx} className="py-2 px-4 font-bold tabular-nums">
                                                    {row[`val${idx}`] != null ? Number(row[`val${idx}`]).toFixed(3) : '--'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
