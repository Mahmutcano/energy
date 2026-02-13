"use client";

import { useState, useEffect } from 'react';
import { Activity, Plus, Search, MoreVertical, Edit2, Trash2, X, Box, Database, Cpu, HardDrive, Terminal } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function Devices() {
    const [mounted, setMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        protocol: 'MODBUS_TCP',
        ipAddress: '127.0.0.1',
        port: 5020,
        powerPlantId: 'pp-001'
    });

    const fetchDevices = async () => {
        try {
            const res = await apiRequest('/api/devices');
            const data = await res.json();
            setDevices(data);
            if (data.length > 0 && !selectedDevice) {
                setSelectedDevice(data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch devices:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchDevices();
    }, []);

    const handleCreateDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiRequest('/api/devices', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchDevices();
            } else {
                const err = await res.json();
                console.error('Hata: ', err.message || err.error);
            }
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    if (!mounted) return null;

    const mappings = [
        { ioa: 100, name: 'Active Power L1', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 101, name: 'Active Power L2', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 102, name: 'Active Power L3', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 200, name: 'Breaker Status', unit: 'BOOL', scale: 1.0, type: 'Digital' },
        { ioa: 201, name: 'Fault Signal', unit: 'BOOL', scale: 1.0, type: 'Digital' },
    ];

    return (
        <div className="space-y-8 max-w-full animate-in-up font-sans pb-12">
            {/* 1. Technical Resource Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Device Manager</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Asset Inventory</span>
                        <div className="h-px w-12 bg-slate-800"></div>
                        <span className="text-[10px] font-mono text-slate-600">NODE DISCOVERY ACTIVE</span>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-[0.2em]"
                >
                    <Plus size={18} strokeWidth={3} /> Add New Unit
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* 2. Device Selection Matrix */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="card-base p-2 bg-slate-900/40">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search device nodes..."
                                className="w-full pl-12 pr-4 py-4 bg-transparent border-none text-xs font-bold text-white focus:outline-none uppercase tracking-widest placeholder:text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[700px] overflow-y-auto scrollbar-hide pr-1">
                        {loading ? (
                            <div className="p-8 card-base text-center">
                                <span className="text-tech-label animate-pulse">Fetching Remote Assets</span>
                            </div>
                        ) : devices.map((device) => (
                            <div
                                key={device.id}
                                onClick={() => setSelectedDevice(device)}
                                className={`card-base p-6 border-l-4 transition-all cursor-pointer group relative overflow-hidden bg-slate-900/20 ${selectedDevice?.id === device.id ? 'border-l-brand-green bg-slate-900/60 shadow-xl' : 'border-l-transparent hover:border-l-slate-700 hover:bg-slate-900/40'}`}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5">
                                    <HardDrive size={32} />
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h4 className={`text-sm font-black tracking-tight uppercase ${selectedDevice?.id === device.id ? 'text-white' : 'text-slate-400'}`}>{device.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono text-slate-600 tabular-nums uppercase">{device.protocol}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-800'}`} />
                                        <span className={`text-[8px] font-black tracking-widest uppercase ${device.status === 'ONLINE' ? 'text-brand-green/80' : 'text-slate-700'}`}>{device.status}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-tighter relative z-10 pt-3 border-t border-slate-800/40">
                                    <span className="tabular-nums font-mono">{device.ipAddress || 'BRIDGE_VAL'}</span>
                                    <div className="px-1.5 py-0.5 rounded bg-slate-950/80 text-[8px] border border-white/5">NODE {device.id?.substring(0, 4)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Parameter Allocation Table */}
                <div className="xl:col-span-8">
                    <div className="card-base flex flex-col h-full bg-slate-900/20 dot-bg">
                        <div className="p-8 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-brand-green">
                                    <Database size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">IOA Mapping Matrix</h3>
                                    <p className="text-tech-label mt-1 text-slate-600">{selectedDevice?.name || 'Selection Pending'}</p>
                                </div>
                            </div>
                            <button className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest hover:border-brand-green/30 transition-all">
                                Sync XML
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/40 bg-slate-900/20">
                                        <th className="px-8 py-5">Hex ID</th>
                                        <th className="px-8 py-5">Tag Descriptor</th>
                                        <th className="px-8 py-5">Unit</th>
                                        <th className="px-8 py-5">Scale</th>
                                        <th className="px-8 py-5">Type</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappings.map((mapping) => (
                                        <tr key={mapping.ioa} className="border-b border-slate-800/30 hover:bg-slate-800/20 shadow-sm transition-all group">
                                            <td className="px-8 py-5 text-xs font-black font-mono text-brand-green">0x{mapping.ioa.toString(16).toUpperCase()}</td>
                                            <td className="px-8 py-5 text-xs font-black text-white">{mapping.name}</td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2 py-1 rounded border border-white/5 uppercase">[{mapping.unit}]</span>
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-slate-400 font-mono">{mapping.scale.toFixed(4)}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${mapping.type === 'Analog' ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {mapping.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                                    <Edit2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-slate-800/40 flex justify-between items-center bg-slate-900/20">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Core Nodes Synced: 100%</span>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bus Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Industrial Node Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card-base w-full max-w-xl bg-slate-950 border-slate-800 overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                    <Terminal size={22} className="text-brand-green" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Init New Node</h2>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Resource Allocation Shell</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDevice} className="p-10 space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-tech-label">Node Descriptor Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-sm font-bold text-white focus:border-brand-green/50 outline-none uppercase tracking-widest placeholder:text-slate-800 transition-all"
                                        placeholder="EX: CORE TRANS 01"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-tech-label">Link Protocol</label>
                                        <select
                                            value={formData.protocol}
                                            onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-sm font-black text-white focus:border-brand-green/50 outline-none appearance-none cursor-pointer tracking-widest"
                                        >
                                            <option value="MODBUS_TCP">MODBUS TCP</option>
                                            <option value="IEC104">IEC 104 TCP</option>
                                            <option value="SNMP">SNMP V3</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-tech-label text-slate-700">Slave Address (Fixed)</label>
                                        <input
                                            type="number"
                                            defaultValue={1}
                                            className="w-full px-5 py-4 bg-slate-900/20 border border-slate-800/40 rounded-xl text-sm font-black text-slate-800 outline-none tabular-nums"
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-8 space-y-3">
                                        <label className="text-tech-label">IPv4 Endpoint</label>
                                        <input
                                            type="text"
                                            value={formData.ipAddress}
                                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-sm font-black text-brand-green focus:border-brand-green outline-none tracking-widest tabular-nums"
                                            placeholder="127.0.0.1"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-3">
                                        <label className="text-tech-label">Port</label>
                                        <input
                                            type="number"
                                            value={formData.port}
                                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                            className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-sm font-black text-white focus:border-brand-green/50 outline-none tabular-nums"
                                            placeholder="502"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-brand-green text-white font-black uppercase tracking-[0.4em] text-xs rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                            >
                                Initiate Link Node
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
