"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Cpu, Power, Database, Layers,
    RefreshCw, Search, Zap, Settings, Trash2, Shield,
    Server, Clock, HardDrive, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

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

interface RecordingSettings {
    sampleIntervalSec: number;
    retentionHours: number;
    isRecording: boolean;
    maxRecordsTotal: number;
    db: {
        tableSize: string;
        totalRecords: number;
    };
}

interface SchemaStat {
    id: string;
    name: string;
    count: number;
    icon: string;
    color: string;
    relations: string[];
}

export default function SystemControl() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [health, setHealth] = useState<HealthData | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [recSettings, setRecSettings] = useState<RecordingSettings | null>(null);
    const [stats, setStats] = useState({ total: 0, active: 0, passive: 0, totalMeasurements: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                const deviceList: Device[] = Array.isArray(data) ? data : [];
                setDevices(deviceList);
                const active = deviceList.filter((d: Device) => d.isActive).length;
                setStats(prev => ({ ...prev, total: deviceList.length, active, passive: deviceList.length - active }));
            }
            const statRes = await apiRequest('/api/system/schema-stats');
            if (statRes.ok) {
                const result = await statRes.json();
                const schema = (result && result.success) ? (result.data as SchemaStat[]) : (result as SchemaStat[]);
                if (Array.isArray(schema)) {
                    const telStat = schema.find((s) => s.id === 'TelemetryValue');
                    if (telStat) setStats(prev => ({ ...prev, totalMeasurements: telStat.count }));
                }
            }
        } catch { toast.error("Veriler yüklenemedi"); }
        finally { setLoading(false); }
    };

    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await apiRequest('/api/system/health-check');
            if (res.ok) {
                const result = await res.json();
                setHealth((result && result.success) ? result.data : result);
            }
        } catch { }
        finally { setHealthLoading(false); }
    }, []);

    const fetchRecSettings = useCallback(async () => {
        try {
            const res = await apiRequest('/api/system/recording-settings');
            if (res.ok) {
                const result = await res.json();
                setRecSettings((result && result.success) ? result.data : result);
            }
        } catch { }
    }, []);

    const updateRecSetting = async (key: keyof RecordingSettings, value: any) => {
        try {
            const res = await apiRequest('/api/system/recording-settings', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                const settings = data.settings || data;
                setRecSettings((p) => p ? ({ ...p, ...settings }) : null);
                toast.success('Ayarlar güncellendi');
            }
        } catch { toast.error('Güncellenemedi'); }
    };

    const runRetention = async () => {
        if (!window.confirm('Veri temizleme (retention) işlemi başlatılsın mı? Bu işlem geri alınamaz.')) return;
        const t = toast.loading('Veriler temizleniyor...');
        try {
            const res = await apiRequest('/api/system/run-retention', { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                const deletedCount = data?.deleted || data?.count || 0;
                toast.success(`${deletedCount} kayıt başarıyla temizlendi`, { id: t });
                fetchRecSettings();
            }
        } catch { toast.error('İşlem başarısız', { id: t }); }
    };

    useEffect(() => {
        fetchData(); fetchHealth(); fetchRecSettings();
        const d = setInterval(fetchData, 30000);
        const h = setInterval(fetchHealth, 10000);
        return () => { clearInterval(d); clearInterval(h); };
    }, [fetchHealth, fetchRecSettings]);

    const toggleDeviceField = async (device: Device, field: 'isActive' | 'isRecording') => {
        const next = !device[field];
        const label = field === 'isActive' ? 'İletişim' : 'Kayıt';
        const t = toast.loading(`${label} durumu güncelleniyor...`);
        try {
            const res = await apiRequest(`/api/devices/${device.id}`, { method: 'PATCH', body: JSON.stringify({ [field]: next }) });
            if (res.ok) {
                toast.success(`${device.deviceName} ${label} ${next ? 'AÇIK' : 'KAPALI'}`, { id: t });
                setDevices(p => p.map(d => d.id === device.id ? { ...d, [field]: next } : d));
                if (field === 'isActive') {
                    setStats(p => ({ ...p, active: next ? p.active + 1 : p.active - 1, passive: next ? p.passive - 1 : p.passive + 1 }));
                }
            } else toast.error("İşlem başarısız", { id: t });
        } catch { toast.error("Hata oluştu", { id: t }); }
    };

    const bulkAction = async (action: 'START' | 'STOP') => {
        if (!window.confirm(`Tüm cihazlar ${action === 'START' ? 'başlatılsın' : 'durdurulsun'} mı?`)) return;
        const t = toast.loading(`İşlem gerçekleştiriliyor...`);
        try {
            const targets = devices.filter(d => action === 'START' ? !d.isActive : d.isActive);
            for (const d of targets) await apiRequest(`/api/devices/${d.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: action === 'START' }) });
            toast.success("Tüm cihazlar güncellendi", { id: t }); fetchData();
        } catch { toast.error("Hata oluştu", { id: t }); }
    };

    const filtered = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.configName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol.plant.plantName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 animate-in-fade">
            <PageHeader 
                title="SİSTEM" 
                highlightedTitle="DENETİMİ"
                subtitle="Çekirdek servis sağlığı ve veri hattı yönetimi"
                icon={Layers}
            >
                <button 
                    onClick={() => bulkAction('STOP')}
                    className="group flex items-center gap-2 px-4 py-2 bg-grafana-accent-red/5 border border-grafana-accent-red/20 text-grafana-accent-red rounded-sm text-[11px] font-bold hover:bg-grafana-accent-red hover:text-white transition-all uppercase tracking-widest font-mono"
                >
                    <Power size={14} className="group-hover:scale-110 transition-transform" />
                    Tümünü Durdur
                </button>
                <button 
                    onClick={() => bulkAction('START')}
                    className="group flex items-center gap-2 px-4 py-2 bg-grafana-accent-green/5 border border-grafana-accent-green/20 text-grafana-accent-green rounded-sm text-[11px] font-bold hover:bg-grafana-accent-green hover:text-white transition-all uppercase tracking-widest font-mono"
                >
                    <Zap size={14} className="group-hover:scale-110 transition-transform" />
                    Tümünü Başlat
                </button>
            </PageHeader>

            {/* Performans Metrikleri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'TOPLAM DÜĞÜM', val: stats.total, icon: Cpu, color: 'text-grafana-accent-blue', bg: 'bg-grafana-accent-blue/5' },
                    { label: 'AKTİF İLETİŞİM', val: stats.active, icon: Activity, color: 'text-grafana-accent-green', bg: 'bg-grafana-accent-green/5' },
                    { label: 'PASİF / HATA', val: stats.passive, icon: AlertTriangle, color: stats.passive > 0 ? 'text-grafana-accent-orange' : 'text-grafana-text-secondary', bg: 'bg-white/5' },
                    { label: 'TOPLAM VERİ SETİ', val: (stats.totalMeasurements / 1000).toFixed(1) + 'K', icon: Database, color: 'text-grafana-accent-orange', bg: 'bg-grafana-accent-orange/5' },
                ].map((s, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={s.label} 
                        className="bg-grafana-panel/40 border border-grafana-border p-5 rounded-sm flex items-center gap-5 group hover:border-grafana-text-secondary/30 transition-all"
                    >
                        <div className={cn("p-3 rounded-sm border border-white/10 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all", s.bg, s.color)}>
                            <s.icon size={20} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-tech-label">{s.label}</p>
                            <p className="text-2xl font-bold text-grafana-text-primary tabular-nums font-mono">{s.val}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol Taraf: Cihaz İletişim Tablosu */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-grafana-panel/30 border border-grafana-border rounded-sm overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-grafana-border bg-grafana-bg/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <Server size={14} className="text-grafana-accent-blue" />
                                <h3 className="text-tech-label text-grafana-text-primary">İLETİŞİM KATMANI DURUMU</h3>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-grafana-text-secondary" />
                                <input 
                                    type="text" 
                                    placeholder="CİHAZ VEYA PROTOKOL ARA..." 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-grafana-bg border border-grafana-border rounded-sm py-2 pl-9 pr-4 text-[11px] font-bold text-white placeholder:text-grafana-text-secondary/50 outline-none focus:border-grafana-accent-blue/50 transition-all font-mono" 
                                />
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="scada-table">
                                <thead>
                                    <tr>
                                        <th>CİHAZ VARLIĞI</th>
                                        <th>BAĞLANTI YAPISI</th>
                                        <th className="text-center">OPERASYONEL DURUM</th>
                                        <th className="text-right">KONTROL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode='popLayout'>
                                        {filtered.map((device) => (
                                            <motion.tr 
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                key={device.id} 
                                                className="group hover:bg-white/[0.02] transition-all"
                                            >
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-sm flex items-center justify-center border transition-all",
                                                            device.isActive 
                                                                ? "bg-grafana-accent-green/10 border-grafana-accent-green/30 text-grafana-accent-green shadow-[0_0_10px_rgba(115,191,105,0.1)]" 
                                                                : "bg-grafana-bg border-grafana-border text-grafana-text-secondary"
                                                        )}>
                                                            <Cpu size={14} className={device.isActive ? "animate-pulse" : ""} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-grafana-text-primary uppercase group-hover:text-white transition-colors">{device.deviceName}</span>
                                                            <span className="text-[9px] text-grafana-text-secondary font-mono tracking-tighter">UID: {device.id.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-grafana-accent-blue/80 uppercase">{device.protocol.plant.plantName}</span>
                                                        <span className="text-[9px] text-grafana-text-secondary font-mono uppercase tracking-tighter">
                                                            {device.protocol.protocolType} <span className="opacity-30 px-1">|</span> {device.protocol.configName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-widest font-mono border flex items-center gap-1.5",
                                                            device.isActive 
                                                                ? "bg-grafana-accent-green/10 text-grafana-accent-green border-grafana-accent-green/20" 
                                                                : "bg-grafana-bg text-grafana-text-secondary border-grafana-border"
                                                        )}>
                                                            <div className={cn("w-1 h-1 rounded-full", device.isActive ? "bg-grafana-accent-green animate-pulse" : "bg-grafana-text-secondary")}></div>
                                                            {device.isActive ? 'AKTİF' : 'KAPALI'}
                                                        </div>
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-widest font-mono border flex items-center gap-1.5",
                                                            device.isRecording 
                                                                ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border-grafana-accent-blue/20" 
                                                                : "bg-grafana-bg text-grafana-text-secondary border-grafana-border"
                                                        )}>
                                                            <div className={cn("w-1 h-1 rounded-full", device.isRecording ? "bg-grafana-accent-blue animate-pulse" : "bg-grafana-text-secondary")}></div>
                                                            {device.isRecording ? 'KAYIT' : 'İZLEME'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => toggleDeviceField(device, 'isActive')}
                                                            title={device.isActive ? 'İletişimi Kapat' : 'İletişimi Aç'}
                                                            className={cn(
                                                                "p-1.5 rounded-sm border transition-all",
                                                                device.isActive ? "bg-grafana-accent-green/20 border-grafana-accent-green/40 text-grafana-accent-green" : "bg-grafana-bg border-grafana-border text-grafana-text-secondary hover:border-grafana-text-secondary/50"
                                                            )}
                                                        >
                                                            <Zap size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => toggleDeviceField(device, 'isRecording')}
                                                            title={device.isRecording ? 'Kaydı Durdur' : 'Kaydı Başlat'}
                                                            className={cn(
                                                                "p-1.5 rounded-sm border transition-all",
                                                                device.isRecording ? "bg-grafana-accent-blue/20 border-grafana-accent-blue/40 text-grafana-accent-blue" : "bg-grafana-bg border-grafana-border text-grafana-text-secondary hover:border-grafana-text-secondary/50"
                                                            )}
                                                        >
                                                            <HardDrive size={14} />
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
                            <div className="absolute inset-0 bg-grafana-bg/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                                <RefreshCw size={24} className="text-grafana-accent-blue animate-spin" />
                                <span className="text-tech-label text-grafana-accent-blue animate-pulse">SENKRONİZASYON</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Taraf: Sistem Sağlığı ve Kaynaklar */}
                <div className="space-y-6">
                    {/* Kritik Sistem Durumu */}
                    <div className={cn(
                        "bg-grafana-panel/30 border p-6 rounded-sm relative overflow-hidden group",
                        health?.status === 'OPERATIONAL' ? 'border-grafana-accent-green/20' : 'border-grafana-accent-red/20'
                    )}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-white/10 transition-all"></div>
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="space-y-1">
                                <p className="text-tech-label">SİSTEM SAĞLIĞI</p>
                                <div className="flex items-center gap-2">
                                    <h4 className={cn(
                                        "text-3xl font-black tracking-tighter italic",
                                        health?.status === 'OPERATIONAL' ? 'text-grafana-accent-green' : 'text-grafana-accent-red'
                                    )}>
                                        {health?.status === 'OPERATIONAL' ? 'SORUNSUZ' : 'KRİTİK'}
                                    </h4>
                                    {health?.status === 'OPERATIONAL' ? <CheckCircle2 size={24} className="text-grafana-accent-green" /> : <AlertTriangle size={24} className="text-grafana-accent-red" />}
                                </div>
                            </div>
                            <button onClick={fetchHealth} disabled={healthLoading} className="p-2.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/40 transition-all">
                                <RefreshCw size={14} className={healthLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono tracking-tighter">GECİKME MS</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-2xl font-bold text-grafana-accent-blue tabular-nums font-mono">{health?.checks.uptime.formatted?.split(' ')[0] || '--'}</span>
                                <p className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono tracking-tighter">ÇALIŞMA SÜRESİ</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-2xl font-bold text-grafana-accent-orange tabular-nums font-mono">{health?.checks.memory.heapUsed ?? '--'}</span>
                                <p className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono tracking-tighter">MB YIĞIN</p>
                            </div>
                        </div>
                    </div>

                    {/* Veri Depolama Servisleri */}
                    <div className="bg-grafana-panel/30 border border-grafana-border p-6 rounded-sm space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={14} className="text-grafana-accent-blue" />
                            <h3 className="text-tech-label text-grafana-text-primary">VERİ DEPOLAMA KATMANI</h3>
                        </div>
                        
                        <div className="space-y-3">
                            {[
                                { name: 'PostgreSQL', status: health?.checks.postgresql.status, icon: Database, color: 'green' },
                                { name: 'Redis Cache', status: health?.checks.redis.status, icon: Zap, color: 'blue' }
                            ].map(srv => (
                                <div key={srv.name} className="flex justify-between items-center bg-grafana-bg/40 p-3 rounded-sm border border-grafana-border/50 group hover:border-grafana-text-secondary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <srv.icon size={14} className="text-grafana-text-secondary group-hover:text-grafana-text-primary transition-colors" />
                                        <span className="text-[11px] font-bold text-grafana-text-secondary uppercase font-mono">{srv.name}</span>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase font-mono border",
                                        srv.status === 'HEALTHY' 
                                            ? "text-grafana-accent-green bg-grafana-accent-green/5 border-grafana-accent-green/20" 
                                            : "text-grafana-accent-red bg-grafana-accent-red/5 border-grafana-accent-red/20"
                                    )}>
                                        {srv.status || 'OFFLINE'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sistem Kaynak Kullanımı */}
                    <div className="bg-grafana-panel/30 border border-grafana-border p-6 rounded-sm space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings size={14} className="text-grafana-accent-orange" />
                            <h3 className="text-tech-label text-grafana-text-primary">KAYNAK TÜKETİMİ</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold font-mono">
                                    <span className="text-grafana-text-secondary">RAM KULLANIMI</span>
                                    <span className="text-white">{health?.checks.memory.heapUsed} / {health?.checks.memory.heapTotal} MB</span>
                                </div>
                                <div className="h-1.5 bg-grafana-bg rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${health ? Math.min((health.checks.memory.heapUsed / health.checks.memory.heapTotal) * 100, 100) : 0}%` }}
                                        className="h-full bg-grafana-accent-orange transition-all duration-1000 shadow-[0_0_10px_rgba(255,152,48,0.3)]"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-grafana-border/50">
                                <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-grafana-text-secondary" />
                                    <span className="text-[11px] font-bold text-grafana-text-secondary uppercase font-mono">İŞLEYİCİ MODU</span>
                                </div>
                                <span className="text-grafana-accent-green text-[11px] font-bold font-mono">{health?.checks.worker.status || 'AKTİF'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alt Panel: Veri Yönetişimi */}
            <div className="bg-grafana-panel/40 border border-grafana-border p-8 rounded-sm shadow-xl dot-bg overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-grafana-accent-orange/50 group-hover:bg-grafana-accent-orange transition-all"></div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-grafana-accent-orange/10 rounded-sm border border-grafana-accent-orange/20">
                            <Shield size={22} className="text-grafana-accent-orange" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-grafana-text-primary uppercase tracking-wider font-mono">VERİ YÖNETİŞİM PANELİ</h3>
                            <div className="flex items-center gap-4 text-tech-label">
                                <span className="flex items-center gap-1.5"><Database size={10} /> {recSettings?.db?.tableSize || '--'}</span>
                                <span className="opacity-20">|</span>
                                <span className="flex items-center gap-1.5"><Layers size={10} /> {recSettings?.db?.totalRecords?.toLocaleString() || '--'} Kayıt</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={runRetention} 
                        className="group flex items-center gap-2 px-6 py-3 bg-grafana-accent-red/5 border border-grafana-accent-red/20 text-grafana-accent-red rounded-sm text-[12px] font-bold hover:bg-grafana-accent-red hover:text-white transition-all uppercase tracking-widest font-mono"
                    >
                        <Trash2 size={16} className="group-hover:rotate-12 transition-transform" /> 
                        ARŞİVİ TEMİZLE
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: 'ÖRNEKLEME SIKLIĞI', key: 'sampleIntervalSec', options: [5, 10, 30, 60], suffix: 'SANİYE' },
                        { label: 'VERİ TUTMA SÜRESİ', key: 'retentionHours', options: [24, 72, 168, 720], suffix: 'SAAT' },
                        { label: 'MAKSİMUM KAPASİTE', key: 'maxRecordsTotal', options: [100000, 500000, 1000000], suffix: 'KAYIT' },
                    ].map(field => (
                        <div key={field.key} className="space-y-3">
                            <label className="text-tech-label block">{field.label}</label>
                            <select 
                                value={recSettings?.[field.key as keyof RecordingSettings] as number || field.options[0]} 
                                onChange={e => updateRecSetting(field.key as keyof RecordingSettings, Number(e.target.value))}
                                className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:ring-1 focus:ring-grafana-accent-blue/20 transition-all font-mono appearance-none cursor-pointer hover:border-grafana-text-secondary/50"
                            >
                                {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt.toLocaleString()} {field.suffix}</option>
                                ))}
                            </select>
                        </div>
                    ))}

                    <div className="flex flex-col justify-end">
                        <div className="flex items-center justify-between p-4 bg-grafana-bg/60 border border-grafana-border rounded-sm hover:border-grafana-accent-green/30 transition-all">
                            <div className="flex items-center gap-3">
                                <Activity size={16} className={cn("transition-colors", recSettings?.isRecording ? "text-grafana-accent-green" : "text-grafana-text-secondary")} />
                                <span className="text-[11px] font-bold text-white uppercase font-mono">GLOBAL KAYIT</span>
                            </div>
                            <button 
                                onClick={() => updateRecSetting('isRecording', !recSettings?.isRecording)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-all duration-300 flex items-center p-1 border shadow-inner",
                                    recSettings?.isRecording ? "bg-grafana-accent-green/20 border-grafana-accent-green/40" : "bg-grafana-panel border-grafana-border"
                                )}
                            >
                                <motion.div 
                                    animate={{ x: recSettings?.isRecording ? 24 : 0 }}
                                    className={cn(
                                        "w-4 h-4 rounded-full shadow-lg",
                                        recSettings?.isRecording ? "bg-grafana-accent-green" : "bg-grafana-text-secondary"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
