"use client";

import { useState, useEffect } from 'react';
import { Factory, Plus, Search, MapPin, X, Building2, Cpu, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Plant {
    id: string;
    companyId: string;
    plantName: string;
    latitude: number | null;
    longitude: number | null;
    company?: { id: string; name: string };
    protocols?: any[];
    plantType: 'SOLAR' | 'WIND' | 'HYDRO';
    createdAt: string;
}

interface CompanyProfile {
    id: string;
    name: string;
}

export default function PlantsPage() {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [companies, setCompanies] = useState<CompanyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        companyId: '',
        plantName: '',
        latitude: '',
        longitude: '',
        plantType: 'SOLAR' as 'SOLAR' | 'WIND' | 'HYDRO'
    });

    const fetchPlants = async () => {
        try {
            const res = await apiRequest('/api/plants');
            if (res.ok) {
                const data = await res.json();
                setPlants(data);
            }
        } catch (err) {
            console.error('Failed to fetch plants:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await apiRequest('/api/companies');
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    useEffect(() => {
        fetchPlants();
        fetchCompanies();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = {
                companyId: formData.companyId,
                plantName: formData.plantName,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                plantType: formData.plantType,
            };
            const res = await apiRequest('/api/plants', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ companyId: '', plantName: '', latitude: '', longitude: '', plantType: 'SOLAR' });
                fetchPlants();
            }
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Power Plants</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage power plant locations and their connected devices</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> New Plant
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Plants', val: plants.length.toString(), icon: Factory, color: 'text-brand-green' },
                    { label: 'Total Protocols', val: plants.reduce((sum, p) => sum + (p.protocols?.length || 0), 0).toString(), icon: Cpu, color: 'text-blue-400' },
                    { label: 'Companies', val: companies.length.toString(), icon: Building2, color: 'text-amber-400' },
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

            {/* Plants Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full card-base p-12 text-center">
                        <span className="text-sm text-slate-500 animate-pulse">Loading plants...</span>
                    </div>
                ) : plants.length === 0 ? (
                    <div className="col-span-full card-base p-12 text-center">
                        <Factory size={48} className="text-slate-800 mx-auto mb-4" />
                        <p className="text-sm text-slate-500">No plants registered yet</p>
                        <p className="text-xs text-slate-600 mt-1">Click "New Plant" to add your first plant</p>
                    </div>
                ) : plants.map((plant) => (
                    <div key={plant.id} className="card-base p-6 hover:border-brand-green/30 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-brand-green group-hover:bg-brand-green/10 transition-colors">
                                    <Factory size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">{plant.plantName}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{plant.company?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                                <span className="text-[10px] font-bold text-brand-green uppercase">Active</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800/40">
                            <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Protocols</p>
                                <p className="text-sm font-bold text-white tabular-nums">{plant.protocols?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Latitude</p>
                                <p className="text-sm font-mono text-slate-400">{plant.latitude ? Number(plant.latitude).toFixed(4) : '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Longitude</p>
                                <p className="text-sm font-mono text-slate-400">{plant.longitude ? Number(plant.longitude).toFixed(4) : '—'}</p>
                            </div>
                        </div>
                    </div>
                ))}
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
                                        <Factory size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">New Plant</h2>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Register a new power plant</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company</label>
                                    <select
                                        value={formData.companyId}
                                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="">Select Company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plant Name</label>
                                    <input
                                        type="text"
                                        value={formData.plantName}
                                        onChange={(e) => setFormData({ ...formData, plantName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        placeholder="e.g. Solar Plant Alpha"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type</label>
                                    <select
                                        value={formData.plantType}
                                        onChange={(e) => setFormData({ ...formData, plantType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="SOLAR">Solar Power</option>
                                        <option value="WIND">Wind Farm</option>
                                        <option value="HYDRO">Hydroelectric</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.latitude}
                                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                            placeholder="38.4237"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.longitude}
                                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none tabular-nums"
                                            placeholder="27.1428"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-brand-green text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    Create Plant
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
