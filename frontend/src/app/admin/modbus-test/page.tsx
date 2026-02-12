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
    Lock
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
    const [registerType, setRegisterType] = useState('Holding Register');
    const [address, setAddress] = useState('29');
    const [dataType, setDataType] = useState('16-bit Unsigned');

    // UI State
    const [isTesting, setIsTesting] = useState(false);
    const [logs, setLogs] = useState<{ id: number, time: string, message: string, type: 'info' | 'success' | 'error' | 'data' }[]>([]);
    const [results, setResults] = useState<any>(null);

    // Load saved settings
    useEffect(() => {
        const saved = localStorage.getItem('modbus_test_config');
        if (saved) {
            const config = JSON.parse(saved);
            setIp(config.ip);
            setPort(config.port);
            setSlaveId(config.slaveId);
            setAddress(config.address);
        }
    }, []);

    const saveSettings = () => {
        const config = { ip, port, slaveId, address };
        localStorage.setItem('modbus_test_config', JSON.stringify(config));
        addLog('Identity parameters cached to local terminal memory.', 'success');
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
            message,
            type
        }, ...prev].slice(0, 50));
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        addLog(`Initiating connection to ${ip}:${port}...`, 'info');

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
                addLog(`Connection established. Register ${address} read success.`, 'success');
                addLog(`Result Values: ${JSON.stringify(data.values)}`, 'data');
                setResults(data);
            } else {
                addLog(`Test failed: ${data.message || 'Unknown error'}`, 'error');
            }
        } catch (err: any) {
            addLog(`Network or System Error: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const clearLogs = () => {
        setLogs([]);
        setResults(null);
    };

    if (loading || !user || user.role !== 'SUPER_ADMIN') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 p-8 font-sans selection:bg-blue-600/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-3 text-blue-500 mb-2">
                            <Lock size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Classified Environment // Super Admin Only</span>
                        </div>
                        <h1 className="text-4xl font-black italic text-white tracking-tighter flex items-center gap-4">
                            MODBUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">TERMINAL</span>
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <span className="text-[10px] font-black italic tracking-widest text-blue-400">DEBUG v1.0.4</span>
                            </div>
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium tracking-wide">Professional Industrial Protocol Testing & Identity Debugger</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest"
                        >
                            Exit Environment
                        </button>
                        <div className="px-4 py-2 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center gap-2">
                            <Wifi size={14} className="text-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Master Uplink Active</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Parameters Panel */}
                    <div className="lg:col-span-5 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 text-blue-600/10 group-hover:text-blue-600/20 transition-colors pointer-events-none">
                                <Settings size={120} />
                            </div>

                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-blue-600/20 border border-blue-600/30 rounded-2xl text-blue-500">
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white italic tracking-tight">Configuration Matrix</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Protocol Parameters</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Protocol</label>
                                        <div className="relative">
                                            <select className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white appearance-none outline-none focus:border-blue-500/50 transition-all text-sm font-bold">
                                                <option>Modbus TCP</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                                <ArrowRight size={14} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Statik IP</label>
                                        <input
                                            type="text"
                                            value={ip}
                                            onChange={(e) => setIp(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Port</label>
                                        <input
                                            type="text"
                                            value={port}
                                            onChange={(e) => setPort(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Slave ID (Unit ID)</label>
                                        <input
                                            type="text"
                                            value={slaveId}
                                            onChange={(e) => setSlaveId(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Function Code</label>
                                    <select
                                        value={functionCode}
                                        onChange={(e) => setFunctionCode(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white appearance-none outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                    >
                                        <option value="03">03 - Read Holding Registers</option>
                                        <option value="04">04 - Read Input Registers</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Register Address</label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Data Type</label>
                                        <select
                                            value={dataType}
                                            onChange={(e) => setDataType(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-4 text-white appearance-none outline-none focus:border-blue-500/50 transition-all text-sm font-bold"
                                        >
                                            <option>16-bit Unsigned (0-65535)</option>
                                            <option>16-bit Signed</option>
                                            <option>32-bit Float</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={handleRunTest}
                                        disabled={isTesting}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-5 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isTesting ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            <Play size={18} />
                                        )}
                                        {isTesting ? 'Initiating Test...' : 'Initialize Test Run'}
                                    </button>
                                    <button
                                        onClick={saveSettings}
                                        className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                                        title="Save to Profiles"
                                    >
                                        <Save size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Connection Health Info */}
                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                                        <Database size={16} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Prisma Identity Cloud</span>
                                </div>
                                <span className="text-[10px] font-black italic text-green-500 uppercase tracking-widest">Connected</span>
                            </div>
                        </div>
                    </div>

                    {/* Console & Results Panel */}
                    <div className="lg:col-span-7 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-950 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-[600px] shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-blue-600/5 pointer-events-none"></div>

                            {/* Terminal Header */}
                            <div className="bg-slate-900/80 backdrop-blur border-b border-white/5 p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                    </div>
                                    <div className="h-4 w-px bg-white/10 mx-2"></div>
                                    <Terminal size={16} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Terminal Log</span>
                                </div>
                                <button
                                    onClick={clearLogs}
                                    className="p-2 hover:bg-white/5 rounded-xl text-slate-600 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Terminal Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono scrollbar-hide">
                                <AnimatePresence mode="popLayout">
                                    {logs.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4 opacity-50">
                                            <Search size={48} />
                                            <p className="text-xs font-black uppercase tracking-[0.3em]">Awaiting Instruction Set...</p>
                                        </div>
                                    ) : (
                                        logs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`text-xs flex gap-4 ${log.type === 'error' ? 'text-red-400' :
                                                    log.type === 'success' ? 'text-green-400' :
                                                        log.type === 'data' ? 'text-blue-400' : 'text-slate-500'
                                                    }`}
                                            >
                                                <span className="opacity-30 shrink-0 select-none">[{log.time}]</span>
                                                <span className="font-bold tracking-tight leading-relaxed">
                                                    {log.type === 'success' && '✅ '}
                                                    {log.type === 'error' && '❌ '}
                                                    {log.type === 'data' && '📊 '}
                                                    {log.message}
                                                </span>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Live Result Badge */}
                            {results && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 bg-blue-600/10 border-t border-white/5 flex items-center justify-between"
                                >
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active Register Value</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black italic text-white tracking-tighter tabular-nums">
                                                {results.values[0]}
                                            </span>
                                            <span className="text-blue-400 font-black italic text-sm uppercase tracking-tighter">RAW_UNIT</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 text-right">
                                        <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest">Identity Validated</div>
                                        <p className="text-[10px] font-bold text-slate-500 italic max-w-[140px]">Decrypted payload from target node at {ip}</p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
