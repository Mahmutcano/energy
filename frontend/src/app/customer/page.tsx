"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { AnimatePresence, motion } from 'framer-motion';

// Separate Components
import TickerBar from '@/components/customer/TickerBar';
import TradingViewHeader from '@/components/customer/TradingViewHeader';
import SidebarInfo from '@/components/customer/SidebarInfo';
import TerminalToolbelt from '@/components/customer/TerminalToolbelt';
import TerminalCard from '@/components/customer/TerminalCard';
import AppleSparkCard from '@/components/customer/AppleSparkCard';
import MobileBottomNav from '@/components/customer/MobileBottomNav';
import { Menu, Bell, User, Activity, Shield, Zap, Database, Terminal, Clock, RefreshCw, LayoutGrid, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

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
    const { user, logout } = useAuth();
    const searchParams = useSearchParams();
    const activeTab = (searchParams?.get('cat') || 'dashboard').toLowerCase(); 
    
    const [status, setStatus] = useState<string>("BAĞLANIYOR");
    const [liveData, setLiveData] = useState<Record<string, TelemetryPoint>>({});
    const [historyData, setHistoryData] = useState<Record<string, TelemetryPoint>>({});
    const [isHistoricalMode, setIsHistoricalMode] = useState(false);
    const [range, setRange] = useState('1g');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
            } catch (err) { console.error("Tesis getirme hatası:", err); }
        };

        const fetchAlarms = async () => {
            try {
                const res = await apiRequest('/api/alarms');
                if (res.ok) {
                    const data = await res.json();
                    setPersistentAlarms(data);
                }
            } catch (err) { console.error("Alarm getirme hatası:", err); }
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
            } catch (err) { console.error("Cihaz getirme hatası:", err); }
        };
        fetchDevices();
    }, [selectedPlantId]);

    const setupSocket = (pId: string) => {
        socket.emit('join:protocol', { protocolId: pId });
        socket.on('protocol:status', (data: any) => {
            if (data.status) {
                const statusMap: Record<string, string> = {
                    'CONNECTED': 'BAĞLI',
                    'DISCONNECTED': 'BAĞLANTI KESİLDİ',
                    'ERROR': 'HATA',
                    'CONNECTING': 'BAĞLANIYOR'
                };
                setStatus(statusMap[data.status] || data.status);
            }
        });
        const handleUpdate = (data: any) => {
            if (historicalModeRef.current) return;
            setLiveData(prev => {
                const pointId = data.pointId;
                if (!pointId || !prev[pointId]) return prev;
                const history = prev[pointId]?.history ?? [];
                const t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
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
                                                return { t: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: hp.value };
                                            }

                                            const now = new Date();
                                            const isToday = dateObj.toDateString() === now.toDateString();
                                            const timeStr = isToday 
                                                ? dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                                : dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
                                } catch (e) { console.warn("Geçmiş veri yüklenemedi:", p.id); }
                            }));

                            setHistoryData({});
                            setIsHistoricalMode(false);
                        }
                    }
                }
            } catch (err) { console.error("Cihaz başlatma hatası:", err); }
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
                                    return { t: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), value: hp.value };
                                }

                                const now = new Date();
                                const isToday = dateObj.toDateString() === now.toDateString();
                                const timeStr = isToday 
                                    ? dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                    : dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                                return { t: timeStr, value: hp.value };
                            }).reverse(),
                            value: historyPoints[0]?.value ?? null
                        };
                    }
                } catch (err) { console.error("Geçmiş veri hatası:", err); }
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
            m.forEach(mark => {
                const found = dataArr.find(item => {
                    if (!testMatch(item, s, t)) return false;
                    const combined = `${item.name} ${item.signalDescription} ${item.measurementType}`.toLowerCase();
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
                ...persistentAlarms
                    .filter(a => a.status === 'ACTIVE')
                    .map(a => ({
                        id: a.id,
                        severity: 'critical',
                        type: 'SİSTEM',
                        message: a.message,
                        time: new Date(a.startTime).toLocaleTimeString('tr-TR'),
                        area: 'HABERLEŞME'
                    })),
                ...dataArr.filter(p => {
                    const val = p.value || 0;
                    const name = (p.name || "").toLowerCase();
                    if (name.includes('gerilim') || name.includes('voltage')) {
                        return (val > 255 || (val > 10 && val < 170));
                    }
                    if (name.includes('akım') || name.includes('current')) {
                        return val > 2000;
                    }
                    return false;
                }).map(p => ({
                    id: `limit-${p.pointId}`,
                    severity: 'warning',
                    type: 'EŞİK',
                    message: `${p.name} limit dışı: ${p.value?.toFixed(1)} ${p.unit}`,
                    time: new Date().toLocaleTimeString('tr-TR'),
                    area: 'LİMİT'
                }))
            ]
        };
    }, [liveData, historyData, isHistoricalMode, status, persistentAlarms]);

    const titleMap: Record<string, string> = { 
        dashboard: 'SİSTEM ÖZETİ',
        alarms: 'OLAY KAYITLARI',
        voltage: 'GERİLİM MATRİSİ', 
        current: 'AKIM TELEMETRİSİ', 
        power: 'GÜÇ DİNAMİKLERİ', 
        energy: 'ENERJİ DENETİMİ', 
        quality: 'SPEKTRAL ANALİZ', 
        system: 'SİSTEM TANILAMA' 
    };

    return (
        <div className="h-screen w-full bg-grafana-bg flex flex-col font-sans overflow-hidden text-grafana-text-primary antialiased selection:bg-grafana-accent-blue/20">
            {/* Mobil Header */}
            <div className="lg:hidden h-20 bg-grafana-panel/50 border-b border-grafana-border flex items-center justify-between px-6 sticky top-0 z-[1000] backdrop-blur-md">
                <div className="flex-1 flex flex-col min-w-0">
                    <button className="flex flex-col items-start">
                        <div className="text-[14px] font-bold tracking-tight text-white truncate w-full text-left uppercase font-mono">
                            {plants.find(p => p.id === selectedPlantId)?.plantName || 'TESİS SEÇİLMEDİ'}
                        </div>
                        <div className="text-[10px] font-bold text-grafana-accent-blue truncate w-full text-left uppercase font-mono tracking-widest">
                            {devices.find(d => d.id === selectedDeviceId)?.deviceName || 'CİHAZ AKTİF DEĞİL'}
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button className="w-10 h-10 flex items-center justify-center text-grafana-text-secondary bg-grafana-bg border border-grafana-border rounded-sm relative">
                        <Bell size={18} />
                        {dashboardState.activeAlarms.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-grafana-accent-red rounded-full animate-pulse shadow-[0_0_8px_rgba(242,73,92,0.6)]" />
                        )}
                    </button>
                    <button 
                        onClick={logout}
                        className="w-10 h-10 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 flex items-center justify-center text-grafana-accent-red"
                    >
                        <LogOut size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-sm bg-grafana-accent-blue border border-grafana-accent-blue/20 flex items-center justify-center text-[11px] font-bold text-white uppercase font-mono">
                        {user?.name?.substring(0, 1).toUpperCase() || 'U'}
                    </div>
                </div>
            </div>

            {/* Masaüstü Entegrasyonu */}
            <div className="flex-1 flex flex-col min-h-0 bg-grafana-bg">
                <div className="hidden lg:block border-b border-grafana-border bg-grafana-panel/30">
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
                        logout={logout}
                    />
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="hidden lg:block border-r border-grafana-border bg-grafana-panel/20">
                        <TerminalToolbelt activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>
                    
                    <main className="flex-1 overflow-auto bg-grafana-bg p-4 lg:p-6 relative pb-28 lg:pb-6 custom-scroll">
                        <div className="max-w-[1920px] mx-auto h-full flex flex-col gap-6">
                            
                            {/* Teknik Karşılama */}
                            <div className="hidden xl:flex items-center justify-between bg-grafana-panel/40 border border-grafana-border p-6 rounded-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-grafana-accent-blue/5 blur-[100px] -mr-32 -mt-32 rounded-full transition-all group-hover:bg-grafana-accent-blue/10" />
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="p-4 bg-grafana-bg border border-grafana-border rounded-sm shadow-inner text-grafana-accent-blue">
                                        <Shield size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.3em] font-mono">Operatör Kimliği Doğrulandı</p>
                                        <h2 className="text-3xl font-black tracking-tighter text-white uppercase font-mono">{user?.fullName || user?.name || 'KÖK OPERATÖR'}</h2>
                                        <div className="flex items-center gap-4 pt-1">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-grafana-accent-green uppercase tracking-widest font-mono">
                                                <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green animate-pulse" />
                                                Bütünlük Kararlı
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">
                                                <Clock size={12} />
                                                Son Tarama: {new Date().toLocaleTimeString('tr-TR')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="flex flex-col items-end px-6 border-r border-grafana-border/50">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Bağlantı Durumu</span>
                                        <span className="text-sm font-bold text-grafana-accent-green uppercase font-mono">MÜKEMMEL</span>
                                    </div>
                                    <div className="flex flex-col items-end px-6">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Aktif İhlaller</span>
                                        <span className={cn("text-sm font-bold uppercase font-mono", dashboardState.activeAlarms.length > 0 ? "text-grafana-accent-red" : "text-grafana-text-primary")}>
                                            {dashboardState.activeAlarms.length} OLAY
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between shrink-0 px-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-grafana-accent-blue rounded-full" />
                                    <h1 className="text-xl font-bold tracking-tight uppercase text-white font-mono">{titleMap[activeTab]}</h1>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setIsRefreshing(true)} 
                                        className="p-2 text-grafana-text-secondary hover:text-white transition-colors"
                                    >
                                        <RefreshCw size={16} className={cn(isRefreshing && "animate-spin text-grafana-accent-blue")} />
                                    </button>
                                    <LayoutGrid size={16} className="text-grafana-text-secondary cursor-pointer hover:text-white transition-colors" />
                                </div>
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

                    <div className="hidden lg:block border-l border-grafana-border bg-grafana-panel/30">
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
            </div>

            <MobileBottomNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                alarmCount={dashboardState.activeAlarms.length} 
            />

            <style jsx global>{`
                .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scroll::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #333333; }
            `}</style>
        </div>
    );
}

