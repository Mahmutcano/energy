"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { FileText, Plus, Search, X, Tag, ToggleLeft, ToggleRight, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

interface Device {
    id: string;
    deviceName: string;
    protocol?: {
        protocolType: string;
    }
}

interface DataSheet {
    id: string;
    dataName: string;
    dataValue: string | null;
    registerAddress: number | null;
    isActive: boolean;
    functionCode: number | null;
    multiplier: number | null;
    wordSwap: boolean | null;
    feederName: string | null;
    signalType: string | null;
    signalDescription: string | null;
    dataType: string | null;
    signalSource: string | null;
    componentId: string | null;
    componentText: string | null;
    ioa1ObjectAddress: number | null;
    ioa2CellNo: number | null;
    ioa3VoltageLevel: number | null;
    scadaAddress: number | null;
}

const defaultFormData = {
    dataName: '',
    dataValue: '',
    registerAddress: '',
    isActive: true,
    functionCode: '',
    multiplier: '',
    wordSwap: false,
    feederName: '',
    signalType: '',
    signalDescription: '',
    dataType: '',
    signalSource: '',
    componentId: '',
    componentText: '',
    ioa1ObjectAddress: '',
    ioa2CellNo: '',
    ioa3VoltageLevel: '',
    scadaAddress: '',
};

function DataSheetsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const deviceId = searchParams?.get('deviceId') || '';

    const [device, setDevice] = useState<Device | null>(null);
    const [dataSheets, setDataSheets] = useState<DataSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSheet, setEditingSheet] = useState<DataSheet | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState(defaultFormData);
    const submittingRef = React.useRef(false);

    useEffect(() => {
        if (!deviceId) return;

        const fetchData = async () => {
            try {
                const devRes = await apiRequest('/api/devices');
                if (devRes.ok) {
                    const devs = await devRes.json();
                    const d = devs.find((x: any) => x.id === deviceId);
                    if (d) setDevice(d);
                }

                const sheetRes = await apiRequest(`/api/datasheets?deviceId=${deviceId}`);
                if (sheetRes.ok) {
                    const sheets = await sheetRes.json();
                    setDataSheets(sheets);
                }
            } catch (err) {
                console.error("Failed to fetch datasheets:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [deviceId]);

    const protocolType = device?.protocol?.protocolType || 'MODBUS';
    const isModbus = protocolType === 'MODBUS';

    const openCreateModal = () => {
        setEditingSheet(null);
        setFormData(defaultFormData);
        setIsModalOpen(true);
    };

    const openEditModal = (sheet: DataSheet) => {
        setEditingSheet(sheet);
        setFormData({
            dataName: sheet.dataName || '',
            dataValue: sheet.dataValue || '',
            registerAddress: sheet.registerAddress?.toString() || '',
            isActive: sheet.isActive ?? true,
            functionCode: sheet.functionCode?.toString() || '',
            multiplier: sheet.multiplier?.toString() || '',
            wordSwap: sheet.wordSwap ?? false,
            feederName: sheet.feederName || '',
            signalType: sheet.signalType || '',
            signalDescription: sheet.signalDescription || '',
            dataType: sheet.dataType || '',
            signalSource: sheet.signalSource || '',
            componentId: sheet.componentId || '',
            componentText: sheet.componentText || '',
            ioa1ObjectAddress: sheet.ioa1ObjectAddress?.toString() || '',
            ioa2CellNo: sheet.ioa2CellNo?.toString() || '',
            ioa3VoltageLevel: sheet.ioa3VoltageLevel?.toString() || '',
            scadaAddress: sheet.scadaAddress?.toString() || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this datasheet item?')) return;
        try {
            const res = await apiRequest(`/api/datasheets/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setDataSheets(dataSheets.filter(s => s.id !== id));
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
            const num = (val: string) => val ? parseFloat(val) : undefined;
            const int = (val: string) => val ? parseInt(val, 10) : undefined;

            const body: any = {
                device_id: deviceId,
                dataName: formData.dataName,
                dataValue: formData.dataValue || undefined,
                registerAddress: int(formData.registerAddress),
                isActive: formData.isActive,
            };

            if (isModbus) {
                body.functionCode = int(formData.functionCode);
                body.multiplier = num(formData.multiplier);
                body.wordSwap = formData.wordSwap;
            } else {
                body.feederName = formData.feederName || null;
                body.signalType = formData.signalType || null;
                body.signalDescription = formData.signalDescription || null;
                body.dataType = formData.dataType || null;
                body.signalSource = formData.signalSource || null;
                body.componentId = formData.componentId || null;
                body.componentText = formData.componentText || null;
                body.ioa1ObjectAddress = int(formData.ioa1ObjectAddress);
                body.ioa2CellNo = int(formData.ioa2CellNo);
                body.ioa3VoltageLevel = int(formData.ioa3VoltageLevel);
                body.scadaAddress = int(formData.scadaAddress);
            }

            const url = editingSheet ? `/api/datasheets/${editingSheet.id}` : '/api/datasheets';
            const method = editingSheet ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData(defaultFormData);
                setEditingSheet(null);
                const newData = await res.json();
                if (method === 'POST') {
                    setDataSheets([...dataSheets, newData]);
                } else {
                    setDataSheets(dataSheets.map(s => s.id === newData.id ? newData : s));
                }
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

    const filteredSheets = dataSheets.filter(s =>
        s.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.signalDescription && s.signalDescription.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!deviceId) {
        return <div className="p-8 text-white">Device ID is required to view datasheets.</div>;
    }

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">
                            {device ? `${device.deviceName} Datasheet` : 'Loading...'}
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-16">Manage data points for this device ({protocolType})</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> Add Point
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
                        placeholder="Search by name or description..."
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card-base overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500 tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Data Name</th>
                                {isModbus ? (
                                    <>
                                        <th className="px-6 py-4">Address</th>
                                        <th className="px-6 py-4">Func</th>
                                        <th className="px-6 py-4">Multiplier</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4">IOA</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">SCADA Addr</th>
                                    </>
                                )}
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading datasheets...</td></tr>
                            ) : filteredSheets.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No datasheet points found</td></tr>
                            ) : filteredSheets.map((sheet) => (
                                <tr key={sheet.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Tag size={16} className="text-slate-600" />
                                            <span className="text-sm font-bold text-white">{sheet.dataName}</span>
                                        </div>
                                    </td>
                                    {isModbus ? (
                                        <>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">{sheet.registerAddress ?? '-'}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">{sheet.functionCode ?? '-'}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">{sheet.multiplier ?? '-'}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">{sheet.ioa1ObjectAddress ?? '-'}</td>
                                            <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate">{sheet.signalDescription ?? '-'}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 tabular-nums">{sheet.scadaAddress ?? '-'}</td>
                                        </>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sheet.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold ${sheet.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {sheet.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button title="Edit" onClick={() => openEditModal(sheet)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <Pencil size={14} />
                                            </button>
                                            <button title="Delete" onClick={() => handleDelete(sheet.id)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-2xl bg-slate-950 border-slate-800 overflow-hidden shadow-2xl my-8 mt-24"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <FileText size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{editingSheet ? 'Edit Point' : 'Add Point'}</h2>
                                        <p className="text-[10px] text-slate-500 tracking-widest">{protocolType} Data Point</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                {/* Base Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 tracking-widest">Data Name</label>
                                        <input
                                            type="text"
                                            value={formData.dataName}
                                            onChange={(e) => setFormData({ ...formData, dataName: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            placeholder="e.g. Current L1"
                                            required
                                        />
                                    </div>
                                    {isModbus && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Register Address</label>
                                            <input
                                                type="number"
                                                value={formData.registerAddress}
                                                onChange={(e) => setFormData({ ...formData, registerAddress: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                                placeholder="e.g. 40001"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Modbus Fields */}
                                {isModbus && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Function Code</label>
                                            <select
                                                value={formData.functionCode}
                                                onChange={(e) => setFormData({ ...formData, functionCode: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            >
                                                <option value="">Select Function</option>
                                                <option value="1">1 - Read Coils</option>
                                                <option value="2">2 - Read Discrete Inputs</option>
                                                <option value="3">3 - Read Holding Registers</option>
                                                <option value="4">4 - Read Input Registers</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Multiplier</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={formData.multiplier}
                                                onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                                placeholder="e.g. 0.1"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                                            <span className="text-xs font-bold text-slate-400">Word Swap</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, wordSwap: !formData.wordSwap })}
                                                className={formData.wordSwap ? "text-brand-green" : "text-slate-600"}
                                            >
                                                {formData.wordSwap ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* IEC104 Fields */}
                                {!isModbus && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Signal Description</label>
                                            <input
                                                type="text"
                                                value={formData.signalDescription}
                                                onChange={(e) => setFormData({ ...formData, signalDescription: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                                placeholder="e.g. Breaker Status"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">IOA 1 (Object Addr)</label>
                                            <input
                                                type="number"
                                                value={formData.ioa1ObjectAddress}
                                                onChange={(e) => setFormData({ ...formData, ioa1ObjectAddress: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                                placeholder="e.g. 1001"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">SCADA Address</label>
                                            <input
                                                type="number"
                                                value={formData.scadaAddress}
                                                onChange={(e) => setFormData({ ...formData, scadaAddress: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                                placeholder="e.g. 500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Data Type</label>
                                            <input
                                                type="text"
                                                value={formData.dataType}
                                                onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                                placeholder="e.g. M_ME_NC_1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Feeder/Cell Name</label>
                                            <input
                                                type="text"
                                                value={formData.feederName}
                                                onChange={(e) => setFormData({ ...formData, feederName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">IOA 2 (Cell No)</label>
                                            <input
                                                type="number"
                                                value={formData.ioa2CellNo}
                                                onChange={(e) => setFormData({ ...formData, ioa2CellNo: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">IOA 3 (Voltage Lvl)</label>
                                            <input
                                                type="number"
                                                value={formData.ioa3VoltageLevel}
                                                onChange={(e) => setFormData({ ...formData, ioa3VoltageLevel: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Signal Source</label>
                                            <input
                                                type="text"
                                                value={formData.signalSource}
                                                onChange={(e) => setFormData({ ...formData, signalSource: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Component ID</label>
                                            <input
                                                type="text"
                                                value={formData.componentId}
                                                onChange={(e) => setFormData({ ...formData, componentId: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 tracking-widest">Component Text</label>
                                            <input
                                                type="text"
                                                value={formData.componentText}
                                                onChange={(e) => setFormData({ ...formData, componentText: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                                    <span className="text-xs font-bold text-slate-400">Active Status</span>
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
                                    className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    {isSubmitting ? 'Saving...' : editingSheet ? 'Update Point' : 'Create Point'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DataSheetsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
            <DataSheetsContent />
        </Suspense>
    );
}
