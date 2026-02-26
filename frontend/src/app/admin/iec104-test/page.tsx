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
    Network
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function IEC104TestPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    // IEC 104 Parameters
    const [ip, setIp] = useState('178.242.103.255');
    const [port, setPort] = useState('2404');
    const [asduAddr, setAsduAddr] = useState('15644');

    // Communication Protocols
    const [protocols, setProtocols] = useState<any[]>([]);
    const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');

    // UI State
    const [isTesting, setIsTesting] = useState(false);
    const [logs, setLogs] = useState<{ id: string, time: string, message: string, type: 'info' | 'success' | 'error' | 'data' }[]>([]);
    const [results, setResults] = useState<any[] | null>(null);

    // Fetch Protocols
    useEffect(() => {
        const fetchProtocols = async () => {
            try {
                const res = await apiRequest('/api/comm-protocols');
                if (res.ok) {
                    const data = await res.json();
                    setProtocols(data.filter((p: any) => p.protocolType === 'IEC104'));
                }
            } catch (err) {
                console.error("Failed to fetch protocols", err);
            }
        };
        fetchProtocols();
    }, []);

    // Load saved settings
    useEffect(() => {
        const saved = localStorage.getItem('iec104_test_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setIp(config.ip || '178.242.103.255');
                setPort(config.port || '2404');
                setAsduAddr(config.asduAddr || '15644');
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }
    }, []);

    const saveSettings = () => {
        const config = { ip, port, asduAddr };
        localStorage.setItem('iec104_test_config', JSON.stringify(config));
        addLog('CONFIGURATION_SYNC: SUCCESS', 'success');
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
            time: new Date().toLocaleTimeString(),
            message: message.toUpperCase(),
            type
        }, ...prev].slice(0, 100));
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        setResults(null);
        addLog(`INIT_PROCEDURE: CONNECTING TO IEC104 NODE ${ip}:${port}`, 'info');
        addLog(`ASDU_ADDRESS: ${asduAddr}`, 'info');

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
                addLog(`UPLINK_ESTABLISHED: DATA RECEIVED FROM NODE`, 'success');
                addLog(`PAYLOAD_COUNT: ${data.data.length} PDUs`, 'data');
                setResults(data.data);
            } else {
                addLog(`IO_EXCEPTION: ${data.message || 'NODE_UNREACHABLE'}`, 'error');
                if (res.status === 408) {
                    addLog(`TIMEOUT: NO DATA WITHIN 15s`, 'error');
                }
            }
        } catch (err: any) {
            addLog(`SYSTEM_CRITICAL_ERR: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    if (loading || !user || user.role !== 'SUPER_ADMIN') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center font-mono">
                <div className="text-blue-500 animate-pulse text-xs font-black tracking-[0.5em]">SYSTEM_BOOT_INIT...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans selection:bg-brand-green/20 relative overflow-hidden pb-20">
            {/* Ambient Technical Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.05),transparent_40%)] pointer-events-none"></div>
            <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto space-y-8 pt-12 relative z-10">
                {/* 1. Protocol Nexus Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                            <h1 className="text-4xl font-black text-white tracking-tighter italic">IEC 104 Interface</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">IEC 60870-5-104 Protocol Shell</span>
                            <div className="h-px w-12 bg-slate-800"></div>
                            <span className="text-[10px] font-mono text-slate-600">ID_REF: SYS_ADMIN_BETA</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hidden md:block group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-500 tracking-widest group-hover:text-brand-green transition-colors">Uplink Stable</span>
                            </div>
                        </div>
                        <div className="p-4 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                            <Network size={20} className="text-brand-green" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* 2. Control Matrix (Left) */}
                    <div className="xl:col-span-4 space-y-6">
                        {/* Module 01: Uplink Parameters */}
                        <section className="card-base p-8 bg-slate-900/40 border-slate-800/60 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Wifi size={48} />
                            </div>
                            <h2 className="text-tech-label mb-8 text-brand-green tracking-[0.3em]">01_Uplink_Matrix</h2>

                            <div className="space-y-6">
                                <div className="space-y-3 group">
                                    <label className="text-[9px] font-black text-slate-600 tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Select Predefined Protocol</label>
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
                                                addLog(`LOADED_CONFIG: ${proto.configName}`, 'info');
                                            }
                                        }}
                                        className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all cursor-pointer"
                                    >
                                        <option value="">Manual Entry or Select Protocol</option>
                                        {protocols.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.configName} ({p.plant?.plantName})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="h-px bg-slate-800/50 my-2"></div>
                                <div className="space-y-3 group">
                                    <label className="text-[9px] font-black text-slate-600 tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Target Endpoint IP</label>
                                    <input
                                        type="text"
                                        value={ip}
                                        onChange={(e) => setIp(e.target.value)}
                                        className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900 tracking-wider tabular-nums italic"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3 group">
                                        <label className="text-[9px] font-black text-slate-600 tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Port</label>
                                        <input
                                            type="text"
                                            value={port}
                                            onChange={(e) => setPort(e.target.value)}
                                            className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3 group">
                                        <label className="text-[9px] font-black text-slate-600 tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">ASDU Addr</label>
                                        <input
                                            type="text"
                                            value={asduAddr}
                                            onChange={(e) => setAsduAddr(e.target.value)}
                                            className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={handleRunTest}
                                        disabled={isTesting}
                                        className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[11px] tracking-widest ${isTesting
                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                            : 'bg-brand-green text-white shadow-2xl shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98]'
                                            }`}
                                    >
                                        {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
                                        Start Listener
                                    </button>
                                    <button
                                        onClick={saveSettings}
                                        className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95"
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* 3. Identity Shell (Console Log - Right) */}
                    <div className="xl:col-span-8 flex flex-col xl:h-[720px]">
                        <section className="flex-1 card-base bg-slate-950/40 border-slate-800/60 overflow-hidden flex flex-col shadow-2xl backdrop-blur-3xl relative">
                            {/* Terminal Header */}
                            <div className="bg-slate-900/60 px-6 py-4 border-b border-slate-800/80 flex justify-between items-center relative z-20">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                                        <Terminal size={14} className="text-brand-green" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-white tracking-[0.3em] block leading-none">IEC 104 Traffic Monitor</span>
                                        <span className="text-[8px] font-mono text-slate-700 ">Interactive Terminal _v1.0.4</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setLogs([]); setResults(null); }}
                                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-700 hover:text-danger hover:border-danger/30 transition-all active:scale-90"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Log Stream Area */}
                            <div className="flex-1 p-8 overflow-y-auto space-y-3 font-mono relative z-10 scrollbar-hide">
                                <AnimatePresence initial={false}>
                                    {logs.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="h-full flex flex-col items-center justify-center space-y-6 opacity-20"
                                        >
                                            <div className="w-16 h-px bg-slate-700 animate-pulse"></div>
                                            <p className="text-[9px] tracking-[0.8em] font-black italic text-slate-600">Ready to listen...</p>
                                        </motion.div>
                                    ) : (
                                        logs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`text-[10px] flex gap-4 border-l-2 pl-5 py-2 ${log.type === 'error' ? 'text-danger border-danger bg-danger/5' :
                                                    log.type === 'success' ? 'text-brand-green border-brand-green bg-brand-green/5' :
                                                        log.type === 'data' ? 'text-blue-400 border-blue-400 bg-blue-400/5' : 'text-slate-500 border-slate-800 bg-slate-800/5'
                                                    }`}
                                            >
                                                <span className="opacity-30 shrink-0 select-none tracking-tighter tabular-nums">[{log.time}]</span>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold tracking-widest leading-none italic">
                                                        {log.message}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Data Points Display */}
                            {results && results.length > 0 && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="border-t border-slate-800/80 bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-6 relative z-20"
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {results.map((point: any, idx: number) => (
                                            <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-2 hover:border-brand-green/30 transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">IOA: {point.ioa}</span>
                                                    <span className="text-[8px] text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded border border-brand-green/20">TYPE {point.typeId}</span>
                                                </div>

                                                {point.description && (
                                                    <div className="text-[9px] text-brand-green/80 font-bold uppercase tracking-tight truncate" title={point.description}>
                                                        {point.description}
                                                    </div>
                                                )}

                                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                                    <div className="text-xl font-black text-white italic truncate tabular-nums leading-none">
                                                        {typeof point.value === 'number' ? point.value.toFixed(3) : String(point.value)}
                                                    </div>
                                                    {point.unit && <span className="text-[9px] font-bold text-slate-600 lowercase">{point.unit}</span>}
                                                </div>

                                                <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/[0.03]">
                                                    <span className="text-[7px] text-slate-700 uppercase font-mono">QDS: {point.qds || '0'}</span>
                                                    <div className="w-1 h-1 rounded-full bg-slate-800 group-hover:bg-brand-green transition-colors"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </section>
                    </div>
                </div>

                {/* 4. Infrastructure Status Footer */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pt-10 border-t border-slate-900">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3">
                            <Server size={14} className="text-brand-green/40" />
                            <span className="text-[9px] font-black text-slate-700 tracking-[0.2em] ">IEC 104 Link Layer Active</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Activity size={14} className="text-brand-green/40" />
                            <span className="text-[9px] font-black text-slate-700 tracking-[0.2em] ">Polling Node: {ip}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-8">
                        <div className="h-8 w-px bg-slate-900/50 hidden md:block"></div>
                        <span className="text-[10px] font-black italic tracking-[0.4em] text-brand-green shadow-brand-green/20 ">Telemetry System v2.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
