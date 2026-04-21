"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { AnimatePresence } from 'framer-motion';

// Separate Components
import TickerBar from '@/components/customer/TickerBar';
import TradingViewHeader from '@/components/customer/TradingViewHeader';
import SidebarInfo from '@/components/customer/SidebarInfo';
import TerminalToolbelt from '@/components/customer/TerminalToolbelt';
import TerminalCard from '@/components/customer/TerminalCard';
import AppleSparkCard from '@/components/customer/AppleSparkCard';

/** API / socket telemetry point (customer dashboard) */
interface TelemetryPoint {
    pointId: string;
    deviceId: string;
    name?: string;
    signalDescription?: string;
    measurementType?: string;
    unit?: string;
    value: number | null;
    prevValue?: number | null;
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
    status: string;
    activeAlarms: any[];
}

export default function TradingViewCustomerDashboard() {
    const searchParams = useSearchParams();
    const activeTab = (searchParams?.get('cat') || 'dashboard').toLowerCase(); 
    
    const [status, setStatus] = useState<string>("CONNECTING");
    const [liveData, setLiveData] = useState<Record<string, TelemetryPoint>>({});
    const [historyData, setHistoryData] = useState<Record<string, TelemetryPoint>>({});
    const [isHistoricalMode, setIsHistoricalMode] = useState(false);
    const [range, setRange] = useState('1g');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const rangeMap: Record<string, number> = {
        '1g': 24,
        '1h': 168,
        '1a': 720,
        '6a': 4320,
        '1y': 8760,
        'Tüm': 87600
    };

    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [devices, setDevices] = useState<DeviceRow[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [persistentAlarms, setPersistentAlarms] = useState<any[]>([]);

    const historicalModeRef = React.useRef(isHistoricalMode);
    useEffect(() => { historicalModeRef.current = isHistoricalMode; }, [isHistoricalMode]);

    // Navigation helper
    const setActiveTab = (tab: string) => {
        const params = new URLSearchParams(window.location.search);
        params.set('cat', tab);
        window.history.pushState({}, '', `?${params.toString()}`);
    };

    // Fetch initial data
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

        const fetchAlarms = async () => {
            try {
                const res = await apiRequest('/api/alarms');
                if (res.ok) {
                    const data = await res.json();
                    setPersistentAlarms(data);
                }
            } catch (err) { console.error("Fetch alarms error:", err); }
        };

        fetchInitial();
        fetchAlarms();
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

    const setupSocket = (pId: string) => {
        socket.emit('join:protocol', { protocolId: pId });
        socket.on('protocol:status', (data: any) => {
            if (data.status) setStatus(data.status);
        });
        const handleUpdate = (data: any) => {
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
                        prevValue: prev[pointId].value,
                        ...data,
                        history: [...history, { value: data.value ?? 0, t }].slice(-50),
                    }
                };
            });
        };

        socket.on('telemetry:update', handleUpdate);
        socket.on(`telemetry:raw:${pId}`, (data: any) => {
            if (Array.isArray(data)) data.forEach(handleUpdate);
            else handleUpdate(data);
        });

        // Alarm Listeners
        socket.on('alarm:comm:new', (alarm: any) => {
            setPersistentAlarms(prev => {
                if (prev.find(a => a.id === alarm.id)) return prev;
                return [alarm, ...prev];
            });
        });

        socket.on('alarm:comm:resolved', (resolved: any) => {
            setPersistentAlarms(prev => 
                prev.map(a => a.id === resolved.id ? { ...a, status: 'RESOLVED', endTime: resolved.endTime } : a)
            );
        });
    };

    useEffect(() => {
        const initDevice = async () => {
            if (!selectedDeviceId) {
                setLiveData({});
                return;
            }
            try {
                const device = devices.find(d => d.id === selectedDeviceId);
                if (device) {
                    if (device.protocolConfigId) setupSocket(device.protocolConfigId);
                    if (device.datasheetProfileId) {
                        const res = await apiRequest(`/api/datasheets?profileId=${device.datasheetProfileId}`);
                        if (res.ok) {
                            const result = await res.json();
                            const pointsData = (result.success ? result.data : result) as any[];
                            const initialData: Record<string, TelemetryPoint> = {};
                            
                            // 1. Initialize keys FIRST to allow socket to bind
                            pointsData.forEach(p => {
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

                            // 2. Fetch history in parallel for speed
                            Promise.all(pointsData.map(async (p) => {
                                try {
                                    const hRes = await apiRequest(`/api/telemetry/history?pointId=${p.id}&deviceId=${device.id}&limit=50`);
                                    if (hRes.ok) {
                                        const hResult = await hRes.json();
                                        const hPoints = (hResult.success ? hResult.data : hResult) as any[];
                                        const seededHistory = hPoints.map(hp => {
                                            const raw = hp.time || hp.timestamp || hp.t || hp.createdAt;
                                            if (typeof raw === 'string' && raw.includes(':') && raw.length < 10) {
                                                return { t: raw, value: hp.value };
                                            }
                                            const dateObj = new Date(raw || new Date());
                                            if (isNaN(dateObj.getTime())) {
                                                return { t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: hp.value };
                                            }

                                            const now = new Date();
                                            const isToday = dateObj.toDateString() === now.toDateString();
                                            const timeStr = isToday 
                                                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return { t: timeStr, value: hp.value };
                                        }).reverse();
                                        
                                        setLiveData(prev => {
                                            if (!prev[p.id]) return prev;
                                            return {
                                                ...prev,
                                                [p.id]: {
                                                    ...prev[p.id],
                                                    value: seededHistory[seededHistory.length - 1]?.value ?? null,
                                                    history: seededHistory
                                                }
                                            };
                                        });
                                    }
                                } catch (e) { console.warn("Seed history failed for", p.id); }
                            }));

                            setHistoryData({});
                            setIsHistoricalMode(false);
                        }
                    }
                }
            } catch (err) { console.error("Init device error:", err); }
        };
        initDevice();

        return () => {
            socket.off('protocol:status');
            socket.off('telemetry:update');
            socket.off('alarm:comm:new');
            socket.off('alarm:comm:resolved');
            const device = devices.find(d => d.id === selectedDeviceId);
            if (device?.protocolConfigId) {
                socket.off(`telemetry:raw:${device.protocolConfigId}`);
            }
        };
    }, [selectedDeviceId, devices]);

    useEffect(() => {
        if (!isHistoricalMode || !selectedDeviceId) return;
        
        const fetchHistory = async () => {
            const hCount = rangeMap[range] || 24;
            const points = Object.values(liveData);
            const historyObj: Record<string, TelemetryPoint> = {};

            for (const p of points) {
                try {
                    const res = await apiRequest(`/api/telemetry/history?pointId=${p.pointId}&deviceId=${selectedDeviceId}&limit=50&hours=${hCount}`);
                    if (res.ok) {
                        const result = await res.json();
                        const historyPoints = (result.success ? result.data : result) as any[];
                        historyObj[p.pointId] = {
                            ...p,
                            history: historyPoints.map(hp => {
                                const raw = hp.time || hp.timestamp || hp.t || hp.createdAt;
                                if (typeof raw === 'string' && raw.includes(':') && raw.length < 10) {
                                    return { t: raw, value: hp.value };
                                }
                                const dateObj = new Date(raw || new Date());
                                if (isNaN(dateObj.getTime())) {
                                    return { t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: hp.value };
                                }

                                const now = new Date();
                                const isToday = dateObj.toDateString() === now.toDateString();
                                const timeStr = isToday 
                                    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return { t: timeStr, value: hp.value };
                            }).reverse(),
                            value: historyPoints[0]?.value ?? null
                        };
                    }
                } catch (err) { console.error("Fetch history error:", err); }
            }
            setHistoryData(historyObj);
        };
        fetchHistory();
    }, [isHistoricalMode, selectedDeviceId, range]);

    const dashboardState = useMemo((): DashboardState => {
        const dataArr = Object.values(isHistoricalMode ? historyData : liveData);
        if (dataArr.length === 0) return { 
            voltage: { ln: [], ll: [] }, 
            current: { l: [] }, 
            power: { active: [], apparent: [], reactive: [], totals: [] }, 
            energy: { active: [], reactive: [] }, 
            quality: { thd_v: [], thd_i: [] }, 
            system: { metrics: [] }, 
            allRaw: [],
            status: status,
            activeAlarms: []
        };

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
            
            // Strictly match each phase mark once
            m.forEach(mark => {
                const found = dataArr.find(item => {
                    if (!testMatch(item, s, t)) return false;
                    const combined = `${item.name} ${item.signalDescription} ${item.measurementType}`.toLowerCase();
                    
                    // Simple regex to match exact phase markers like 'L1' or 'A Faz' specifically
                    const regex = new RegExp(`\\b${mark.toLowerCase()}\\b`, 'i');
                    return regex.test(combined);
                });
                if (found && !res.find(r => r.pointId === found.pointId)) {
                    res.push(found);
                }
            });

            return res.length > 0 ? res : dataArr.filter(p => testMatch(p, s, t)).slice(0, 3);
        };

        const phaseM = ['L1', 'L2', 'L3'];
        const llM = ['L1-L2', 'L2-L3', 'L3-L1', 'A-B', 'B-C', 'C-A', 'AB', 'BC', 'CA'];
        
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
            allRaw: dataArr,
            status: status,
            activeAlarms: [
                // 1. Backend Persistent Alarms (Only show relevant for selected device or global ones if needed)
                ...persistentAlarms
                    .filter(a => a.status === 'ACTIVE')
                    .map(a => ({
                        id: a.id,
                        severity: 'critical',
                        type: 'SİSTEM',
                        message: a.message,
                        time: new Date(a.startTime).toLocaleTimeString(),
                        area: 'HABERLEŞME'
                    })),

                // 2. Local threshold based (keep these for UI responsiveness)
                ...dataArr.filter(p => {
                    const val = p.value || 0;
                    const name = (p.name || "").toLowerCase();
                    if (name.includes('gerilim') || name.includes('voltage')) {
                        return (val > 255 || (val > 10 && val < 170)); // Adjusted range
                    }
                    if (name.includes('akım') || name.includes('current')) {
                        return val > 2000; // Adjusted for CT ratios if they are not normalized
                    }
                    return false;
                }).map(p => ({
                    id: `limit-${p.pointId}`,
                    severity: 'warning',
                    type: 'EŞİK',
                    message: `${p.name} limit dışı: ${p.value?.toFixed(1)} ${p.unit}`,
                    time: new Date().toLocaleTimeString(),
                    area: 'LİMİT'
                }))
            ]
        };
    }, [liveData, historyData, isHistoricalMode, status, persistentAlarms]);

    const titleMap: Record<string, string> = { 
        dashboard: 'GENEL BAKIŞ',
        alarms: 'ALARMLAR',
        voltage: 'GERİLİM', 
        current: 'AKIM', 
        power: 'GÜÇ', 
        energy: 'ENERJİ', 
        quality: 'KALİTE', 
        system: 'SİSTEM' 
    };

    return (
        <div className="h-screen w-full bg-[#f8f9fb] flex flex-col font-sans overflow-hidden text-[#131722] selection:bg-blue-100">
            {/* Main Layout Row */}
            <div className="flex-1 flex flex-col min-h-0 bg-white">
                {/* Header Row */}
                <TradingViewHeader 
                    plants={plants}
                    devices={devices}
                    selectedPlantId={selectedPlantId}
                    selectedDeviceId={selectedDeviceId}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isHistoricalMode={isHistoricalMode}
                    setHistoricalMode={setIsHistoricalMode}
                    titleMap={titleMap}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                {/* Sub-body (Sidebar + Toolbelt + Content) */}
                <div className="flex-1 flex overflow-hidden">
                    <TerminalToolbelt activeTab={activeTab} setActiveTab={setActiveTab} />
                    <main className="flex-1 overflow-auto bg-[#f8fafc] p-2 relative">
                        <div className="max-w-[1800px] mx-auto h-full flex flex-col gap-2">
                            <div className="flex items-center justify-between shrink-0 px-2 py-0">
                                <h1 className="text-xl font-black tracking-tighter uppercase text-[#131722]">{titleMap[activeTab]}</h1>
                            </div>

                            <div className="flex-1 min-h-0">
                                 <TradingViewContentGrid 
                                    tab={activeTab} 
                                    data={dashboardState} 
                                    range={range}
                                    setRange={setRange}
                                 />
                            </div>
                        </div>
                    </main>

                    <AnimatePresence>
                        {sidebarOpen && (
                            <SidebarInfo 
                                key="sidebar-info-panel"
                                isOpen={sidebarOpen} 
                                setOpen={setSidebarOpen} 
                                livePoints={dashboardState.allRaw} 
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style jsx global>{`
                ::selection { background: rgba(41, 98, 255, 0.15); color: #2962ff; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

function TradingViewContentGrid({ tab, data, range, setRange }: { tab: string, data: DashboardState, range: string, setRange: (r: string) => void }) {
    const gridStyle = "grid grid-cols-1 gap-4 xl:grid-cols-2 h-auto pr-2 custom-scroll";
    return (
        <div className="h-auto space-y-8 pb-10">
            {tab === 'alarms' && (
                <div className="flex flex-col gap-4">
                    <div className="bg-white border border-[#dfe2e7] rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#f0f3fa] flex items-center justify-between bg-[#fcfcfd]">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#131722]">Aktif Alarmlar ({data.activeAlarms.length})</h3>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-[9px] font-black py-1 px-2 bg-red-50 text-[#f23645] rounded-full uppercase">Kritik</span>
                                <span className="flex items-center gap-1.5 text-[9px] font-black py-1 px-2 bg-amber-50 text-[#f0a500] rounded-full uppercase">Uyarı</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f8f9fb] text-[#787b86] text-[9px] font-black uppercase tracking-widest border-b border-[#dfe2e7]">
                                    <tr>
                                        <th className="px-4 py-2.5">DURUM</th>
                                        <th className="px-4 py-2.5">ZAMAN</th>
                                        <th className="px-4 py-2.5">ALAN</th>
                                        <th className="px-4 py-2.5">MESAJ</th>
                                        <th className="px-4 py-2.5 text-right">TİP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f3fa]">
                                    {data.activeAlarms.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                     <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                     </div>
                                                     <span className="text-[10px] font-black uppercase tracking-tighter">Sistem Normal - Aktif Alarm Yok</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.activeAlarms.map((alarm, idx) => (
                                            <tr key={alarm.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${alarm.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`} />
                                                </td>
                                                <td className="px-4 py-3 text-[10px] font-bold text-[#787b86] tabular-nums whitespace-nowrap">{alarm.time}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-[#131722] uppercase">{alarm.area}</span>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] font-black text-[#131722]">{alarm.message}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${alarm.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{alarm.type}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {tab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Voltage Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1 h-4 bg-[#2962ff] rounded-full" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-[#787b86]">Gerilim Analizi (V)</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2 custom-scroll">
                            {data.voltage.ln.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'V'} history={p.history} color="#2962ff" />)}
                            {data.voltage.ll.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'V'} history={p.history} color="#2962ff" />)}
                        </div>
                    </div>

                    {/* Current Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1 h-4 bg-[#089981] rounded-full" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-[#787b86]">Akım Takibi (A)</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2 custom-scroll">
                            {data.current.l.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'A'} history={p.history} color="#089981" />)}
                        </div>
                    </div>

                    {/* Power Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1 h-4 bg-[#fb8c00] rounded-full" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-[#787b86]">Güç ve Enerji</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2 custom-scroll">
                            {data.power.active.slice(0, 3).map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'kW'} history={p.history} color="#fb8c00" />)}
                            {data.energy.active.slice(0, 1).map((p) => <AppleSparkCard key={p.pointId} title="TOPLAM ENERJİ" value={p.value} unit={p.unit || 'kWh'} history={p.history} color="#2962ff" />)}
                            {data.system.metrics.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || ''} history={p.history} color="#787b86" />)}
                        </div>
                    </div>
                </div>
            )}
            {tab === 'voltage' && (
                <div className={gridStyle}>
                    <TerminalCard title="FAZ-NÖTR GERİLİM ANALİZİ" points={data.voltage.ln} unit="V" range={range} setRange={setRange} />
                    <TerminalCard title="FAZ-FAZ GERİLİM ANALİZİ" points={data.voltage.ll} unit="V" range={range} setRange={setRange} />
                </div>
            )}
            {tab === 'current' && <div className={gridStyle}><TerminalCard title="AKIM ŞİDDETİ TAKİBİ" points={data.current.l} unit="A" range={range} setRange={setRange} /></div>}
            {tab === 'power' && (
                <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2 custom-scroll">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <TerminalCard title="AKTİF GÜÇ ANALİTİĞİ" points={data.power.active} unit="kW" category="area" range={range} setRange={setRange} />
                        <TerminalCard title="GÖRÜNÜR GÜÇ DİNAMİĞİ" points={data.power.apparent} unit="kVA" range={range} setRange={setRange} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                         <TerminalCard title="REAKTİF GÜÇ ANALİZİ" points={data.power.reactive} unit="kVAr" range={range} setRange={setRange} />
                         <TerminalCard title="SİSTEM TOPLAMLARI" points={data.power.totals} unit="units" category="bar" range={range} setRange={setRange} />
                    </div>
                </div>
            )}
            {tab === 'energy' && (
                <div className={gridStyle}>
                    <TerminalCard title="AKTİF ENERJİ SAYACI" points={data.energy.active} unit="kWh" category="area" range={range} setRange={setRange} />
                    <TerminalCard title="REAKTİF ENERJİ SAYACI" points={data.energy.reactive} unit="kVArh" category="area" range={range} setRange={setRange} />
                </div>
            )}
            {tab === 'quality' && (
                <div className={gridStyle}>
                    <TerminalCard title="GERİLİM HARMONİKLERİ (THD)" points={data.quality.thd_v} unit="%" category="bar" range={range} setRange={setRange} />
                    <TerminalCard title="AKIM HARMONİKLERİ (THD)" points={data.quality.thd_i} unit="%" category="bar" range={range} setRange={setRange} />
                </div>
            )}
            {tab === 'system' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scroll">
                    {data.system.metrics.map((p, i) => (
                        <div key={i} className="bg-white border border-[#dfe2e7] rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-[#2962ff33] transition-all duration-500 group">
                            <span className="text-[10px] font-black text-[#787b86] uppercase tracking-[0.2em] mb-4 block">{p.name}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter tabular-nums text-[#131722] group-hover:text-[#2962ff] transition-colors">{p.value?.toFixed(3)}</span>
                                <span className="text-[10px] font-black text-[#2962ff] uppercase ml-1">{p.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style jsx>{`
                .custom-scroll::-webkit-scrollbar { width: 3px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #dfe2e7; border-radius: 10px; }
            `}</style>
        </div>
    );
}
