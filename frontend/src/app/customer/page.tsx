"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Activity, 
    Zap, 
    Layers, 
    BarChart3, 
    ShieldAlert,
    Cpu,
    ZapOff,
    Gauge,
    RefreshCw,
    CircleDashed,
    LayoutGrid,
    Table,
    LineChart as LineChartIcon,
    Calendar,
    ArrowRight,
    Search,
    History,
    Radio,
    Terminal
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
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
    Cell,
    LineChart,
    Line
} from 'recharts';

export default function KineticDashboardContent() {
    const searchParams = useSearchParams();
    const activeTab = (searchParams?.get('cat') || 'voltage').toLowerCase(); 
    
    const [status, setStatus] = useState<string>("BANTDIŞI");
    const [liveData, setLiveData] = useState<Record<string, any>>({});
    const [historyData, setHistoryData] = useState<Record<string, any>>({});
    const [isDevMode, setIsDevMode] = useState(false);
    const [isHistoricalMode, setIsHistoricalMode] = useState(false);

    const formatDateForInput = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    const [hours, setHours] = useState<number>(24);
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return { start: formatDateForInput(oneMonthAgo), end: formatDateForInput(now) };
    });

    const [plants, setPlants] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
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
                    const all = result.success ? result.data : result;
                    const filtered = all.filter((d: any) => d.protocol?.plant?.id === selectedPlantId);
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
                    // Update socket connection
                    if (device.protocolConfigId) setupSocket(device.protocolConfigId);

                    // Fetch points
                    if (device.datasheetProfileId) {
                        const res = await apiRequest(`/api/datasheets?profileId=${device.datasheetProfileId}`);
                        if (res.ok) {
                            const result = await res.json();
                            const pointsData = result.success ? result.data : result;
                            const initialData: Record<string, any> = {};
                            pointsData.forEach((p: any) => {
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
        };
    }, [selectedDeviceId]);

    const setupSocket = (pId: string) => {
        socket.emit('join:protocol', { protocolId: pId });
        socket.on('protocol:status', (data: any) => {
            if (data.status) setStatus(data.status === 'CONNECTED' ? 'AKTİF' : 'BANTDIŞI');
        });
        socket.on('telemetry:update', (data: any) => {
            if (isHistoricalMode) return; // Ignore live updates in historical mode
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

    const fetchHistory = async () => {
        setIsHistoricalMode(true);
        const pointIds = Object.keys(liveData);
        if (pointIds.length === 0) return;

        try {
            // Pick deviceId from first available point
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
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                    const grouped: Record<string, any> = {};
                    
                    // Initialize groups with empty history
                    pointIds.forEach(id => {
                        grouped[id] = { ...liveData[id], history: [] };
                    });

                    // Fill history
                    result.data.forEach((row: any) => {
                        if (grouped[row.pointId]) {
                            const date = new Date(row.time);
                            grouped[row.pointId].history.push({
                                ...row,
                                t: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            });
                        }
                    });

                    setHistoryData(grouped);
                }
            }
        } catch (err) {
            console.error("History Fetch Error:", err);
        }
    };

    const dashboardState = useMemo(() => {
        const dataArr = Object.values(isHistoricalMode ? historyData : liveData);
        if (dataArr.length === 0) return { voltage: { ln: [], ll: [] }, current: { l: [] }, power: { active: [], apparent: [], reactive: [], totals: [] }, energy: { active: [], reactive: [] }, quality: { thd_v: [], thd_i: [] }, system: { metrics: [] }, allRaw: [] };

        const testMatch = (point: any, searchTerms: string[], typeMatch: string[]) => {
            const n = (point.name || "").toLowerCase();
            const d = (point.signalDescription || "").toLowerCase();
            const t = (point.measurementType || "").toLowerCase();
            const combined = `${n} ${d} ${t}`;
            
            // Exact type match is strongest
            if (typeMatch.length > 0 && typeMatch.some(tm => t === tm.toLowerCase())) return true;
            
            // Fallback to fuzzy search
            const matchesSearch = searchTerms.some(term => {
                const lt = term.toLowerCase();
                const regex = new RegExp(`(^|[^a-zA-Z])${lt}([^a-zA-Z]|$)`, 'i');
                return regex.test(combined) || combined.includes(lt);
            });
            return matchesSearch;
        };
        const groupPhase = (s: string[], t: string[], m: string[]) => {
            const res: any[] = [];
            m.forEach(mark => {
                const found = dataArr.find(item => {
                    if (!testMatch(item, s, t)) return false;
                    const c = `${item.name} ${item.signalDescription}`.toLowerCase();
                    const regex = new RegExp(`(^|[^0-9a-zA-Z])${mark}([^0-9a-zA-Z]|$)`, 'i');
                    return regex.test(c) || c.includes(mark.toLowerCase());
                });
                if (found) res.push(found);
            });
            // If no phase-specific found, return all that match the category
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

    const titleMap: Record<string, string> = { voltage: 'GERİLİM ANALİZ HARİTASI', current: 'AKIM VE YÜK PODLARI', power: 'GÜÇ ÜRETİM PARAMETRELERİ', energy: 'BİLANÇO VE ENERJİ VERİLERİ', quality: 'SİSTEM KALİTESİ VE THD', system: 'STABİLİTE VE OPERASYON' };

    return (
        <div className="space-y-12">
            {/* Premium Dual-Row Header */}
            <header className="flex flex-col gap-8 border-b border-slate-100 pb-10 sticky top-0 bg-[#F8FAFC]/90 backdrop-blur-xl z-50 pt-4">
                {/* Row 1: Title & Global Status */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-3 text-[10px] font-black text-[#10B981] uppercase tracking-[0.4em] leading-none">
                            <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" /> 
                            SİSTEM VERİ AKIŞI AKTİF
                        </div>
                        <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none uppercase">
                            {titleMap[activeTab] || 'DASHBOARD'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                         <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 transition-all duration-500 shadow-sm ${status === 'AKTİF' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'AKTİF' ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                         </div>
                         <button onClick={() => setIsDevMode(!isDevMode)} className={`p-3.5 border rounded-2xl transition-all shadow-sm ${isDevMode ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-white border-slate-200 text-slate-400 hover:border-[#10B981]/30 hover:text-[#10B981]'}`}>
                            <Terminal size={22} />
                         </button>
                    </div>
                </div>

                {/* Row 2: Context & Analytics Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white/40 p-1.5 rounded-[32px] border border-slate-200/60 shadow-sm">
                    {/* Device & Context Group */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 pr-4">
                        <div className="flex flex-col px-5 py-1.5 min-w-[140px]">
                            <span className="text-[7px] font-[900] text-slate-400 uppercase tracking-[0.2em] mb-0.5">KAPSAM</span>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[120px]">
                                {plants.find(p => p.id === selectedPlantId)?.plantName || '...'}
                            </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200/60" />
                        <div className="flex flex-col px-5 py-1.5">
                            <span className="text-[7px] font-[900] text-[#10B981] uppercase tracking-[0.2em] mb-0.5">CİHAZ ANALİZİ</span>
                            <select 
                                value={selectedDeviceId} 
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="bg-transparent text-[11px] font-[900] text-slate-900 outline-none cursor-pointer hover:text-[#10B981] transition-colors uppercase tracking-tight"
                            >
                                <option value="">Cihaz Seçin...</option>
                                {devices.map(d => <option key={d.id} value={d.id}>{d.deviceName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Controls & Timeline Group */}
                    <div className="flex items-center gap-4">
                        {/* Period & History Selectors */}
                        <div className="flex items-center gap-3">
                            <div className="relative group/select">
                                <select 
                                    value={hours} 
                                    onChange={(e) => setHours(Number(e.target.value))}
                                    className="bg-white border border-slate-200 rounded-2xl pl-10 pr-12 py-3 text-[10px] font-black text-slate-900 outline-none hover:border-[#10B981]/40 focus:border-[#10B981] transition-all appearance-none cursor-pointer uppercase tracking-widest shadow-sm"
                                >
                                    <option value={0}>ÖZEL ARALIK</option>
                                    <option value={1}>SON 1 SAAT</option>
                                    <option value={6}>SON 6 SAAT</option>
                                    <option value={12}>SON 12 SAAT</option>
                                    <option value={24}>SON 24 SAAT</option>
                                    <option value={168}>SON 7 GÜN</option>
                                    <option value={720}>SON 30 GÜN</option>
                                </select>
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-[#10B981] transition-colors" size={14} />
                            </div>

                            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button 
                                    onClick={() => setIsHistoricalMode(false)}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black transition-all ${!isHistoricalMode ? 'bg-[#10B981] text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Radio size={14} className={!isHistoricalMode ? 'animate-pulse' : ''} /> CANLI
                                </button>
                                <button 
                                    onClick={() => { if (Object.keys(historyData).length === 0) fetchHistory(); else setIsHistoricalMode(true); }}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black transition-all ${isHistoricalMode ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <History size={14} /> GEÇMİŞ
                                </button>
                            </div>
                        </div>

                        {/* Date Range Tool */}
                        <div className="flex items-center gap-3 bg-white border border-slate-200 pl-6 pr-3 py-1.5 rounded-2xl shadow-sm hover:border-[#10B981]/50 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">BAŞLANGIÇ</span>
                                    <input type="datetime-local" className="bg-transparent border-none outline-none text-[10px] font-black text-slate-900 cursor-pointer" 
                                           value={dateRange.start} onChange={e => { setDateRange({...dateRange, start: e.target.value}); setHours(0); }} />
                                </div>
                                <ArrowRight size={14} className="text-slate-300" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">BİTİŞ</span>
                                    <input type="datetime-local" className="bg-transparent border-none outline-none text-[10px] font-black text-slate-900 cursor-pointer"
                                           value={dateRange.end} onChange={e => { setDateRange({...dateRange, end: e.target.value}); setHours(0); }} />
                                </div>
                            </div>
                            <button 
                                onClick={fetchHistory}
                                className="ml-4 w-10 h-10 bg-[#0F172A] text-white rounded-xl flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
                            >
                                <Search size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {isDevMode && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-12 border border-slate-800 shadow-3xl overflow-hidden relative group">
                     <div className="absolute top-0 right-0 p-12 opacity-5"><Cpu size={120} className="text-emerald-400" /></div>
                     <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-10 flex items-center gap-4">
                         <Terminal size={20} /> CANLI VERİ HATTI ANALİZİ <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] tracking-normal font-medium">{dashboardState.allRaw.length} AKTİF SİNYAL</span>
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 max-h-[500px] overflow-y-auto scrollbar-hide pr-6">
                        {dashboardState.allRaw.map(p => (
                            <div key={p.pointId} className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all cursor-crosshair">
                                <span className="text-[10px] font-black text-slate-500 truncate block mb-1 uppercase tracking-tighter">{p.name || 'Sinyal Girişi'}</span>
                                <span className="text-base font-black text-white tabular-nums leading-none">{p.value?.toFixed(3)} <span className="text-[10px] opacity-40 ml-1 font-bold text-emerald-400">{p.unit}</span></span>
                            </div>
                        ))}
                     </div>
                </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                <DashboardGrid tab={activeTab} data={dashboardState} isHistorical={isHistoricalMode} />
            </motion.div>
        </div>
    );
}

function DashboardGrid({ tab, data, isHistorical }: { tab: string, data: any, isHistorical: boolean }) {
    const gridStyle = "grid grid-cols-1 lg:grid-cols-2 gap-12";
    return (
        <div className="space-y-16">
            {tab === 'voltage' && (
                <div className={gridStyle}>
                    <MultiViewCard title="Anlık Faz-Nötr Gerilimleri" points={data.voltage.ln} unit="V" color="#0EA5E9" isHistory={isHistorical} />
                    <MultiViewCard title="Anlık Faz-Faz Gerilimleri" points={data.voltage.ll} unit="V" color="#0EA5E9" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'current' && <div className={gridStyle}><MultiViewCard title="Faz Akımları" points={data.current.l} unit="A" color="#10B981" isHistory={isHistorical} /></div>}
            {tab === 'power' && (
                <div className="space-y-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {data.power.totals.map((p: any) => <KPICard key={p.pointId} point={p} />)}
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                         <MultiViewCard title="Aktif Güç" points={data.power.active} unit="kW" color="#F43F5E" isHistory={isHistorical} />
                         <MultiViewCard title="Görünür Güç" points={data.power.apparent} unit="kVA" color="#F97316" isHistory={isHistorical} />
                         <MultiViewCard title="Reaktif Güç" points={data.power.reactive} unit="kVAr" color="#F59E0B" isHistory={isHistorical} />
                    </div>
                </div>
            )}
            {tab === 'energy' && (
                <div className={gridStyle}>
                    <MultiViewCard title="Aktif Enerji" points={data.energy.active} unit="kWh" color="#7C3AED" type="area" isHistory={isHistorical} />
                    <MultiViewCard title="Reaktif Enerji" points={data.energy.reactive} unit="kVArh" color="#8B5CF6" type="area" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'quality' && (
                <div className={gridStyle}>
                    <MultiViewCard title="Gerilim Harmonikleri (THD-V)" points={data.quality.thd_v} unit="%" color="#2DD4BF" type="bar" isHistory={isHistorical} />
                    <MultiViewCard title="Akım Harmonikleri (THD-I)" points={data.quality.thd_i} unit="%" color="#F59E0B" type="bar" isHistory={isHistorical} />
                </div>
            )}
            {tab === 'system' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                    {data.system.metrics.map((p: any) => <MetricCompactCard key={p.pointId} point={p} />)}
                </div>
            )}
        </div>
    );
}

// --- HYBRID VIEW COMPONENT (CHART + TABLE) ---

function MultiViewCard({ title, points, unit, color, type = 'line', isHistory }: any) {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const combinedHistory = useMemo(() => {
        if (points.length === 0) return [];
        const maxLen = Math.max(...points.map((p:any) => p.history?.length || 0));
        const res = [];
        for (let i = 0; i < maxLen; i++) {
            const entry: any = { t: points[0].history?.[i]?.t };
            points.forEach((p:any, idx:any) => entry[`val${idx}`] = p.history?.[i]?.value);
            res.push(entry);
        }
        return res;
    }, [points]);

    if (points.length === 0) return <EmptyState label={title} />;
    const phaseColors = ['#0EA5E9', '#10B981', '#F43F5E'];

    return (
        <div className="volt-card bg-white border border-slate-200 overflow-hidden flex flex-col group/card relative">
            {/* Status indicators for chart */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                 {isHistory ? (
                     <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full flex items-center gap-1.5 shadow-xl">
                         <History size={10} className="text-amber-400" />
                         <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">GEÇMİŞ ANALİZ</span>
                     </div>
                 ) : (
                    <div className="px-3 py-1 bg-white border border-emerald-100 rounded-full flex items-center gap-1.5 shadow-sm">
                        <div className="w-1 h-1 rounded-full bg-[#10B981] animate-ping" />
                        <span className="text-[8px] font-black text-[#10B981] uppercase tracking-widest leading-none">GERÇEK ZAMANLI</span>
                    </div>
                 )}
            </div>

            <div className="p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start gap-8">
                <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{unit} AKTİVİTE PODU</span>
                    <h4 className="text-[20px] font-[900] text-slate-900 tracking-tight uppercase leading-none">{title}</h4>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl self-end shadow-inner transition-transform group-hover/card:scale-105 duration-500">
                    <button onClick={() => setView('chart')} className={`p-2.5 rounded-xl transition-all ${view === 'chart' ? 'bg-white shadow-lg text-[#10B981]' : 'text-slate-400 hover:text-slate-600'}`}><LineChartIcon size={18} /></button>
                    <button onClick={() => setView('table')} className={`p-2.5 rounded-xl transition-all ${view === 'table' ? 'bg-white shadow-lg text-[#10B981]' : 'text-slate-400 hover:text-slate-600'}`}><Table size={18} /></button>
                </div>
            </div>

            <div className="p-10 flex-1">
                {view === 'chart' ? (
                    <div className="h-[320px] w-full">
                        {type === 'line' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={combinedHistory}>
                                    <CartesianGrid strokeDasharray="8 8" stroke="#F1F5F9" vertical={false} />
                                    <XAxis dataKey="t" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }} />
                                    {points.slice(0, 3).map((_:any, i:any) => (
                                        <Line key={i} type="monotone" dataKey={`val${i}`} stroke={phaseColors[i]} strokeWidth={4} dot={false} animationDuration={1000} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        {type === 'area' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={points[0]?.history || []}>
                                    <defs>
                                        <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="8 8" stroke="#F1F5F9" vertical={false} />
                                    <XAxis dataKey="t" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', fontSize: '11px', fontWeight: 'bold' }} />
                                    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${title})`} strokeWidth={5} animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                        {type === 'bar' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={points}>
                                    <CartesianGrid strokeDasharray="10 10" stroke="#F1F5F9" vertical={false} />
                                    <Bar dataKey="value" radius={[16, 16, 0, 0]}>{points.map((_:any, i:any) => <Cell key={i} fill={i === points.length - 1 ? color : '#E2E8F0'} />)}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                ) : (
                    <div className="h-[320px] overflow-x-auto overflow-y-auto scrollbar-hide">
                         <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 px-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">OKUMA SAATİ</th>
                                    {points.map((p:any, i:any) => <th key={i} className="py-4 px-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">{p.name || `Faz ${i+1}`}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {[...combinedHistory].reverse().slice(0, 50).map((row, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-3 text-xs font-bold text-slate-400 tabular-nums">{row.t}</td>
                                        {points.map((_:any, idx:any) => (
                                            <td key={idx} className="py-4 px-3 text-xs font-black text-slate-900 tabular-nums">
                                                {row[`val${idx}`]?.toFixed(2)} <span className="text-[10px] opacity-40 font-bold ml-1">{unit}</span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                )}
            </div>

            {/* Bottom Stats Grid - Like Analytics Page */}
            <div className="px-10 py-8 grid grid-cols-3 gap-6 border-t border-slate-50 bg-slate-50/30">
                {points.slice(0, 3).map((p:any, i:any) => {
                    const h = p.history || [];
                    const values = h.map((entry: any) => entry.value).filter((v: any) => v !== null);
                    const stats = isHistory && values.length > 0 ? {
                        max: Math.max(...values).toFixed(1),
                        min: Math.min(...values).toFixed(1),
                        avg: (values.reduce((a:any, b:any) => a + b, 0) / values.length).toFixed(1)
                    } : null;

                    return (
                        <div key={i} className="flex flex-col gap-3 group/stat">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter" style={{ color: phaseColors[i] }}>FAZ L{i+1} DEĞERİ</span>
                                <span className="text-2xl font-[900] text-slate-900 tabular-nums leading-none">{p.value?.toFixed(1) || (isHistory && h.length > 0 ? h[h.length-1].value?.toFixed(1) : '--.-')} <span className="text-[11px] font-bold text-slate-300">{unit}</span></span>
                            </div>
                            
                            {isHistory && stats && (
                                <div className="flex items-center gap-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 uppercase">MAX</span>
                                        <span className="text-[10px] font-black text-slate-900 tabular-nums">{stats.max}</span>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 uppercase">MIN</span>
                                        <span className="text-[10px] font-black text-slate-900 tabular-nums">{stats.min}</span>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 uppercase">AVG</span>
                                        <span className="text-[10px] font-black text-slate-900 tabular-nums">{stats.avg}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function KPICard({ point }: { point: any }) {
    const isRed = point.name?.toLowerCase().includes('reaktif');
    const color = isRed ? '#F43F5E' : '#10B981';
    return (
        <div className="volt-card p-10 flex flex-col justify-between h-64 bg-white border border-slate-200 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000"><Zap size={100} /></div>
            <div className="flex justify-between items-start z-10">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{point.name}</span>
                <div className={`w-4 h-4 rounded-full animate-pulse shadow-[0_0_12px_currentColor]`} style={{ backgroundColor: color, color }} />
            </div>
            <div className="flex items-baseline gap-4 z-10">
                <h3 className="text-6xl font-[950] text-slate-900 tracking-tighter">{point.value?.toFixed(1)}</h3>
                <span className="text-[22px] font-bold text-slate-200 uppercase leading-none">{point.unit || ''}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 z-10">
                <div className="h-full opacity-60" style={{ width: '100%', backgroundColor: color }} />
            </div>
        </div>
    );
}

function MetricCompactCard({ point }: { point: any }) {
    return (
        <div className="volt-card p-10 flex flex-col justify-between h-72 bg-white border border-slate-200 relative group overflow-hidden">
            <div className="flex justify-between items-start">
                <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">{point.name}</span>
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-[#10B981] shadow-inner group-hover:rotate-12 transition-transform"><Gauge size={24} /></div>
            </div>
            <div className="space-y-6">
                <div className="flex items-baseline gap-4">
                    <h3 className="text-6xl font-[950] text-slate-900 tracking-tighter leading-none">{point.value?.toFixed(3)}</h3>
                    <span className="text-[24px] font-bold text-slate-100 italic-none leading-none">{point.unit || ''}</span>
                </div>
                <div className="h-12 w-full opacity-60 group-hover:opacity-100 transition-opacity"><ResponsiveContainer width="100%" height="100%"><AreaChart data={point.history || []}><Area type="monotone" dataKey="value" stroke="#6366F1" fill="#6366F1" strokeWidth={4} /></AreaChart></ResponsiveContainer></div>
            </div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="h-[450px] flex flex-col items-center justify-center volt-card bg-slate-50/40 border-dashed border-slate-200">
            <div className="p-12 rounded-full bg-white shadow-2xl border border-slate-100 mb-10"><CircleDashed size={64} className="text-[#10B981] animate-spin" /></div>
            <p className="text-[14px] font-black tracking-[0.6em] text-slate-400 uppercase text-center leading-relaxed">
                {label}<br/><span className="text-[#10B981] opacity-70">SİNYAL HATTI TARANIYOR...</span>
            </p>
        </div>
    );
}
