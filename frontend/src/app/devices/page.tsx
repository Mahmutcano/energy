"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Cpu, Plus, Search, X, HardDrive, Tag, ToggleLeft, ToggleRight, Network, Pencil, Trash2, FileText, FileJson, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

interface ProtocolConfig {
    id: string;
    configName: string;
    protocolType: string;
    plant?: { plantName: string };
}

interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
}

interface Device {
    id: string;
    protocol_config_id: string;
    datasheet_profile_id?: string;
    deviceName: string;
    deviceType: 'INVERTER' | 'ANALYZER' | 'RELAY';
    isActive: boolean;
    protocol?: ProtocolConfig;
    datasheetProfile?: DatasheetProfile;
    createdAt?: string;
}

function DevicesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialProtocolId = searchParams?.get('protocolId') || '';

    const [devices, setDevices] = useState<Device[]>([]);
    const [protocols, setProtocols] = useState<ProtocolConfig[]>([]);
    const [profiles, setProfiles] = useState<DatasheetProfile[]>([]);
    const [plants, setPlants] = useState<{ id: string; plantName: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        protocolConfigId: initialProtocolId,
        datasheetProfileId: '',
        deviceName: '',
        deviceType: 'INVERTER' as 'INVERTER' | 'ANALYZER' | 'RELAY',
        isActive: true,
        createdAt: ''
    });
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline Modals State
    const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
    const [iscreatingProtocol, setIsCreatingProtocol] = useState(false);
    const [newProtocolData, setNewProtocolData] = useState({
        plantId: '',
        configName: '',
        protocolType: 'MODBUS',
        ipAddress: '127.0.0.1',
        port: 502,
        slaveId: 1
    });

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [newProfileData, setNewProfileData] = useState({
        name: '',
        protocolType: 'MODBUS'
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

    const fetchProfiles = async () => {
        try {
            const res = await apiRequest('/api/datasheet-profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        }
    };

    const fetchPlants = async () => {
        try {
            const res = await apiRequest('/api/plants');
            if (res.ok) setPlants(await res.json());
        } catch (err) {
            console.error('Failed to fetch plants:', err);
        }
    };

    useEffect(() => {
        Promise.all([fetchDevices(), fetchProtocols(), fetchProfiles(), fetchPlants()]);
    }, [initialProtocolId]);


    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({
            protocolConfigId: initialProtocolId || (protocols.length > 0 ? protocols[0].id : ''),
            datasheetProfileId: '',
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
            datasheetProfileId: device.datasheet_profile_id || '',
            deviceName: device.deviceName || '',
            deviceType: device.deviceType || 'INVERTER',
            isActive: device.isActive,
            createdAt: device.createdAt ? new Date(device.createdAt).toISOString().slice(0, 16) : ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (device: Device) => {
        setDeviceToDelete(device);
    };

    const confirmDelete = async () => {
        if (!deviceToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/devices/${deviceToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Device deleted successfully');
                setDeviceToDelete(null);
                fetchDevices();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Delete failed');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('An error occurred');
        } finally {
            setIsDeleting(false);
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
                datasheetProfileId: formData.datasheetProfileId || null,
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
                toast.success(editingDevice ? 'Device updated' : 'Device created');
                setIsModalOpen(false);
                setFormData({
                    protocolConfigId: initialProtocolId,
                    datasheetProfileId: '',
                    deviceName: '',
                    deviceType: 'INVERTER',
                    isActive: true,
                    createdAt: ''
                });
                setEditingDevice(null);
                fetchDevices();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Operation failed');
            }
        } catch (err) {
            console.error('Create/Update error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleCreateProtocol = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingProtocol(true);
        try {
            const body = {
                plantId: newProtocolData.plantId,
                configName: newProtocolData.configName,
                protocolType: newProtocolData.protocolType,
                ...(newProtocolData.protocolType === 'MODBUS' ? {
                    modbusConfig: {
                        ipAddress: newProtocolData.ipAddress,
                        port: Number(newProtocolData.port),
                        slaveId: Number(newProtocolData.slaveId),
                    }
                } : {
                    iec104Config: {
                        ipAddress: newProtocolData.ipAddress,
                        port: Number(newProtocolData.port),
                        asduAddr: Number(newProtocolData.slaveId),
                    }
                })
            };
            const res = await apiRequest('/api/comm-protocols', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const newProto = await res.json();
                toast.success('Protocol created');
                await fetchProtocols();
                setFormData({ ...formData, protocolConfigId: newProto.id });
                setIsProtocolModalOpen(false);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Protocol creation failed');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setIsCreatingProtocol(false);
        }
    };

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingProfile(true);
        try {
            const res = await apiRequest('/api/datasheet-profiles', {
                method: 'POST',
                body: JSON.stringify(newProfileData)
            });
            if (res.ok) {
                const newProf = await res.json();
                toast.success('Datasheet profile created');
                await fetchProfiles();
                setFormData({ ...formData, datasheetProfileId: newProf.id });
                setIsProfileModalOpen(false);
                setNewProfileData({ name: '', protocolType: 'MODBUS' });
            } else {
                const data = await res.json();
                toast.error(data.error || 'Profile creation failed');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setIsCreatingProfile(false);
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
                                <th className="px-6 py-4">Datasheet Profile</th>
                                <th className="px-6 py-4">Status</th>
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
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">
                                        {device.datasheetProfile ? (
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-slate-950 border border-slate-800">
                                                    <FileJson size={14} className="text-brand-green" />
                                                </div>
                                                <span className="text-sm font-bold text-white">{device.datasheetProfile.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600 italic">No Profile Assigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold  ${device.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {device.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button title="Edit" onClick={() => openEditModal(device)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <Pencil size={14} />
                                            </button>
                                            <button title="Delete" onClick={() => handleDeleteClick(device)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
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
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDevice ? 'Edit Device' : 'New Device'}
                subtitle={editingDevice ? 'Update device details' : 'Register a new device'}
                icon={Cpu}
                maxWidth="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Protocol Configuration</label>
                        <select
                            value={formData.protocolConfigId}
                            onChange={(e) => {
                                if (e.target.value === 'ADD_NEW') {
                                    setIsProtocolModalOpen(true);
                                    setNewProtocolData({ ...newProtocolData, plantId: plants.length > 0 ? plants[0].id : '' });
                                } else {
                                    setFormData({ ...formData, protocolConfigId: e.target.value });
                                }
                            }}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                            required
                        >
                            <option value="">Select Protocol Config...</option>
                            {protocols.map(p => (
                                <option key={p.id} value={p.id}>{p.configName} ({p.plant?.plantName})</option>
                            ))}
                            <option value="ADD_NEW" className="font-bold text-brand-green bg-brand-green/10">+ Add New Protocol</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Datasheet Profile</label>
                        <select
                            value={formData.datasheetProfileId}
                            onChange={(e) => {
                                if (e.target.value === 'ADD_NEW') {
                                    setIsProfileModalOpen(true);
                                } else {
                                    setFormData({ ...formData, datasheetProfileId: e.target.value });
                                }
                            }}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                        >
                            <option value="">No Profile Assigned</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.protocolType})</option>
                            ))}
                            <option value="ADD_NEW" className="font-bold text-brand-green bg-brand-green/10">+ Add New Profile</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Device Type</label>
                        <select
                            value={formData.deviceType}
                            onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                            required
                        >
                            <option value="INVERTER">Inverter</option>
                            <option value="ANALYZER">Analyzer</option>
                            <option value="RELAY">Relay</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Device Name</label>
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
                            <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Created Date</label>
                            <input
                                type="datetime-local"
                                value={formData.createdAt}
                                onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Status</span>
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
                        className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold  tracking-widest text-[10px] uppercase rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                    >
                        {isSubmitting ? 'Saving...' : editingDevice ? 'Update Device' : 'Create Device'}
                    </button>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deviceToDelete}
                onClose={() => setDeviceToDelete(null)}
                title="Delete Device"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-white">{deviceToDelete?.deviceName}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setDeviceToDelete(null)}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-lg border border-slate-800 text-slate-400 font-bold text-[10px] hover:bg-slate-900 transition-colors disabled:opacity-50 tracking-widest uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-lg bg-red-500 text-white font-bold text-[10px] hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Inline Protocol Create Modal */}
            <Modal
                isOpen={isProtocolModalOpen}
                onClose={() => setIsProtocolModalOpen(false)}
                title="Add New Protocol"
                icon={Network}
                maxWidth="lg"
                zIndex={250}
            >
                <form onSubmit={handleCreateProtocol} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Plant</label>
                        <select
                            value={newProtocolData.plantId}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, plantId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                            required
                        >
                            {plants.length === 0 && <option value="">Add a Plant First</option>}
                            {plants.map(p => <option key={p.id} value={p.id}>{p.plantName}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Config Name</label>
                        <input
                            type="text"
                            value={newProtocolData.configName}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, configName: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Protocol Type</label>
                        <select
                            value={newProtocolData.protocolType}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, protocolType: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                        >
                            <option value="MODBUS">MODBUS</option>
                            <option value="IEC104">IEC104</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">IP Address</label>
                            <input
                                type="text"
                                value={newProtocolData.ipAddress}
                                onChange={(e) => setNewProtocolData({ ...newProtocolData, ipAddress: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Port</label>
                            <input
                                type="number"
                                value={newProtocolData.port}
                                onChange={(e) => setNewProtocolData({ ...newProtocolData, port: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">{newProtocolData.protocolType === 'MODBUS' ? 'Slave ID' : 'ASDU Address'}</label>
                        <input
                            type="number"
                            value={newProtocolData.slaveId}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, slaveId: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={iscreatingProtocol}
                        className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-[10px] uppercase rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                    >
                        {iscreatingProtocol ? 'Saving...' : 'Save'}
                    </button>
                </form>
            </Modal>

            {/* Inline Profile Create Modal */}
            <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="Add New Profile"
                icon={FileJson}
                maxWidth="sm"
                zIndex={250}
            >
                <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Profile Name</label>
                        <input
                            type="text"
                            value={newProfileData.name}
                            onChange={(e) => setNewProfileData({ ...newProfileData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Protocol Type</label>
                        <select
                            value={newProfileData.protocolType}
                            onChange={(e) => setNewProfileData({ ...newProfileData, protocolType: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                        >
                            <option value="MODBUS">MODBUS</option>
                            <option value="IEC104">IEC104</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isCreatingProfile}
                        className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-[10px] uppercase rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                    >
                        {isCreatingProfile ? 'Saving...' : 'Save'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}

export default function DevicesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
            <DevicesContent />
        </Suspense>
    );
}
