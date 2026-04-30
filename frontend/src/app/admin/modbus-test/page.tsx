"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ShieldAlert,
    Cpu,
    Server,
    Settings,
    Play,
    Trash2,
    Save,
    Terminal,
    Wifi,
    ArrowRight,
    Search,
    RefreshCw,
    Database,
    Lock,
    Zap,
    Box,
    HardDrive
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

export default function ModbusTestPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    // Modbus Parametreleri
    const [ip, setIp] = useState('178.242.103.255');
    const [port, setPort] = useState('502');
    const [slaveId, setSlaveId] = useState('255');
    const [functionCode, setFunctionCode] = useState('03');
    const [address, setAddress] = useState('29');
    const [dataType, setDataType] = useState('WORD');

    // UI Durumu
    const [isTesting, setIsTesting] = useState(false);
    const [logs, setLogs] = useState<{ id: number, time: string, message: string, type: 'info' | 'success' | 'error' | 'data' }[]>([]);
    const [results, setResults] = useState<any>(null);

    // Kayıtlı ayarları yükle
    useEffect(() => {
        const saved = localStorage.getItem('modbus_test_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setIp(config.ip || '178.242.103.255');
                setPort(config.port || '502');
                setSlaveId(config.slaveId || '255');
                setAddress(config.address || '29');
            } catch (e) {
                console.error("Kayıtlı yapılandırma ayrıştırılamadı", e);
            }
        }
    }, []);

    const saveSettings = () => {
        const config = { ip, port, slaveId, address };
        localStorage.setItem('modbus_test_config', JSON.stringify(config));
        addLog('YAPILANDIRMA SENKRONU: BAŞARILI', 'success');
    };

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.role !== 'SUPER_ADMIN') {
                router.push('/');
            }
        }
    }, [user, loading, isAuthenticated, router]);

    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'data' = 'info') => {
        setLogs(prev => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message: message.toUpperCase(),
            type
        }, ...prev].slice(0, 100));
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        addLog(`BAŞLATMA PROSEDÜRÜ: UZAK DÜĞÜME BAĞLANILIYOR ${ip}:${port}`, 'info');

        try {
            const res = await apiRequest('/api/admin/modbus-test', {
                method: 'POST',
                body: JSON.stringify({
                    ip,
                    port,
                    slaveId,
                    address,
                    functionCode
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                addLog(`UPLINK KURULDU: ADRES ${address} OKUMA GEÇERLİ`, 'success');
                addLog(`VERİ ALINDI: ${JSON.stringify(data.values)}`, 'data');
                setResults(data);
            } else {
                addLog(`IO İSTİSNASI: ${data.message || 'DÜĞÜME ERİŞİLEMEDİ'}`, 'error');
            }
        } catch (err: any) {
            addLog(`SİSTEM KRİTİK HATA: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    if (loading || !user || user.role !== 'SUPER_ADMIN') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center font-mono">
                <div className="text-grafana-accent-blue animate-pulse text-[10px] font-black tracking-[0.5em] uppercase">SİSTEM BAŞLATILIYOR...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 font-sans">
            <PageHeader 
                title="PROTOKOL" 
                highlightedTitle="ARAYÜZÜ"
                subtitle="Modbus TCP / RTU haberleşme katmanı için interaktif interogasyon kabuğu"
                icon={Terminal}
            >
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-grafana-bg border border-grafana-border rounded-sm hidden md:flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_8px_#73bf69] animate-pulse"></div>
                        <span className="text-[10px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">Uplink Stabil</span>
                    </div>
                    <button 
                        onClick={saveSettings}
                        className="p-2.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-white hover:border-grafana-accent-blue transition-all"
                    >
                        <Save size={16} />
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Controls */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="card-base p-6 bg-grafana-panel/50 space-y-6">
                        <div className="flex items-center gap-2 text-grafana-accent-blue mb-2">
                            <Wifi size={14} />
                            <h3 className="text-[10px] font-black tracking-widest uppercase font-mono">01 UPLINK MATRİSİ</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest ml-1">Hedef IP</label>
                                <input
                                    type="text"
                                    value={ip}
                                    onChange={(e) => setIp(e.target.value)}
                                    className="w-full bg-grafana-bg border border-grafana-border rounded-sm p-3 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest ml-1">Port</label>
                                    <input
                                        type="text"
                                        value={port}
                                        onChange={(e) => setPort(e.target.value)}
                                        className="w-full bg-grafana-bg border border-grafana-border rounded-sm p-3 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest ml-1">Slave ID</label>
                                    <input
                                        type="text"
                                        value={slaveId}
                                        onChange={(e) => setSlaveId(e.target.value)}
                                        className="w-full bg-grafana-bg border border-grafana-border rounded-sm p-3 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-base p-6 bg-grafana-panel/50 space-y-6">
                        <div className="flex items-center gap-2 text-grafana-accent-orange mb-2">
                            <Database size={14} />
                            <h3 className="text-[10px] font-black tracking-widest uppercase font-mono">02 VERİ EŞLEŞMESİ</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest ml-1">Fonksiyon Kodu</label>
                                <select
                                    value={functionCode}
                                    onChange={(e) => setFunctionCode(e.target.value)}
                                    className="w-full bg-grafana-bg border border-grafana-border rounded-sm p-3 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono appearance-none"
                                >
                                    <option value="03">03 HOLDING REGS</option>
                                    <option value="04">04 INPUT REGS</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest ml-1">Başlangıç Adresi</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-grafana-bg border border-grafana-border rounded-sm p-3 text-xs font-bold text-grafana-accent-orange outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                />
                            </div>

                            <button
                                onClick={handleRunTest}
                                disabled={isTesting}
                                className={cn(
                                    "w-full py-4 rounded-sm flex items-center justify-center gap-3 transition-all font-bold text-[11px] tracking-widest uppercase font-mono shadow-lg",
                                    isTesting 
                                        ? "bg-grafana-bg text-grafana-text-secondary border border-grafana-border cursor-not-allowed" 
                                        : "bg-grafana-accent-blue text-white shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90"
                                )}
                            >
                                {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
                                {isTesting ? 'SORGULANIYOR...' : 'Sorguyu Çalıştır'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Terminal */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="card-base bg-black/40 border border-grafana-border flex flex-col h-[600px] overflow-hidden">
                        <div className="bg-grafana-panel/50 px-6 py-3 border-b border-grafana-border flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Terminal size={14} className="text-grafana-accent-blue" />
                                <span className="text-[9px] font-bold text-grafana-text-primary tracking-widest uppercase font-mono">SİSTEM LOGLARI</span>
                            </div>
                            <button 
                                onClick={() => setLogs([])}
                                className="text-grafana-text-secondary hover:text-grafana-accent-red transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-2 font-mono scrollbar-hide">
                            <AnimatePresence initial={false}>
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <p className="text-[9px] tracking-[0.5em] font-bold italic uppercase">Bekleme Modu</p>
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={cn(
                                                "text-[10px] flex gap-4 py-1 border-l-2 pl-4",
                                                log.type === 'error' ? 'text-grafana-accent-red border-grafana-accent-red bg-grafana-accent-red/5' :
                                                log.type === 'success' ? 'text-grafana-accent-green border-grafana-accent-green bg-grafana-accent-green/5' :
                                                log.type === 'data' ? 'text-grafana-accent-blue border-grafana-accent-blue bg-grafana-accent-blue/5' : 
                                                'text-grafana-text-secondary border-grafana-border bg-grafana-bg/5'
                                            )}
                                        >
                                            <span className="opacity-40 shrink-0 tabular-nums">[{log.time}]</span>
                                            <span className="font-bold tracking-wide italic">{log.message}</span>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {results && (
                            <div className="p-8 bg-grafana-panel/80 border-t border-grafana-border">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex items-center gap-8">
                                        <div className="p-6 bg-grafana-bg border border-grafana-accent-blue/30 rounded-sm shadow-[0_0_30px_rgba(87,148,242,0.1)]">
                                            <span className="text-[9px] text-grafana-accent-blue font-bold tracking-widest block mb-2 uppercase font-mono">REG VALUE</span>
                                            <span className="text-4xl font-bold text-white tabular-nums font-mono">
                                                {results?.values?.[0] ?? 'N/A'}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex gap-1.5">
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className={cn("h-1 w-3 rounded-full", i < 3 ? "bg-grafana-accent-green" : "bg-grafana-border")} />
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-grafana-accent-green rounded-full animate-pulse" />
                                                <span className="text-[9px] font-bold text-grafana-accent-green tracking-widest uppercase font-mono">VERİ BÜTÜNLÜĞÜ: STABİL</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <span className="text-[10px] font-bold text-grafana-text-secondary tracking-widest uppercase block font-mono">BAĞLANTI</span>
                                        <span className="text-xl font-bold text-white font-mono">{ip}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex flex-wrap items-center justify-between gap-6 pt-10 border-t border-grafana-border/50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 opacity-50">
                        <Server size={14} />
                        <span className="text-[9px] font-bold tracking-widest uppercase font-mono">MASTER CORE: AKTİF</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                        <HardDrive size={14} />
                        <span className="text-[9px] font-bold tracking-widest uppercase font-mono">REDIS CACHE: SENKRON</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-grafana-accent-green">
                        <ShieldAlert size={14} />
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase font-mono">AES-256 ŞİFRELEME AKTİF</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
