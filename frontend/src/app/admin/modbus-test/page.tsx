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
    Box
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModbusTestPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    // Modbus Parameters
    const [ip, setIp] = useState('178.242.103.255');
    const [port, setPort] = useState('502');
    const [slaveId, setSlaveId] = useState('255');
    const [functionCode, setFunctionCode] = useState('03');
    const [address, setAddress] = useState('29');

    // UI State
    const [isTesting, setIsTesting] = useState(false);
    const [logs, setLogs] = useState<{ id: number, time: string, message: string, type: 'info' | 'success' | 'error' | 'data' }[]>([]);
    const [results, setResults] = useState<any>(null);

    // Load saved settings
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
                console.error("Failed to parse saved config", e);
            }
        }
    }, []);

    const saveSettings = () => {
        const config = { ip, port, slaveId, address };
        localStorage.setItem('modbus_test_config', JSON.stringify(config));
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
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message: message.toUpperCase(),
            type
        }, ...prev].slice(0, 100));
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        addLog(`INIT_PROCEDURE: CONNECTING TO REMOTE NODE ${ip}:${port}`, 'info');

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
                addLog(`UPLINK_ESTABLISHED: REGISTER ${address} READ_BYTE_ARRAY_VALID`, 'success');
                addLog(`PAYLOAD_RECEIVED: ${JSON.stringify(data.values)}`, 'data');
                setResults(data);
            } else {
                addLog(`IO_EXCEPTION: ${data.message || 'NODE_UNREACHABLE'}`, 'error');
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
                            <h1 className="text-4xl font-black text-white tracking-tighter  italic">Protocol Interface</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Modbus TCP / RTU Shell</span>
                            <div className="h-px w-12 bg-slate-800"></div>
                            <span className="text-[10px] font-mono text-slate-600">ID_REF: SYS_ADMIN_BETA</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hidden md:block group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-500  tracking-widest group-hover:text-brand-green transition-colors">Uplink Stable</span>
                            </div>
                        </div>
                        <div className="p-4 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                            <Terminal size={20} className="text-brand-green" />
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
                                    <label className="text-[9px] font-black text-slate-600  tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Target Endpoint IP</label>
                                    <input
                                        type="text"
                                        value={ip}
                                        onChange={(e) => setIp(e.target.value)}
                                        className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900 tracking-wider tabular-nums italic"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3 group">
                                        <label className="text-[9px] font-black text-slate-600  tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Port</label>
                                        <input
                                            type="text"
                                            value={port}
                                            onChange={(e) => setPort(e.target.value)}
                                            className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3 group">
                                        <label className="text-[9px] font-black text-slate-600  tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Slave ID</label>
                                        <input
                                            type="text"
                                            value={slaveId}
                                            onChange={(e) => setSlaveId(e.target.value)}
                                            className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 02: Data Mapping */}
                        <section className="card-base p-8 bg-slate-900/40 border-slate-800/60 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Database size={48} />
                            </div>
                            <h2 className="text-tech-label mb-8 text-brand-green tracking-[0.3em]">02_Data_Mapping</h2>

                            <div className="space-y-6">
                                <div className="space-y-3 group">
                                    <label className="text-[9px] font-black text-slate-600  tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Function_Code</label>
                                    <div className="relative">
                                        <select
                                            value={functionCode}
                                            onChange={(e) => setFunctionCode(e.target.value)}
                                            className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-brand-green/30 transition-all appearance-none italic"
                                        >
                                            <option value="03">03_READ_HOLDING_REGS</option>
                                            <option value="04">04_READ_INPUT_REGS</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700">
                                            <ArrowRight size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-[9px] font-black text-slate-600  tracking-widest ml-1 group-focus-within:text-brand-green transition-colors">Start Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-xs font-black text-amber-500 outline-none focus:border-brand-green/30 transition-all font-mono"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={handleRunTest}
                                        disabled={isTesting}
                                        className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[11px]  tracking-widest ${isTesting
                                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                : 'bg-brand-green text-white shadow-2xl shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98]'
                                            }`}
                                    >
                                        {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
                                        Execute Probe
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
                                        <span className="text-[10px] font-black text-white tracking-[0.3em]  block leading-none">System Identity Logs</span>
                                        <span className="text-[8px] font-mono text-slate-700 ">Interactive Terminal _v1.0.4</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setLogs([])}
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
                                            <p className="text-[9px] tracking-[0.8em] font-black italic text-slate-600">Standby Mode</p>
                                        </motion.div>
                                    ) : (
                                        logs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`text-[10px] flex gap-4 border-l-2 pl-5 py-0.5 ${log.type === 'error' ? 'text-danger border-danger bg-danger/5' :
                                                        log.type === 'success' ? 'text-brand-green border-brand-green bg-brand-green/5' :
                                                            log.type === 'data' ? 'text-blue-400 border-blue-400 bg-blue-400/5' : 'text-slate-500 border-slate-800 bg-slate-800/5'
                                                    }`}
                                            >
                                                <span className="opacity-30 shrink-0 select-none tracking-tighter tabular-nums">[{log.time}]</span>
                                                <span className="font-bold tracking-widest leading-none truncate whitespace-pre italic">
                                                    {log.message}
                                                </span>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Payload Status Panel */}
                            {results && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="border-t border-slate-800/80 bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-0 relative z-20"
                                >
                                    <div className="px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-10">
                                        <div className="flex items-center gap-10 w-full md:w-auto">
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-brand-green/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="p-5 bg-slate-950 border border-brand-green/30 rounded-2xl flex flex-col items-center justify-center min-w-[120px] relative z-10">
                                                    <span className="text-[9px] text-brand-green font-black tracking-[0.2em] mb-2 ">Reg_Hex</span>
                                                    <span className="text-4xl font-black text-white italic tracking-tighter tabular-nums">
                                                        {results.values[0]}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                <div className="flex gap-2">
                                                    {[...Array(12)].map((_, i) => (
                                                        <div key={i} className={`h-1.5 w-4 rounded-full transition-all duration-700 ${i < 4 ? 'bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                                                    ))}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-brand-green italic tracking-widest ">Payload Integrity: Compliant</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-brand-green rounded-full animate-ping"></div>
                                                        <span className="text-[10px] font-mono text-slate-700  tracking-widest">Realtime Stream Bitrate_0.4kbps</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                                            <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[8px] font-black text-slate-600 tracking-[0.3em] ">Protocol Shell v2.4</span>
                                            <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{ip}</span>
                                            <div className="h-px w-20 bg-slate-800 my-1"></div>
                                            <span className="text-tech-label text-slate-800">AES_256 NODE ENCRYPTION ACTIVE</span>
                                        </div>
                                    </div>

                                    {/* Oscilloscope Decorator */}
                                    <div className="h-1 w-full bg-slate-900 relative overflow-hidden">
                                        <div className="absolute inset-0 w-[200%] h-full flex">
                                            {[...Array(40)].map((_, i) => (
                                                <div key={i} className="flex-1 border-r border-slate-800/10"></div>
                                            ))}
                                        </div>
                                        <motion.div
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                            className="absolute top-0 w-1/4 h-full bg-gradient-to-r from-transparent via-brand-green/40 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                        ></motion.div>
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
                            <span className="text-[9px] font-black text-slate-700 tracking-[0.2em] ">Core Srv Reachable</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Database size={14} className="text-brand-green/40" />
                            <span className="text-[9px] font-black text-slate-700 tracking-[0.2em] ">Redis Sync Stable</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-8">
                        <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-slate-800  tracking-widest leading-none">CPU_LOAD</p>
                            <p className="text-[12px] font-black text-slate-600 italic tracking-tighter tabular-nums leading-none">12.4%</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-slate-800  tracking-widest leading-none">MEM_USAGE</p>
                            <p className="text-[12px] font-black text-slate-600 italic tracking-tighter tabular-nums leading-none">256MB</p>
                        </div>
                        <div className="h-8 w-px bg-slate-900/50 hidden md:block"></div>
                        <span className="text-[10px] font-black italic tracking-[0.4em] text-brand-green shadow-brand-green/20 ">Encryption Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
