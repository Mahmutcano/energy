"use client";

import { useState, useEffect } from 'react';
import { Cpu, Plus, Search, X, HardDrive, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface DeviceCategory {
    id: string;
    categoryName: string;
    isActive: boolean;
}

interface Device {
    id: string;
    categoryId: string;
    deviceName: string;
    isActive: boolean;
    category?: DeviceCategory;
    commProtocols?: any[];
    createdAt: string;
}

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [categories, setCategories] = useState<DeviceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        categoryId: '',
        deviceName: '',
        isActive: true
    });

    const fetchDevices = async () => {
        try {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                const data = await res.json();
                setDevices(data);
            }
        } catch (err) {
            console.error('Failed to fetch devices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await apiRequest('/api/device-categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    useEffect(() => {
        fetchDevices();
        fetchCategories();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiRequest('/api/devices', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ categoryId: '', deviceName: '', isActive: true });
                fetchDevices();
            }
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    const filteredDevices = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category?.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Devices</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage device inventory and category assignments</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> New Device
                </button>
            </div>

            {/* Search */}
            <div className="card-base p-2 bg-slate-900/40">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by device name or category..."
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Device Table */}
            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-brand-green">
                            <Cpu size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase">Device Registry</h3>
                            <p className="text-[10px] text-slate-500">{filteredDevices.length} devices found</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Device Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Protocols</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading devices...</td></tr>
                            ) : filteredDevices.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No devices found</td></tr>
                            ) : filteredDevices.map((device) => (
                                <tr key={device.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <HardDrive size={16} className="text-slate-600" />
                                            <span className="text-sm font-bold text-white">{device.deviceName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-400">
                                            {device.category?.categoryName || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">
                                        {device.commProtocols?.length || 0}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold uppercase ${device.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {device.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-600 tabular-nums">
                                        {new Date(device.createdAt).toLocaleDateString()}
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-lg bg-slate-950 border-slate-800 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <Cpu size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">New Device</h2>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Register a new device</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.categoryName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Device Name</label>
                                    <input
                                        type="text"
                                        value={formData.deviceName}
                                        onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        placeholder="e.g. Transformer TR-01"
                                        required
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Active Status</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className="text-brand-green"
                                    >
                                        {formData.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-brand-green text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    Create Device
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
