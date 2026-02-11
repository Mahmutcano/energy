"use client";

import { useState, useEffect } from 'react';
import { Activity, Plus, Search, MoreVertical, Edit2, Trash2, X } from 'lucide-react';

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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/devices`, {
                headers: { 'x-user-role': 'ADMIN' }
            });
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': 'ADMIN'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchDevices();
            } else {
                const err = await res.json();
                console.error('Hata: ', err.error);
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
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        Device <span className="text-blue-500 italic">Management</span>
                    </h1>
                    <p className="text-slate-400">Configure RTU devices and IOA protocol mappings</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer"
                >
                    <Plus className="h-5 w-5" /> Add New device
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500">Loading devices...</p>
                        ) : devices.map((device) => (
                            <div
                                key={device.id}
                                onClick={() => setSelectedDevice(device)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer group ${selectedDevice?.id === device.id ? 'bg-blue-600/10 border-blue-600' : 'bg-slate-900/50 border-slate-800 hover:border-blue-500/30'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-200 italic group-hover:text-blue-400">{device.name}</h4>
                                    <div className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                                </div>
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    <span>{device.ipAddress || device.ip}</span>
                                    <span>{device.protocol}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-slate-900/30 rounded-3xl border border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h3 className="font-bold italic text-slate-200">Mappings: {selectedDevice?.name || 'Select a device'}</h3>
                            <button className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">
                                Bulk import
                            </button>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold border-b border-slate-800">
                                    <th className="px-6 py-4">ID/ADDR</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Unit</th>
                                    <th className="px-6 py-4">Scale</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {mappings.map((mapping) => (
                                    <tr key={mapping.ioa} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-400">{mapping.ioa}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-200">{mapping.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{mapping.unit}</td>
                                        <td className="px-6 py-4 text-slate-400">{mapping.scale.toFixed(1)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${mapping.type === 'Analog' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {mapping.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:text-white text-slate-500 transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white italic">Add New <span className="text-blue-500">Device</span></h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDevice} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Device Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="e.g. Modbus Meter 01"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Protocol</label>
                                        <select
                                            value={formData.protocol}
                                            onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            <option value="MODBUS_TCP">Modbus TCP</option>
                                            <option value="IEC104">IEC 60870-5-104</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Slave ID (Modbus Only)</label>
                                        <input
                                            type="number"
                                            defaultValue={1}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 opacity-50"
                                            disabled={formData.protocol !== 'MODBUS_TCP'}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">IP Address</label>
                                        <input
                                            type="text"
                                            value={formData.ipAddress}
                                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="127.0.0.1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Port</label>
                                        <input
                                            type="number"
                                            value={formData.port}
                                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="502"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer"
                            >
                                Initiate Connection
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