function TradingViewContentGrid({ tab, data, range, setRange }: { tab: string, data: DashboardState, range: string, setRange: (r: string) => void }) {
    return (
        <div className="h-full space-y-10 pb-20">
            {tab === 'alarms' && (
                <div className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 border-b border-grafana-border flex items-center justify-between bg-grafana-bg/50">
                        <div className="flex items-center gap-3">
                            <Terminal size={14} className="text-grafana-accent-red" />
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white font-mono">Olay Kayıtları ({data.activeAlarms.length})</h3>
                        </div>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-2 text-[9px] font-bold py-1 px-3 bg-grafana-accent-red/10 border border-grafana-accent-red/30 text-grafana-accent-red rounded-sm uppercase font-mono tracking-widest">Kritik Yük</span>
                            <span className="flex items-center gap-2 text-[9px] font-bold py-1 px-3 bg-grafana-accent-orange/10 border border-grafana-accent-orange/30 text-grafana-accent-orange rounded-sm uppercase font-mono tracking-widest">Uyarı Sinyali</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="scada-table">
                            <thead>
                                <tr>
                                    <th>CİDDİYET</th>
                                    <th>ZAMAN DAMGASI</th>
                                    <th>ALAN</th>
                                    <th>OLAY TELEMETRİSİ</th>
                                    <th className="text-right">TİP KODU</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.activeAlarms.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                 <Shield size={48} />
                                                 <span className="text-[12px] font-bold uppercase tracking-[0.5em] font-mono">TÜM SİSTEMLER NORMAL</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.activeAlarms.map((alarm) => (
                                        <tr key={alarm.id} className="group border-b border-grafana-border/30 hover:bg-grafana-accent-red/[0.02] transition-colors">
                                            <td>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    alarm.severity === 'critical' ? "bg-grafana-accent-red animate-pulse shadow-[0_0_8px_rgba(242,73,92,0.4)]" : "bg-grafana-accent-orange"
                                                )} />
                                            </td>
                                            <td className="text-[10px] font-bold text-grafana-text-secondary tabular-nums font-mono">{alarm.time}</td>
                                            <td>
                                                <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-sm bg-grafana-bg border border-grafana-border uppercase font-mono tracking-tighter">{alarm.area}</span>
                                            </td>
                                            <td className="text-[11px] font-bold text-grafana-text-primary uppercase font-mono group-hover:text-white transition-colors">{alarm.message}</td>
                                            <td className="text-right">
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-widest font-mono",
                                                    alarm.severity === 'critical' ? "text-grafana-accent-red" : "text-grafana-accent-orange"
                                                )}>{alarm.type}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {tab === 'dashboard' && (
                <div className="space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <Activity size={16} className="text-grafana-accent-blue" />
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-grafana-text-secondary font-mono">Gerilim Matrisi (V)</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2">
                            {data.voltage.ln.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'V'} history={p.history} color="#5794f2" />)}
                            {data.voltage.ll.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'V'} history={p.history} color="#5794f2" />)}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <Zap size={16} className="text-grafana-accent-green" />
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-grafana-text-secondary font-mono">Akım Telemetrisi (A)</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2">
                            {data.current.l.map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'A'} history={p.history} color="#73bf69" />)}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <Database size={16} className="text-grafana-accent-orange" />
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-grafana-text-secondary font-mono">Yük Dinamikleri ve Denetim</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2">
                            {data.power.active.slice(0, 3).map((p) => <AppleSparkCard key={p.pointId} title={p.name || ''} value={p.value} unit={p.unit || 'kW'} history={p.history} color="#ff9830" />)}
                            {data.energy.active.slice(0, 1).map((p) => <AppleSparkCard key={p.pointId} title="TOPLAM BİRİKİM" value={p.value} unit={p.unit || 'kWh'} history={p.history} color="#5794f2" />)}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'voltage' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <TerminalCard title="FAZ-NÖTR GERİLİM POTANSİYELİ" points={data.voltage.ln} unit="V" range={range} setRange={setRange} />
                    <TerminalCard title="FAZ-FAZ GERİLİM POTANSİYELİ" points={data.voltage.ll} unit="V" range={range} setRange={setRange} />
                </div>
            )}

            {tab === 'current' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <TerminalCard title="AMPERAJ AKIŞ VEKTÖRLERİ" points={data.current.l} unit="A" range={range} setRange={setRange} />
                </div>
            )}

            {tab === 'power' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <TerminalCard title="AKTİF YÜK ANALİTİĞİ" points={data.power.active} unit="kW" category="area" range={range} setRange={setRange} />
                        <TerminalCard title="GÖRÜNÜR YÜK DİNAMİKLERİ" points={data.power.apparent} unit="kVA" range={range} setRange={setRange} />
                    </div>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                         <TerminalCard title="REAKTİF FAZ VEKTÖRLERİ" points={data.power.reactive} unit="kVAr" range={range} setRange={setRange} />
                         <TerminalCard title="SİSTEM TOPLAMLARI AGREGASYONU" points={data.power.totals} unit="birim" category="bar" range={range} setRange={setRange} />
                    </div>
                </div>
            )}

            {tab === 'energy' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <TerminalCard title="AKTİF BİRİKİM DENETİMİ" points={data.energy.active} unit="kWh" category="area" range={range} setRange={setRange} />
                    <TerminalCard title="REAKTİF BİRİKİM DENETİMİ" points={data.energy.reactive} unit="kVArh" category="area" range={range} setRange={setRange} />
                </div>
            )}

            {tab === 'quality' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <TerminalCard title="GERİLİM SPEKTRAL BOZULMA" points={data.quality.thd_v} unit="%" category="bar" range={range} setRange={setRange} />
                    <TerminalCard title="AKIM SPEKTRAL BOZULMA" points={data.quality.thd_i} unit="%" category="bar" range={range} setRange={setRange} />
                </div>
            )}

            {tab === 'system' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2">
                    {data.system.metrics.map((p, i) => (
                        <div key={i} className="bg-grafana-panel/40 border border-grafana-border rounded-sm p-6 shadow-2xl hover:border-grafana-accent-blue/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                                <Terminal size={32} />
                            </div>
                            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.3em] mb-6 block font-mono">{p.name}</span>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-black tracking-tighter tabular-nums text-white group-hover:text-grafana-accent-blue transition-colors font-mono">{p.value?.toFixed(3)}</span>
                                <span className="text-[11px] font-bold text-grafana-accent-blue uppercase font-mono tracking-widest">{p.unit}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-grafana-border/30 flex justify-between items-center">
                                <span className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">Durum: Kilitli</span>
                                <span className="text-[9px] font-bold text-grafana-accent-green uppercase font-mono">Mükemmel</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
