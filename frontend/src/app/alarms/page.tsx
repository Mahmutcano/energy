"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Clock, CheckCircle, Search, ShieldAlert, Cpu, WifiOff, Activity, AlertCircle, RefreshCw, Filter, ListFilter, Terminal, Database } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/PageHeader';

interface Device {
    id: string;
    deviceName: string;
}

interface CommunicationAlarm {
    id: string;
    deviceId: string;
    status: 'ACTIVE' | 'RESOLVED';
    startTime: string;
    endTime: string | null;
    lastSeenAt: string | null;
    message: string;
    device?: Device;
}

export default function AlarmsPage() {
    const [alarms, setAlarms] = useState<CommunicationAlarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAlarms = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await apiRequest('/api/alarms');
            if (res.ok) {
                const data = await res.json();
                setAlarms(data);
            }
        } catch (err) {
            console.error('Alarmlar çekilemedi:', err);
        } finally {
            setLoading(false);
            if (showRefresh) setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    useEffect(() => {
        fetchAlarms();
        const interval = setInterval(() => fetchAlarms(), 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredAlarms = alarms.filter(a => {
        if (filter === 'ACTIVE') return a.status === 'ACTIVE';
        if (filter === 'RESOLVED') return a.status === 'RESOLVED';
        return true;
    });

    const activeCount = alarms.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="space-y-8 pb-16 font-sans">
            <PageHeader 
                title="OLAY" 
                highlightedTitle="UFKU"
                subtitle="Bağlantı bütünlüğü izleyici ve sistem geneli alarm yönetimi"
                icon={ShieldAlert}
                iconColor={activeCount > 0 ? "text-grafana-accent-red" : "text-grafana-accent-green"}
                iconBgColor={activeCount > 0 ? "bg-grafana-accent-red/10" : "bg-grafana-accent-green/10"}
            >
                <button 
                    onClick={() => fetchAlarms(true)}
                    className="p-2.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                >
                    <RefreshCw size={14} className={cn(isRefreshing && "animate-spin text-grafana-accent-blue")} />
                </button>
                {activeCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-grafana-accent-red/10 border border-grafana-accent-red/30 rounded-sm">
                        <div className="w-2 h-2 rounded-full bg-grafana-accent-red animate-pulse shadow-[0_0_10px_rgba(242,73,92,0.6)]"></div>
                        <span className="text-[10px] font-bold text-grafana-accent-red tracking-widest uppercase font-mono">
                            {activeCount} ONAYLANMAMIŞ HATA
                        </span>
                    </div>
                )}
            </PageHeader>

            {/* Performans Göstergeleri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-grafana-panel/40 border border-grafana-border p-5 rounded-sm flex items-center gap-5 group hover:border-grafana-accent-red/30 transition-all">
                    <div className="p-3.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-accent-red group-hover:shadow-[0_0_15px_rgba(242,73,92,0.1)] transition-all">
                        <WifiOff size={22} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">Bağlantı Kesintileri</p>
                        <p className="text-2xl font-bold text-grafana-accent-red tabular-nums font-mono">{activeCount}</p>
                    </div>
                </div>
                
                <div className="bg-grafana-panel/40 border border-grafana-border p-5 rounded-sm flex items-center gap-5 group hover:border-grafana-accent-blue/30 transition-all">
                    <div className="p-3.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-accent-blue group-hover:shadow-[0_0_15px_rgba(87,148,242,0.1)] transition-all">
                        <Activity size={22} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">Kayıt Log Derinliği</p>
                        <p className="text-2xl font-bold text-grafana-text-primary tabular-nums font-mono">{alarms.length}</p>
                    </div>
                </div>

                <div className={cn(
                    "bg-grafana-panel/40 border p-5 rounded-sm flex items-center gap-5 transition-all",
                    activeCount > 0 ? "border-grafana-accent-red/20" : "border-grafana-border"
                )}>
                    <div className={cn(
                        "p-3.5 rounded-sm bg-grafana-bg border",
                        activeCount > 0 ? "text-grafana-accent-red border-grafana-accent-red/20" : "text-grafana-accent-green border-grafana-border"
                    )}>
                        <Terminal size={22} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">Bütünlük Durumu</p>
                        <p className={cn(
                            "text-2xl font-bold tabular-nums font-mono",
                            activeCount > 0 ? "text-grafana-accent-red" : "text-grafana-accent-green"
                        )}>
                            {activeCount > 0 ? 'KRİTİK' : 'OPTİMAL'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Alarm Kaydı */}
            <div className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-grafana-border bg-grafana-bg/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <ListFilter size={14} className="text-grafana-text-secondary" />
                        <h3 className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">Bağlantı Bütünlüğü Logları</h3>
                    </div>
                    
                    <div className="flex p-0.5 bg-grafana-bg border border-grafana-border rounded-sm">
                        {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all font-mono",
                                    filter === f
                                        ? "bg-grafana-panel text-white shadow-inner"
                                        : "text-grafana-text-secondary hover:text-grafana-text-primary"
                                )}
                            >
                                {f === 'ALL' ? 'TÜMÜ' : f === 'ACTIVE' ? 'AKTİF' : 'ÇÖZÜLDÜ'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                <th>BAĞLANTI DURUMU</th>
                                <th>VARLIK TANIMLAYICI</th>
                                <th>OLAY TELEMETRİSİ</th>
                                <th>HATA BAŞLANGICI</th>
                                <th>ÇÖZÜM ZAMANI</th>
                                <th>SON VERİ PAKETİ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 font-mono text-grafana-text-secondary animate-pulse uppercase tracking-widest">Alarm kaydı sorgulanıyor...</td>
                                </tr>
                            ) : filteredAlarms.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 font-mono text-grafana-text-secondary uppercase tracking-widest">Aktif bütünlük ihlali saptanmadı</td>
                                </tr>
                            ) : filteredAlarms.map((alarm) => {
                                const isActive = alarm.status === 'ACTIVE';
                                return (
                                    <motion.tr 
                                        key={alarm.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={cn(
                                            "group border-b border-grafana-border/30",
                                            isActive && "bg-grafana-accent-red/[0.03]"
                                        )}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    isActive 
                                                        ? "bg-grafana-accent-red animate-pulse shadow-[0_0_8px_rgba(242,73,92,0.4)]" 
                                                        : "bg-grafana-accent-green"
                                                )} />
                                                <span className={cn(
                                                    "text-[10px] font-bold font-mono tracking-widest uppercase",
                                                    isActive ? "text-grafana-accent-red" : "text-grafana-accent-green"
                                                )}>
                                                    {isActive ? 'AKTİF' : 'ÇÖZÜLDÜ'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary group-hover:text-grafana-accent-blue transition-colors">
                                                    <Cpu size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-grafana-text-primary uppercase group-hover:text-white transition-colors">{alarm.device?.deviceName || 'BİLİNMEYEN DÜĞÜM'}</span>
                                                    <span className="text-[9px] text-grafana-text-secondary font-mono tracking-tighter">ID: {alarm.deviceId.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-start gap-2 max-w-xs">
                                                <AlertCircle size={12} className={cn("mt-0.5 shrink-0", isActive ? "text-grafana-accent-red" : "text-grafana-text-secondary")} />
                                                <span className="text-[11px] text-grafana-text-secondary group-hover:text-grafana-text-primary transition-colors leading-relaxed uppercase font-mono">
                                                    {alarm.message}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col font-mono">
                                                <span className="text-[10px] font-bold text-grafana-text-primary tabular-nums">
                                                    {new Date(alarm.startTime).toLocaleDateString('tr-TR')}
                                                </span>
                                                <span className="text-[9px] text-grafana-text-secondary uppercase tracking-tighter">
                                                    {new Date(alarm.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col font-mono">
                                                {alarm.endTime ? (
                                                    <>
                                                        <span className="text-[10px] font-bold text-grafana-accent-green tabular-nums">
                                                            {new Date(alarm.endTime).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        <span className="text-[9px] text-grafana-text-secondary uppercase tracking-tighter">
                                                            {new Date(alarm.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={10} className="text-grafana-accent-red animate-spin-slow" />
                                                        <span className="text-[10px] font-bold text-grafana-accent-red uppercase tracking-widest">BEKLİYOR</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 font-mono text-[10px] text-grafana-text-secondary tabular-nums">
                                                <Database size={10} className="text-grafana-accent-blue/50" />
                                                {alarm.lastSeenAt ? new Date(alarm.lastSeenAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'YOK'}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
