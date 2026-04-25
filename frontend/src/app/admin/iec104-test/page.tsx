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
    Terminal as TerminalIcon,
    Wifi,
    ArrowRight,
    Search,
    RefreshCw,
    Database,
    Lock,
    Zap,
    Box,
    Network,
    Info,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';

export default function IEC104TestPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    // IEC 104 Parametreleri
    const [ip, setIp] = useState('178.242.103.255');
    const [port, setPort] = useState('2404');
    const [asduAddr, setAsduAddr] = useState('15644');

    // İletişim Protokolleri
    const [protocols, setProtocols] = useState<any[]>([]);
    const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');

    // UI Durumu
    const [isTesting, setIsTesting] = useState(false);
    const [logs, setLogs] = useState<{ id: string, time: string, message: string, type: 'info' | 'success' | 'error' | 'data' }[]>([]);
    const [results, setResults] = useState<any[] | null>(null);

    // Protokolleri Çek
    useEffect(() => {
        const fetchProtocols = async () => {
            try {
                const res = await apiRequest('/api/comm-protocols');
                if (res.ok) {
                    const data = await res.json();
                    setProtocols(data.filter((p: any) => p.protocolType === 'IEC104'));
                }
            } catch (err) {
                console.error("Protokoller çekilemedi", err);
            }
        };
        fetchProtocols();
    }, []);

    // Kayıtlı ayarları yükle
    useEffect(() => {
        const saved = localStorage.getItem('iec104_test_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setIp(config.ip || '178.242.103.255');
                setPort(config.port || '2404');
                setAsduAddr(config.asduAddr || '15644');
            } catch (e) {
                console.error("Kayıtlı yapılandırma ayrıştırılamadı", e);
            }
        }
    }, []);

    const saveSettings = () => {
        const config = { ip, port, asduAddr };
        localStorage.setItem('iec104_test_config', JSON.stringify(config));
        addLog('YAPILANDIRMA_SENKRONU: BAŞARILI', 'success');
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
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            time: new Date().toLocaleTimeString('tr-TR'),
            message: message.toUpperCase(),
            type
        }, ...prev].slice(0, 100));
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        setResults(null);
        addLog(`BAŞLATMA_PROSEDÜRÜ: IEC104 DÜĞÜMÜNE BAĞLANILIYOR ${ip}:${port}`, 'info');
        addLog(`ASDU_ADRESİ: ${asduAddr}`, 'info');

        try {
            const res = await apiRequest('/api/admin/iec104-test', {
                method: 'POST',
                body: JSON.stringify({
                    ip,
                    port,
                    asduAddr
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                addLog(`UPLINK_KURULDU: DÜĞÜMDEN VERİ ALINDI`, 'success');
                addLog(`VERİ_SAYISI: ${data.data.length} PDU`, 'data');
                setResults(data.data);
            } else {
                addLog(`IO_İSTİSNASI: ${data.message || 'DÜĞÜME_ERİŞİLEMEDİ'}`, 'error');
                if (res.status === 408) {
                    addLog(`ZAMAN_AŞIMI: 15SN İÇİNDE VERİ ALINAMADI`, 'error');
                }
            }
        } catch (err: any) {
            addLog(`SİSTEM_KRİTİK_HATA: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    if (loading || !user || user.role !== 'SUPER_ADMIN') {
        return (
            <div className="min-h-screen bg-grafana-bg flex items-center justify-center font-mono">
                <div className="text-grafana-accent-blue animate-pulse text-xs font-black tracking-[0.5em]">SİSTEM BAŞLATILIYOR...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 font-sans">
            <PageHeader
                title="IEC 104"
                highlightedTitle="ARAYÜZÜ"
                subtitle="IEC 60870-5-104 protokol katmanı ve telemetri analiz kabuğu"
                icon={Network}
            >
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-grafana-panel/50 border border-grafana-border rounded-sm hidden md:block group">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_8px_rgba(115,191,105,0.4)] animate-pulse"></div>
                            <span className="text-[10px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">Sistem Hazır</span>
                        </div>
                    </div>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Sol Panel: Yapılandırma */}
                <div className="xl:col-span-4 space-y-6">
                    <section className="card-base p-6 border-grafana-border group">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-grafana-border">
                            <Settings size={16} className="text-grafana-accent-blue" />
                            <h2 className="text-[11px] font-bold text-grafana-text-primary tracking-[0.2em] uppercase font-mono">UPLINK YAPILANDIRMASI</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-tech-label block ml-1 uppercase">ÖN TANIMLI PROTOKOL</label>
                                <select
                                    value={selectedProtocolId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setSelectedProtocolId(id);
                                        const proto = protocols.find(p => p.id === id);
                                        if (proto && proto.iec104Config) {
                                            setIp(proto.iec104Config.ipAddress);
                                            setPort(proto.iec104Config.port.toString());
                                            setAsduAddr(proto.iec104Config.asduAddr.toString());
                                            addLog(`YAPILANDIRMA_YÜKLENDİ: ${proto.configName}`, 'info');
                                        }
                                    }}
                                    className="w-full h-11 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all cursor-pointer font-mono"
                                >
                                    <option value="">MANUEL GİRİŞ</option>
                                    {protocols.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.configName.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-tech-label block ml-1 uppercase">HEDEF IP ADRESİ</label>
                                <input
                                    type="text"
                                    value={ip}
                                    onChange={(e) => setIp(e.target.value)}
                                    className="w-full h-11 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                    placeholder="192.168.1.100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-tech-label block ml-1 uppercase">PORT</label>
                                    <input
                                        type="text"
                                        value={port}
                                        onChange={(e) => setPort(e.target.value)}
                                        className="w-full h-11 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-tech-label block ml-1 uppercase">ASDU ADRESİ</label>
                                    <input
                                        type="text"
                                        value={asduAddr}
                                        onChange={(e) => setAsduAddr(e.target.value)}
                                        className="w-full h-11 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleRunTest}
                                    disabled={isTesting}
                                    className={cn(
                                        "flex-1 h-12 rounded-sm flex items-center justify-center gap-3 transition-all font-bold text-[11px] tracking-widest uppercase font-mono shadow-lg",
                                        isTesting
                                            ? 'bg-grafana-panel text-grafana-text-secondary cursor-not-allowed'
                                            : 'bg-grafana-accent-blue text-white shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 active:scale-[0.98]'
                                    )}
                                >
                                    {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={14} fill="white" />}
                                    DINLEMEYI BAŞLAT
                                </button>
                                <button
                                    onClick={saveSettings}
                                    className="w-12 h-12 rounded-sm bg-grafana-panel border border-grafana-border text-grafana-text-secondary flex items-center justify-center hover:text-white hover:border-grafana-accent-blue transition-all"
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className="card-base p-6 border-grafana-border bg-grafana-accent-blue/[0.03]">
                         <div className="flex items-start gap-4">
                            <div className="p-2 bg-grafana-accent-blue/10 rounded-sm text-grafana-accent-blue">
                                <Info size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">DİKKAT</p>
                                <p className="text-[9px] text-grafana-text-secondary leading-relaxed font-mono uppercase">
                                    IEC 104 TEST ARACI, HEDEF DÜĞÜMDEN GELEN TÜM ASDU PAKETLERİNİ GERÇEK ZAMANLI OLARAK ÇÖZÜMLEMEK İÇİN TASARLANMIŞTIR.
                                </p>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Sağ Panel: Terminal ve Veri Akışı */}
                <div className="xl:col-span-8 space-y-6">
                    <section className="card-base flex flex-col h-[700px] border-grafana-border overflow-hidden">
                        {/* Terminal Header */}
                        <div className="bg-grafana-panel/50 px-6 py-3 border-b border-grafana-border flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <TerminalIcon size={14} className="text-grafana-accent-blue" />
                                <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase font-mono">IEC 104 TRAFİK MONİTÖRÜ</span>
                            </div>
                            <button
                                onClick={() => { setLogs([]); setResults(null); }}
                                className="p-2 text-grafana-text-secondary hover:text-grafana-accent-red transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Terminal Logs */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-2 bg-grafana-bg/30 font-mono scrollbar-hide">
                            <AnimatePresence initial={false}>
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                                        <div className="w-12 h-[1px] bg-grafana-border animate-pulse" />
                                        <p className="text-[9px] tracking-[0.5em] font-bold text-grafana-text-secondary uppercase font-mono italic">Dinlemeye Hazır...</p>
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={cn(
                                                "text-[10px] flex gap-4 border-l-2 pl-4 py-1.5",
                                                log.type === 'error' ? 'border-grafana-accent-red bg-grafana-accent-red/5 text-grafana-accent-red' :
                                                log.type === 'success' ? 'border-grafana-accent-green bg-grafana-accent-green/5 text-grafana-accent-green' :
                                                log.type === 'data' ? 'border-grafana-accent-blue bg-grafana-accent-blue/5 text-grafana-accent-blue' : 
                                                'border-grafana-border bg-grafana-panel/30 text-grafana-text-secondary'
                                            )}
                                        >
                                            <span className="opacity-40 shrink-0 font-mono">[{log.time}]</span>
                                            <span className="font-bold tracking-wider">{log.message}</span>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Results Matrix */}
                        {results && results.length > 0 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="border-t border-grafana-border bg-grafana-panel/80 p-6"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {results.map((point: any, idx: number) => (
                                        <div key={idx} className="bg-grafana-bg border border-grafana-border p-4 rounded-sm flex flex-col gap-2 hover:border-grafana-accent-blue/50 transition-all group">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] text-grafana-text-secondary font-bold uppercase tracking-widest font-mono">IOA: {point.ioa}</span>
                                                <span className="text-[7px] text-grafana-accent-blue bg-grafana-accent-blue/10 px-1.5 py-0.5 rounded-sm border border-grafana-accent-blue/20 font-mono">TİP {point.typeId}</span>
                                            </div>

                                            {point.description && (
                                                <div className="text-[9px] text-grafana-accent-blue font-bold uppercase tracking-tight truncate font-mono" title={point.description}>
                                                    {point.description}
                                                </div>
                                            )}

                                            <div className="flex items-baseline gap-1.5">
                                                <div className="text-xl font-bold text-white tabular-nums font-mono">
                                                    {typeof point.value === 'number' ? point.value.toFixed(3) : String(point.value)}
                                                </div>
                                                {point.unit && <span className="text-[9px] font-bold text-grafana-text-secondary font-mono">{point.unit}</span>}
                                            </div>

                                            <div className="flex justify-between items-center mt-1 pt-2 border-t border-grafana-border/50">
                                                <span className="text-[7px] text-grafana-text-secondary uppercase font-mono">QDS: {point.qds || '0'}</span>
                                                <div className="w-1 h-1 rounded-full bg-grafana-border group-hover:bg-grafana-accent-blue transition-colors"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </section>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pt-10 border-t border-grafana-border">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <Server size={14} className="text-grafana-text-secondary" />
                        <span className="text-[9px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">KATMAN AKTİF</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Activity size={14} className="text-grafana-text-secondary" />
                        <span className="text-[9px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">SORGULANAN DÜĞÜM: {ip}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-px h-6 bg-grafana-border hidden md:block" />
                    <span className="text-[10px] font-bold text-grafana-accent-blue tracking-[0.3em] uppercase font-mono">SCADA CORE v2.0</span>
                </div>
            </div>
        </div>
    );
}
