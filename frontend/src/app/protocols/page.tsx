"use client";

import { useState, useEffect } from 'react';
import { Network, Plus, X, Cpu, Factory, Wifi, Settings2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface CommProtocol {
    id: string;
    plant_id: string;
    configName: string;
    protocolType: 'MODBUS' | 'IEC104';
    plant?: { id: string; plantName: string };
    devices?: any[];
    modbusConfig?: {
        ipAddress: string;
        port: number;
        slaveId: number;
        timeout: number;
        retryCount: number;
    } | null;
    iec104Config?: {
        ipAddress: string;
        port: number;
        asduAddr: number;
        t0: number;
        t1: number;
        t2: number;
        t3: number;
        k: number;
        w: number;
    } | null;
    createdAt: string;
}

export default function ProtocolsPage() {
    const [protocols, setProtocols] = useState<CommProtocol[]>([]);
    const [plants, setPlants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        configName: '',
        plantId: '',
        protocolType: 'MODBUS' as 'MODBUS' | 'IEC104',
        // Modbus fields
        ipAddress: '192.168.1.100',
        port: 502,
        slaveId: 1,
        timeout: 1000,
        retryCount: 3,
        // IEC104 fields
        iecIpAddress: '192.168.1.101',
        iecPort: 2404,
        asduAddr: 1,
        t0: 30,
        t1: 15,
        t2: 10,
        t3: 20,
        k: 12,
        w: 8,
    });

    const fetchProtocols = async () => {
        try {
            const res = await apiRequest('/api/comm-protocols');
            if (res.ok) {
                const data = await res.json();
                setProtocols(data);
            }
        } catch (err) {
            console.error('Failed to fetch protocols:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlants = async () => {
        try {
            const plantRes = await apiRequest('/api/plants');
            if (plantRes.ok) setPlants(await plantRes.json());
        } catch (err) {
            console.error('Failed to fetch:', err);
        }
    };

    useEffect(() => {
        fetchProtocols();
        fetchPlants();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = {
                configName: formData.configName,
                plantId: formData.plantId,
                protocolType: formData.protocolType,
            };

            if (formData.protocolType === 'MODBUS') {
                body.modbusConfig = {
                    ipAddress: formData.ipAddress,
                    port: formData.port,
                    slaveId: formData.slaveId,
                    timeout: formData.timeout,
                    retryCount: formData.retryCount,
                };
            } else {
                body.iec104Config = {
                    ipAddress: formData.iecIpAddress,
                    port: formData.iecPort,
                    asduAddr: formData.asduAddr,
                    t0: formData.t0,
                    t1: formData.t1,
                    t2: formData.t2,
                    t3: formData.t3,
                    k: formData.k,
                    w: formData.w,
                };
            }

            const res = await apiRequest('/api/comm-protocols', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchProtocols();
            }
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    const modbusCount = protocols.filter(p => p.protocolType === 'MODBUS').length;
    const iec104Count = protocols.filter(p => p.protocolType === 'IEC104').length;

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Communication Protocols</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Configure Modbus and IEC 104 endpoints for devices</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> New Protocol
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Protocols', val: protocols.length, color: 'text-brand-green', icon: Network },
                    { label: 'Modbus', val: modbusCount, color: 'text-blue-400', icon: Cpu },
                    { label: 'IEC 104', val: iec104Count, color: 'text-amber-400', icon: Wifi },
                ].map((stat, i) => (
                    <div key={i} className="card-base p-6 flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-white tabular-nums">{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Protocol Table */}
            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-brand-green">
                            <Network size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase">Protocol Registry</h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Config Name</th>
                                <th className="px-6 py-4">Plant</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Config Details</th>
                                <th className="px-6 py-4">Devices</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading protocols...</td></tr>
                            ) : protocols.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No protocols configured</td></tr>
                            ) : protocols.map((proto) => (
                                <tr key={proto.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${proto.protocolType === 'MODBUS'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {proto.protocolType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-white">
                                        {proto.configName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {proto.plant?.plantName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-brand-green">
                                        {proto.protocolType === 'MODBUS' ? proto.modbusConfig?.ipAddress : proto.iec104Config?.ipAddress || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {proto.protocolType === 'MODBUS' && proto.modbusConfig ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-400">
                                                <p>Port: <span className="text-white font-bold">{proto.modbusConfig.port}</span></p>
                                                <p>Slave ID: <span className="text-white font-bold">{proto.modbusConfig.slaveId}</span></p>
                                            </div>
                                        ) : proto.protocolType === 'IEC104' && proto.iec104Config ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-400">
                                                <p>Port: <span className="text-white font-bold">{proto.iec104Config.port}</span></p>
                                                <p>ASDU: <span className="text-white font-bold">{proto.iec104Config.asduAddr}</span></p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600">No config</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">
                                        {proto.devices?.length || 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-xl bg-slate-950 border-slate-800 overflow-hidden shadow-2xl my-8"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <Network size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">New Protocol</h2>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Configure communication endpoint</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                {/* Configuration Name & Plant */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Config Name</label>
                                        <input
                                            type="text"
                                            value={formData.configName}
                                            onChange={(e) => setFormData({ ...formData, configName: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            placeholder="e.g. Inverter Array 1 HTTP"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plant</label>
                                        <select
                                            value={formData.plantId}
                                            onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {plants.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.plantName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Protocol Type */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protocol Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['MODBUS', 'IEC104'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, protocolType: type })}
                                                className={`p-3 rounded-xl border text-sm font-bold uppercase transition-all ${formData.protocolType === type
                                                    ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
                                                    : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:border-slate-700'
                                                    }`}
                                            >
                                                {type === 'MODBUS' ? 'Modbus TCP' : 'IEC 60870-5-104'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Config Section */}
                                <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/40 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Settings2 size={14} className="text-brand-green" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {formData.protocolType === 'MODBUS' ? 'Modbus Configuration' : 'IEC 104 Configuration'}
                                        </span>
                                    </div>

                                    {formData.protocolType === 'MODBUS' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">IP Address</label>
                                                    <input
                                                        type="text"
                                                        value={formData.ipAddress}
                                                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Port</label>
                                                    <input
                                                        type="number"
                                                        value={formData.port}
                                                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Slave ID</label>
                                                    <input
                                                        type="number"
                                                        value={formData.slaveId}
                                                        onChange={(e) => setFormData({ ...formData, slaveId: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Timeout (ms)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.timeout}
                                                        onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Retry Count</label>
                                                    <input
                                                        type="number"
                                                        value={formData.retryCount}
                                                        onChange={(e) => setFormData({ ...formData, retryCount: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">IP Address</label>
                                                    <input
                                                        type="text"
                                                        value={formData.iecIpAddress}
                                                        onChange={(e) => setFormData({ ...formData, iecIpAddress: e.target.value })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Port</label>
                                                    <input
                                                        type="number"
                                                        value={formData.iecPort}
                                                        onChange={(e) => setFormData({ ...formData, iecPort: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">ASDU Auth</label>
                                                    <input
                                                        type="number"
                                                        value={formData.asduAddr}
                                                        onChange={(e) => setFormData({ ...formData, asduAddr: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">T0 Timeout</label>
                                                    <input
                                                        type="number"
                                                        value={formData.t0}
                                                        onChange={(e) => setFormData({ ...formData, t0: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">T1 Limit</label>
                                                    <input
                                                        type="number"
                                                        value={formData.t1}
                                                        onChange={(e) => setFormData({ ...formData, t1: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">T2 Lim</label>
                                                    <input
                                                        type="number"
                                                        value={formData.t2}
                                                        onChange={(e) => setFormData({ ...formData, t2: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">T3 Lim</label>
                                                    <input
                                                        type="number"
                                                        value={formData.t3}
                                                        onChange={(e) => setFormData({ ...formData, t3: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">K Window</label>
                                                    <input
                                                        type="number"
                                                        value={formData.k}
                                                        onChange={(e) => setFormData({ ...formData, k: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">W Window</label>
                                                    <input
                                                        type="number"
                                                        value={formData.w}
                                                        onChange={(e) => setFormData({ ...formData, w: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-brand-green text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    Create Protocol
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
