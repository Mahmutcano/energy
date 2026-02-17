"use client";

import { useState, useEffect } from 'react';
import { Network, Plus, X, Cpu, Factory, Wifi, Settings2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface CommProtocol {
    id: string;
    deviceId: string;
    plantId: string;
    protocolType: 'MODBUS' | 'IEC104';
    ipAddress: string | null;
    device?: { id: string; deviceName: string };
    plant?: { id: string; plantName: string };
    modbusConfig?: {
        id: string;
        slaveId: number;
        regAddress: number;
        dataType: string;
    } | null;
    iec104Config?: {
        id: string;
        asduAddress: number;
        t0_timeout: number;
        k_window: number;
    } | null;
    telemetry?: any[];
    thresholds?: any[];
    createdAt: string;
}

export default function ProtocolsPage() {
    const [protocols, setProtocols] = useState<CommProtocol[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [plants, setPlants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<'MODBUS' | 'IEC104'>('MODBUS');

    const [formData, setFormData] = useState({
        deviceId: '',
        plantId: '',
        protocolType: 'MODBUS' as 'MODBUS' | 'IEC104',
        ipAddress: '',
        // Modbus fields
        slaveId: 1,
        regAddress: 0,
        dataType: 'FLOAT32',
        // IEC104 fields
        asduAddress: 1,
        t0_timeout: 30,
        k_window: 12,
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

    const fetchDevicesAndPlants = async () => {
        try {
            const [devRes, plantRes] = await Promise.all([
                apiRequest('/api/devices'),
                apiRequest('/api/plants'),
            ]);
            if (devRes.ok) setDevices(await devRes.json());
            if (plantRes.ok) setPlants(await plantRes.json());
        } catch (err) {
            console.error('Failed to fetch:', err);
        }
    };

    useEffect(() => {
        fetchProtocols();
        fetchDevicesAndPlants();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = {
                deviceId: formData.deviceId,
                plantId: formData.plantId,
                protocolType: formData.protocolType,
                ipAddress: formData.ipAddress || null,
            };

            if (formData.protocolType === 'MODBUS') {
                body.modbusConfig = {
                    slaveId: formData.slaveId,
                    regAddress: formData.regAddress,
                    dataType: formData.dataType,
                };
            } else {
                body.iec104Config = {
                    asduAddress: formData.asduAddress,
                    t0_timeout: formData.t0_timeout,
                    k_window: formData.k_window,
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
                                <th className="px-6 py-4">Device</th>
                                <th className="px-6 py-4">Plant</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Config Details</th>
                                <th className="px-6 py-4">Telemetry</th>
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
                                        {proto.device?.deviceName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {proto.plant?.plantName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-brand-green">
                                        {proto.ipAddress || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {proto.protocolType === 'MODBUS' && proto.modbusConfig ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-400">
                                                <p>Slave: <span className="text-white font-bold">{proto.modbusConfig.slaveId}</span></p>
                                                <p>Reg: <span className="text-white font-bold">{proto.modbusConfig.regAddress}</span> • {proto.modbusConfig.dataType}</p>
                                            </div>
                                        ) : proto.protocolType === 'IEC104' && proto.iec104Config ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-400">
                                                <p>ASDU: <span className="text-white font-bold">{proto.iec104Config.asduAddress}</span></p>
                                                <p>T0: {proto.iec104Config.t0_timeout}s • K: {proto.iec104Config.k_window}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600">No config</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">
                                        {proto.telemetry?.length || 0} records
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

                                {/* Device + Plant */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Device</label>
                                        <select
                                            value={formData.deviceId}
                                            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {devices.map((d: any) => (
                                                <option key={d.id} value={d.id}>{d.deviceName}</option>
                                            ))}
                                        </select>
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

                                {/* IP Address */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">IP Address</label>
                                    <input
                                        type="text"
                                        value={formData.ipAddress}
                                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm font-mono text-brand-green focus:border-brand-green/50 outline-none"
                                        placeholder="192.168.1.100"
                                    />
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
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Register</label>
                                                <input
                                                    type="number"
                                                    value={formData.regAddress}
                                                    onChange={(e) => setFormData({ ...formData, regAddress: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Data Type</label>
                                                <select
                                                    value={formData.dataType}
                                                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none"
                                                >
                                                    {['INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'BOOLEAN'].map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">ASDU Addr</label>
                                                <input
                                                    type="number"
                                                    value={formData.asduAddress}
                                                    onChange={(e) => setFormData({ ...formData, asduAddress: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">T0 Timeout</label>
                                                <input
                                                    type="number"
                                                    value={formData.t0_timeout}
                                                    onChange={(e) => setFormData({ ...formData, t0_timeout: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">K Window</label>
                                                <input
                                                    type="number"
                                                    value={formData.k_window}
                                                    onChange={(e) => setFormData({ ...formData, k_window: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white outline-none tabular-nums"
                                                />
                                            </div>
                                        </div>
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
