"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Cpu, Plus, Search, X, HardDrive, Tag, ToggleLeft, ToggleRight, Network, Pencil, Trash2, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProtocolConfig {
    id: string;
    configName: string;
    protocolType: string;
    plant?: { plantName: string };
}

interface Device {
    id: string;
    protocol_config_id: string;
    deviceName: string;
    deviceType: 'INVERTER' | 'ANALYZER' | 'RELAY';
    isActive: boolean;
    protocol?: ProtocolConfig;
    createdAt?: string;
    dataSheets?: any[];
}

function DevicesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialProtocolId = searchParams?.get('protocolId') || '';

    const [devices, setDevices] = useState<Device[]>([]);
    const [protocols, setProtocols] = useState<ProtocolConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        protocolConfigId: initialProtocolId,
        deviceName: '',
        deviceType: 'INVERTER' as 'INVERTER' | 'ANALYZER' | 'RELAY',
        isActive: true,
        createdAt: ''
    });
    const submittingRef = React.useRef(false);

    const fetchDevices = async () => {
        try {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                let data = await res.json();
                if (initialProtocolId) {
                    data = data.filter((d: Device) => d.protocol_config_id === initialProtocolId);
                }
                setDevices(data);
            }
        } catch (err) {
            console.error('Failed to fetch devices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProtocols = async () => {
        try {
            const res = await apiRequest('/api/comm-protocols');
            if (res.ok) {
                const data = await res.json();
                setProtocols(data);
            }
        } catch (err) {
            console.error('Failed to fetch protocols:', err);
        }
    };

    useEffect(() => {
        fetchDevices();
        fetchProtocols();
    }, [initialProtocolId]);


    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({
            protocolConfigId: initialProtocolId || (protocols.length > 0 ? protocols[0].id : ''),
            deviceName: '',
            deviceType: 'INVERTER',
            isActive: true,
            createdAt: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (device: Device) => {
        setEditingDevice(device);
        setFormData({
            protocolConfigId: device.protocol_config_id || '',
            deviceName: device.deviceName || '',
            deviceType: device.deviceType || 'INVERTER',
            isActive: device.isActive,
            createdAt: device.createdAt ? new Date(device.createdAt).toISOString().slice(0, 16) : ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this device?')) return;
        try {
            const res = await apiRequest(`/api/devices/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDevices();
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const body: any = {
                protocolConfigId: formData.protocolConfigId,
                deviceName: formData.deviceName,
                deviceType: formData.deviceType,
                isActive: formData.isActive
            };
            if (editingDevice && formData.createdAt) {
                body.createdAt = new Date(formData.createdAt).toISOString();
            }

            const url = editingDevice ? `/api/devices/${editingDevice.id}` : '/api/devices';
            const method = editingDevice ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({
                    protocolConfigId: initialProtocolId,
                    deviceName: '',
                    deviceType: 'INVERTER',
                    isActive: true,
                    createdAt: ''
                });
                setEditingDevice(null);
                fetchDevices();
            } else {
                const data = await res.json();
                alert(data.error || 'Operation failed');
            }
        } catch (err) {
            console.error('Create/Update error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const filteredDevices = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol?.configName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">Devices</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage device inventory and assignments</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all  tracking-widest"
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
                        placeholder="Search by device name, type or protocol..."
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
                            <h3 className="text-sm font-bold text-white ">Device Registry</h3>
                            <p className="text-[10px] text-slate-500">{filteredDevices.length} devices found</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500  tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Device Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Protocol Config</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading devices...</td></tr>
                            ) : filteredDevices.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No devices found</td></tr>
                            ) : filteredDevices.map((device) => (
                                <tr key={device.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <HardDrive size={16} className="text-slate-600" />
                                            <span className="text-sm font-bold text-white">{device.deviceName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-400`}>
                                            {device.deviceType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">
                                        {device.protocol ? (
                                            <div className="text-[10px] space-y-0.5 text-slate-400">
                                                <p><span className="text-white font-bold">{device.protocol.configName}</span></p>
                                                <p className="text-[8px] tracking-[0.05em]">{device.protocol.plant?.plantName} / {device.protocol.protocolType}</p>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold  ${device.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {device.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-600 tabular-nums">
                                        {device.createdAt ? new Date(device.createdAt).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button title="Datasheets" onClick={() => router.push(`/devices/datasheets?deviceId=${device.id}`)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <FileText size={14} />
                                            </button>
                                            <button title="Edit" onClick={() => openEditModal(device)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <Pencil size={14} />
                                            </button>
                                            <button title="Delete" onClick={() => handleDelete(device.id)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
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
                                        <h2 className="text-lg font-bold text-white">{editingDevice ? 'Edit Device' : 'New Device'}</h2>
                                        <p className="text-[10px] text-slate-500  tracking-widest">{editingDevice ? 'Update device details' : 'Register a new device'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400  tracking-widest">Protocol Configuration</label>
                                    <select
                                        value={formData.protocolConfigId}
                                        onChange={(e) => setFormData({ ...formData, protocolConfigId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="">Select Protocol Config...</option>
                                        {protocols.map(p => (
                                            <option key={p.id} value={p.id}>{p.configName} ({p.plant?.plantName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400  tracking-widest">Device Type</label>
                                    <select
                                        value={formData.deviceType}
                                        onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="INVERTER">Inverter</option>
                                        <option value="ANALYZER">Analyzer</option>
                                        <option value="RELAY">Relay</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400  tracking-widest">Device Name</label>
                                    <input
                                        type="text"
                                        value={formData.deviceName}
                                        onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        placeholder="e.g. Transformer TR-01"
                                        required
                                    />
                                </div>
                                {editingDevice && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400  tracking-widest">Created Date</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.createdAt}
                                            onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                                    <span className="text-xs font-bold text-slate-400 ">Active Status</span>
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
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold  tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    {isSubmitting ? 'Saving...' : editingDevice ? 'Update Device' : 'Create Device'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DevicesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DevicesContent />
        </Suspense>
    );
}
