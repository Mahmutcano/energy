"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    History,
    Terminal,
    Zap,
    Cpu,
    Activity,
    Search,
    CircleDashed
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion } from 'framer-motion';
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

interface MultiViewCardProps {
    title: string;
    points: TelemetryPoint[];
    unit: string;
    color: string;
    type?: 'line' | 'area' | 'bar';
    isHistory: boolean;
}

interface CombinedHistoryRow {
    t?: string;
    [key: string]: string | number | undefined | null;
}

const PHASE_COLORS = ['#0EA5E9', '#10B981', '#F43F5E'] as const;

const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
};

export default function KineticDashboardContent() {
    const searchParams = useSearchParams();
    const activeTab = (searchParams?.get('cat') || 'voltage').toLowerCase(); 
    
    const [status, setStatus] = useState<string>("BANTDIŞI");
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
    const [, setLoading] = useState(false);

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
                    const result: { success?: boolean; data?: unknown } = await res.json();
                    const data = result.success ? result.data : result;
                    if (Array.isArray(data)) {
                        const list = data as PlantRow[];
                        setPlants(list);
                        if (list.length > 0 && !selectedPlantId) setSelectedPlantId(list[0].id);
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
                    const result: { success?: boolean; data?: unknown } = await res.json();
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
        if (!selectedDeviceId) {
            setLiveData({});
            return;
        }
        
        const initDevice = async () => {
            setLoading(true);
            try {
                const device = devices.find(d => d.id === selectedDeviceId);
                if (device) {
                    if (device.protocolConfigId) setupSocket(device.protocolConfigId);

                    if (device.datasheetProfileId) {
                        const res = await apiRequest(`/api/datasheets?profileId=${device.datasheetProfileId}`);
                        if (res.ok) {
                            const result: { success?: boolean; data?: unknown } = await res.json();
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
            if (data.status) setStatus(data.status === 'CONNECTED' ? 'AKTİF' : 'BANTDIŞI');
        });
        const handleUpdate = (data: TelemetryUpdatePayload) => {
            if (historicalModeRef.current) return;
            // console.log(`[SOCKET] Telemetry received for node: ${data.pointId} | Val: ${data.value}`);
            setLiveData(prev => {
                const updated = { ...prev };
                const pointId = data.pointId;
                if (!pointId) return prev;

                const history = prev[pointId]?.history ?? [];
                const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                const next: TelemetryPoint = {
                    ...(prev[pointId] ?? {
                        pointId,
                        deviceId: '',
                        history: [],
                        value: null,
                    }),
                    ...data,
                    pointId,
                    history: [...history, { value: data.value ?? 0, t }].slice(-30),
                };
                updated[pointId] = next;
                return updated;
            });
        };

        socket.on('telemetry:update', handleUpdate);
        socket.on(`telemetry:raw:${pId}`, (data: TelemetryUpdatePayload | TelemetryUpdatePayload[]) => {
            // Handle both single object and array of objects
            if (Array.isArray(data)) {
                data.forEach(handleUpdate);
            } else {
                handleUpdate(data);
            }
        });
    };

    const fetchHistory = async () => {
        setIsHistoricalMode(true);
        const pointIds = Object.keys(liveData);
        if (pointIds.length === 0) return;

        try {
            const firstPoint = Object.values(liveData)[0];
            const deviceId = firstPoint.deviceId;

            if (!deviceId) {
                console.error("No deviceId found for historical query");
                return;
            }

            const queryParams = new URLSearchParams({
                deviceId,
                pointId: pointIds.join(','),
                ...(hours > 0 ? { hours: hours.toString() } : { startDate: dateRange.start, endDate: dateRange.end })
            });

            const res = await apiRequest(`/api/telemetry/history?${queryParams.toString()}`);
            if (res.ok) {
                const result = (await res.json()) as { success?: boolean; data?: unknown };
                if (result.success && Array.isArray(result.data)) {
                    const grouped: Record<string, TelemetryPoint> = {};
                    
                    pointIds.forEach((id) => {
                        grouped[id] = { ...liveData[id], history: [] };
                    });

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
        } catch (err) {
            console.error("History Fetch Error:", err);
        }
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
            const matchesSearch = searchTerms.some(term => {
                const lt = term.toLowerCase();
                const regex = new RegExp(`(^|[^a-zA-Z])${lt}([^a-zA-Z]|$)`, 'i');
                return regex.test(combined) || combined.includes(lt);
            });
            return matchesSearch;
        };
        const groupPhase = (s: string[], t: string[], m: string[]) => {
            const res: TelemetryPoint[] = [];
            m.forEach(mark => {
                const found = dataArr.find(item => {
                    if (!testMatch(item, s, t)) return false;
                    const c = `${item.name} ${item.signalDescription}`.toLowerCase();
                    const regex = new RegExp(`(^|[^0-9a-zA-Z])${mark}([^0-9a-zA-Z]|$)`, 'i');
                    return regex.test(c) || c.includes(mark.toLowerCase());
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
        voltage: 'GERİLİM ANALİZ HARİTASI', 
        current: 'AKIM VE YÜK PODLARI', 
        power: 'GÜÇ ÜRETİM PARAMETRELERİ', 
        energy: 'BİLANÇO VE ENERJİ VERİLERİ', 
        quality: 'SİSTEM KALİTESİ VE THD', 
        system: 'STABİLİTE VE OPERASYON' 
    };

    return (
        <div className="min-h-screen bg-[#020617] text-[#dfe4fe] selection:bg-[#00ff9d]/20 selection:text-[#00ff9d] relative overflow-hidden">
            {/* Ultra-Premium Background Effects */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,157,0.03)_0%,transparent_100%)]" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00ff9d]/20 to-transparent" />
                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
            </div>

            {/* Header / System Status Bar */}
            <header className="sticky top-0 z-50 flex flex-col gap-4 border-b border-white/[0.04] bg-[#020617]/80 p-4 backdrop-blur-2xl md:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black tracking-tighter text-[#00ff9d] drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">KINETIC CMD</span>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff9d] opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff9d]" />
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00ff9d]/80">Stream Active</span>
                            </div>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white md:text-xl uppercase italic opacity-90">
                            {titleMap[activeTab] || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                         <div className={`inline-flex items-center gap-2 rounded-sm bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-white/[0.05] shadow-inner transition-colors duration-500 ${status === 'AKTİF' ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                            <Activity size={12} className={status === 'AKTİF' ? 'animate-pulse' : ''} />
                            {status}
                         </div>
                         <button
                            type="button"
                            title="Terminal visibility"
                            onClick={() => setIsDevMode(!isDevMode)}
                            className={`flex h-10 w-10 items-center justify-center rounded border border-white/10 transition-all ${isDevMode ? 'bg-[#00ff9d] text-[#020617] shadow-[0_0_15px_#00ff9d]' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
                        >
                            <Terminal size={18} />
                         </button>
                    </div>
                </div>

                {/* Sub-Header: Context Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-white/[0.02] p-2 border border-white/[0.04]">
                    <div className="flex items-center gap-6 px-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Infrastructure</span>
                            <span className="text-xs font-black text-white tracking-wide">
                                {plants.find(p => p.id === selectedPlantId)?.plantName || 'SCANNING...'}
                            </span>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff9d] mb-1">Logic Node</span>
                            <select 
                                value={selectedDeviceId} 
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="cursor-pointer bg-transparent text-xs font-black text-white outline-none ring-0 focus:text-[#00ff9d] transition-colors"
                            >
                                <option value="" className="bg-[#020617]">Select Node...</option>
                                {devices.map(d => <option key={d.id} value={d.id} className="bg-[#020617]">{d.deviceName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-black/40 p-1 rounded border border-white/5">
                            <button 
                                type="button"
                                onClick={() => setIsHistoricalMode(false)}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all duration-300 ${!isHistoricalMode ? 'bg-[#00ff9d] text-[#020617] shadow-[0_0_20px_rgba(0,255,157,0.3)]' : 'text-neutral-500 hover:text-white'}`}
                            >
                                Live
                            </button>
                            <button 
                                type="button"
                                onClick={() => { if (Object.keys(historyData).length === 0) fetchHistory(); else setIsHistoricalMode(true); }}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all duration-300 ${isHistoricalMode ? 'bg-[#222b47] text-white border border-[#00ff9d]/30 shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                            >
                                History
                            </button>
                        </div>

                        <div className="flex items-center gap-4 rounded bg-white/[0.02] px-4 py-2 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase text-neutral-600">t_start</span>
                                    <input type="datetime-local" className="bg-transparent text-[10px] font-black text-white outline-none focus:text-[#00ff9d] transition-colors" 
                                           value={dateRange.start} onChange={e => { setDateRange({...dateRange, start: e.target.value}); setHours(0); }} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase text-neutral-600">t_end</span>
                                    <input type="datetime-local" className="bg-transparent text-[10px] font-black text-white outline-none focus:text-[#00ff9d] transition-colors"
                                           value={dateRange.end} onChange={e => { setDateRange({...dateRange, end: e.target.value}); setHours(0); }} />
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={fetchHistory}
                                className="flex h-10 w-10 items-center justify-center rounded bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 transition-all hover:bg-[#00ff9d] hover:text-[#020617] hover:shadow-[0_0_15px_#00ff9d]"
                            >
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-4 md:px-6">
                {isDevMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 rounded-lg border border-[#69f6b8]/20 bg-black/40 p-5 font-mono"
                    >
                         <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#69f6b8]">
                             <Terminal size={14} /> System Packet Log
                             <span className="opacity-50">[{dashboardState.allRaw.length} nodes active]</span>
                         </h3>
                         <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 overflow-y-auto max-h-48 scrollbar-hide">
                            {dashboardState.allRaw.map(p => (
                                <div key={p.pointId} className="group rounded border border-white/5 bg-white/5 p-2 hover:bg-white/10 transition">
                                    <span className="block truncate text-[8px] font-bold uppercase opacity-40 group-hover:opacity-100">{p.name || 'UNLABELED'}</span>
                                    <span className="text-[12px] font-bold text-[#69f6b8]">{p.value?.toFixed(2)} <span className="text-[8px] opacity-60 font-medium">{p.unit}</span></span>
                                </div>
                            ))}
                         </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <DashboardGrid tab={activeTab} data={dashboardState} isHistorical={isHistoricalMode} />
                </motion.div>
            </main>
        </div>
    );
}


function DashboardGrid({ tab, data, isHistorical }: { tab: string; data: DashboardState; isHistorical: boolean }) {
    const gridStyle = "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8";
    return (
        <div className="space-y-6">
            {tab === 'voltage' && (
                <div className={gridStyle}>
                    <MultiViewCard title="Phase-Neutral Voltage" points={data.voltage.ln} unit="V" color="#69f6b8" isHistory={isHistorical} />
                    <MultiViewCard title="Phase-Phase Voltage" points={data.voltage.ll} unit="V" color="#69f6b8" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'current' && <div className={gridStyle}><MultiViewCard title="Phase Currents" points={data.current.l} unit="A" color="#77e6ff" isHistory={isHistorical} /></div>}
            {tab === 'power' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                        {data.power.totals.map((p) => <KPICard key={p.pointId} point={p} />)}
                    </div>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
                         <MultiViewCard title="Active Power" points={data.power.active} unit="kW" color="#69f6b8" isHistory={isHistorical} />
                         <MultiViewCard title="Apparent Power" points={data.power.apparent} unit="kVA" color="#77e6ff" isHistory={isHistorical} />
                         <MultiViewCard title="Reactive Power" points={data.power.reactive} unit="kVAr" color="#ff716c" isHistory={isHistorical} />
                    </div>
                </div>
            )}
            {tab === 'energy' && (
                <div className={gridStyle}>
                    <MultiViewCard title="Active Energy" points={data.energy.active} unit="kWh" color="#69f6b8" type="area" isHistory={isHistorical} />
                    <MultiViewCard title="Reactive Energy" points={data.energy.reactive} unit="kVArh" color="#ff716c" type="area" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'quality' && (
                <div className={gridStyle}>
                    <MultiViewCard title="THD-V" points={data.quality.thd_v} unit="%" color="#77e6ff" type="bar" isHistory={isHistorical} />
                    <MultiViewCard title="THD-I" points={data.quality.thd_i} unit="%" color="#ffb95f" type="bar" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'system' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {data.system.metrics.map((p) => <MetricCompactCard key={p.pointId} point={p} />)}
                </div>
            )}
        </div>
    );
}

// --- HYBRID VIEW COMPONENT (CHART + TABLE) ---

function MultiViewCard({ title, points, unit, color, type = 'line', isHistory }: MultiViewCardProps) {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const combinedHistory = useMemo((): CombinedHistoryRow[] => {
        if (points.length === 0) return [];
        const maxLen = Math.max(...points.map((p) => p.history?.length || 0));
        const res: CombinedHistoryRow[] = [];
        for (let i = 0; i < maxLen; i++) {
            const entry: CombinedHistoryRow = { t: points[0].history?.[i]?.t };
            points.forEach((p, idx) => {
                entry[`val${idx}`] = p.history?.[i]?.value;
            });
            res.push(entry);
        }
        return res;
    }, [points]);

    const chartColors = PHASE_COLORS;

    const lineChartOption = useMemo(() => {
        if (type !== 'line' || combinedHistory.length === 0) return undefined;
        const categories = combinedHistory.map((r) => r.t || '');
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(7, 13, 31, 0.95)',
                borderWidth: 1,
                borderColor: 'rgba(105, 246, 184, 0.2)',
                padding: [10, 14],
                textStyle: { fontSize: 11, color: '#dfe4fe' },
                extraCssText: 'border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.5); backdrop-filter: blur(8px);',
            },
            legend: {
                show: points.length > 1,
                top: 0,
                right: 4,
                textStyle: { fontSize: 9, color: '#a5aac2' },
                itemWidth: 10,
                itemHeight: 6,
            },
            grid: { left: 4, right: 8, top: points.length > 1 ? 32 : 12, bottom: 8, containLabel: true },
            xAxis: {
                type: 'category',
                data: categories,
                boundaryGap: false,
                axisLabel: { fontSize: 9, color: '#4f5469' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' } },
                axisLabel: { fontSize: 9, color: '#4f5469' },
            },
            series: points.slice(0, 3).map((p, i) => ({
                name: p.name || `L${i + 1}`,
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { 
                    width: 3, 
                    color: chartColors[i % chartColors.length],
                    shadowBlur: 10,
                    shadowColor: chartColors[i % chartColors.length]
                },
                emphasis: { focus: 'series' },
                data: combinedHistory.map((row) => row[`val${i}`] as number | undefined | null),
            })),
        } as echarts.EChartsOption;
    }, [combinedHistory, points, type]);

    const areaChartOption = useMemo(() => {
        if (type !== 'area') return undefined;
        const h = points[0]?.history || [];
        const categories = h.map((x) => x.t || '');
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(7, 13, 31, 0.95)',
                borderWidth: 0,
                textStyle: { fontSize: 11, color: '#dfe4fe' },
                extraCssText: 'border-radius:8px;',
            },
            grid: { left: 4, right: 8, top: 12, bottom: 8, containLabel: true },
            xAxis: {
                type: 'category',
                data: categories,
                boundaryGap: false,
                axisLabel: { fontSize: 9, color: '#4f5469' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' } },
                axisLabel: { fontSize: 9, color: '#4f5469' },
            },
            series: [
                {
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: h.map((x) => x.value),
                    lineStyle: { width: 2, color },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${color}44` },
                            { offset: 1, color: `${color}00` },
                        ]),
                    },
                },
            ],
        } as echarts.EChartsOption;
    }, [points, color, type]);

    const barChartOption = useMemo(() => {
        if (type !== 'bar') return undefined;
        const names = points.map((p) => p.name || '—');
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(7, 13, 31, 0.95)',
                borderWidth: 0,
                textStyle: { fontSize: 11, color: '#dfe4fe' },
                extraCssText: 'border-radius:8px;',
            },
            grid: { left: 4, right: 8, top: 12, bottom: 8, containLabel: true },
            xAxis: {
                type: 'category',
                data: names,
                axisLabel: { fontSize: 9, color: '#4f5469', interval: 0, rotate: names.some((n: string) => n.length > 8) ? 25 : 0 },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' } },
                axisLabel: { fontSize: 9, color: '#4f5469' },
            },
            series: [
                {
                    type: 'bar',
                    barMaxWidth: 32,
                    data: points.map((p, i) => ({
                        value: p.value,
                        itemStyle: {
                            color: i === points.length - 1 ? color : 'rgba(255,255,255,0.05)',
                            borderRadius: [4, 4, 0, 0],
                        },
                    })),
                },
            ],
        } as echarts.EChartsOption;
    }, [points, color, type]);

    if (points.length === 0) return <EmptyState label={title} />;

    const chartHeightClass = 'h-[min(46vh,480px)] min-h-[240px] w-full';

    return (
        <div className="relative group/card flex flex-col overflow-hidden rounded-lg bg-[#11192e] border border-white/5 shadow-2xl">
            <div
                className="h-1 w-full shrink-0 bg-gradient-to-r"
                style={{
                    backgroundImage: `linear-gradient(90deg, ${color}, transparent)`,
                }}
            />
            
            <div className="flex flex-row items-center justify-between gap-3 border-b border-white/5 bg-white/[0.01] px-5 py-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-0.5">{unit}</p>
                    <h4 className="truncate text-sm font-bold tracking-tight text-[#dfe4fe]">{title}</h4>
                </div>
                <div className="flex shrink-0 items-center gap-1 bg-white/5 p-1 rounded">
                    <button type="button" onClick={() => setView('chart')} className={`rounded px-3 py-1.5 transition-all text-[10px] font-bold uppercase ${view === 'chart' ? 'bg-[#222b47] text-[#69f6b8]' : 'text-neutral-500 hover:text-white'}`}>Chart</button>
                    <button type="button" onClick={() => setView('table')} className={`rounded px-3 py-1.5 transition-all text-[10px] font-bold uppercase ${view === 'table' ? 'bg-[#222b47] text-[#69f6b8]' : 'text-neutral-500 hover:text-white'}`}>Table</button>
                </div>
            </div>

            <div className="p-4 flex-1 min-h-0 flex flex-col relative">
                {isHistory && (
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                        <History size={10} className="text-amber-500" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Historical Archive</span>
                    </div>
                )}

                {view === 'chart' ? (
                    <div className={chartHeightClass}>
                        {type === 'line' && lineChartOption && (
                            <ReactECharts option={lineChartOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
                        )}
                        {type === 'area' && areaChartOption && (
                            <ReactECharts option={areaChartOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
                        )}
                        {type === 'bar' && barChartOption && (
                            <ReactECharts option={barChartOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
                        )}
                    </div>
                ) : (
                    <div className={`${chartHeightClass} overflow-auto scrollbar-hide`}>
                         <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="sticky top-0 bg-[#11192e] z-10">
                                <tr className="border-b border-white/5 text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                                    <th className="py-2 px-3">Timestamp</th>
                                    {points.map((p, i) => <th key={p.pointId} className="py-2 px-3">{p.name || `Phase ${i+1}`}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                                {[...combinedHistory].reverse().slice(0, 50).map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="py-2 px-3 text-neutral-500">{row.t}</td>
                                        {points.map((_, idx) => (
                                            <td key={idx} className="py-2 px-3 font-bold text-[#dfe4fe] tabular-nums">
                                                {row[`val${idx}`] != null ? Number(row[`val${idx}`]).toFixed(2) : '—'} <span className="text-[8px] opacity-40 font-normal ml-1">{unit}</span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/[0.04] bg-white/[0.01] px-4 py-3">
                {points.slice(0, 3).map((p, i) => {
                    const h = p.history || [];
                    const values = h
                        .map((entry) => entry.value)
                        .filter((v): v is number => v !== null && v !== undefined);
                    const stats = isHistory && values.length > 0 ? {
                        max: Math.max(...values).toFixed(1),
                        min: Math.min(...values).toFixed(1),
                        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
                    } : null;

                    return (
                        <div key={p.pointId} className="flex flex-col gap-1 min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: chartColors[i % chartColors.length] }}>Phase {i+1}</span>
                            <span className="text-sm font-black text-[#dfe4fe] tabular-nums leading-none truncate">
                                {p.value?.toFixed(1) ?? (isHistory && h.length > 0 ? h[h.length-1].value?.toFixed(1) : '—')} 
                                <span className="text-[10px] ml-1 opacity-40 font-bold">{unit}</span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function KPICard({ point }: { point: TelemetryPoint }) {
    const isRed = point.name?.toLowerCase().includes('reaktif') || point.unit?.toLowerCase().includes('kvar');
    const color = isRed ? '#ff716c' : '#00ff9d';
    
    return (
        <div className="group relative overflow-hidden rounded-sm border border-white/[0.04] bg-[#0a0f1d] p-6 transition-all duration-500 hover:border-[#00ff9d]/40 hover:bg-[#0f172a] hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 group-hover:text-[#00ff9d]/70 transition-colors">{point.name || 'ANALYTIC NODE'}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-hover:text-[#00ff9d] transition-colors tabular-nums">
                            {point.value?.toFixed(2) ?? '0.00'}
                        </span>
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-500 italic">{point.unit || 'U'}</span>
                    </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.02] transition-all group-hover:border-[#00ff9d]/30 group-hover:bg-[#00ff9d]/10 group-hover:rotate-12">
                    <Zap size={20} className="group-hover:drop-shadow-[0_0_8px_#00ff9d]" style={{ color: color }} strokeWidth={2.5} />
                </div>
            </div>
            
            <div className="mt-6">
                <MetricSparkline history={point.history || []} color={color} />
            </div>

            {/* Premium Decorative elements */}
            <div className="absolute top-0 right-0 p-1 opacity-20">
                <div className="h-1.5 w-1.5 bg-[#00ff9d]/40 rounded-full" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff9d]/20 to-transparent" />
        </div>
    );
}

function MetricSparkline({ history, color = '#69f6b8' }: { history: HistoryEntry[]; color?: string }) {
    const option = useMemo(() => {
        const h = history ?? [];
        const data = h.map((x) => (x.value != null ? x.value : null));
        if (h.length === 0 || !data.some((v) => v != null)) return undefined;
        return {
            backgroundColor: 'transparent',
            grid: { left: 0, right: 0, top: 2, bottom: 2 },
            xAxis: { type: 'category', show: false, data: h.map((_, i) => i) },
            yAxis: { type: 'value', show: false, scale: true },
            series: [
                {
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    connectNulls: true,
                    data,
                    lineStyle: { width: 1.5, color },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${color}33` },
                            { offset: 1, color: `${color}00` },
                        ]),
                    },
                },
            ],
        } as echarts.EChartsOption;
    }, [history, color]);

    if (!option) return <div className="h-12 w-full bg-white/[0.02] rounded" />;

    return (
        <div className="h-12 w-full opacity-70">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
        </div>
    );
}

function MetricCompactCard({ point }: { point: TelemetryPoint }) {
    const color = '#77e6ff';
    return (
        <div className="group relative flex min-h-[160px] flex-col overflow-hidden rounded-sm bg-[#0a0f1d] border border-white/[0.04] p-6 transition-all duration-500 hover:border-[#77e6ff]/30 hover:bg-[#0f172a] shadow-lg">
            <div className="relative flex items-start justify-between gap-4 mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600 group-hover:text-white transition-colors uppercase">{point.name}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded border border-white/[0.06] bg-white/[0.02] text-neutral-500 group-hover:text-[#77e6ff] transition-all group-hover:border-[#77e6ff]/20">
                    <Cpu size={18} strokeWidth={2} />
                </div>
            </div>
            <div className="relative mt-auto">
                <div className="flex items-baseline gap-2 mb-4">
                    <h3 className="text-3xl font-black tabular-nums tracking-tighter text-white drop-shadow-md group-hover:text-[#77e6ff] transition-colors">{point.value?.toFixed(2) ?? '—'}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 italic">{point.unit || ''}</span>
                </div>
                <MetricSparkline history={point.history || []} color={color} />
            </div>
            {/* Corner Accent */}
            <div className="absolute bottom-0 right-0 w-8 h-8 opacity-5">
                <div className="absolute bottom-0 right-0 w-px h-full bg-white transition-all group-hover:bg-[#77e6ff] group-hover:h-1/2" />
                <div className="absolute bottom-0 right-0 w-full h-px bg-white transition-all group-hover:bg-[#77e6ff] group-hover:w-1/2" />
            </div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/5 bg-[#11192e]/50 backdrop-blur-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/[0.02] shadow-2xl">
                <CircleDashed size={28} className="animate-spin text-[#69f6b8] opacity-50" />
            </div>
            <p className="max-w-xs px-6 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">
                {label}
            </p>
            <p className="mt-2 text-[11px] font-bold text-[#69f6b8] animate-pulse">Waiting for Data Pipeline...</p>
        </div>
    );
}
