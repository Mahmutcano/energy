"use client";

import { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, Factory, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyProfile {
    id: string;
    name: string;
    address: string | null;
    isActive: boolean;
    plants?: any[];
    users?: any[];
    createdAt: string;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<CompanyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        isActive: true,
    });

    const fetchCompanies = async () => {
        try {
            const res = await apiRequest('/api/companies');
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiRequest('/api/companies', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address || null,
                    isActive: formData.isActive,
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', address: '', isActive: true });
                fetchCompanies();
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
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Company Profiles</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage company profiles and their associated plants and users</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> New Company
                </button>
            </div>

            {/* Company Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full card-base p-12 text-center">
                        <span className="text-sm text-slate-500 animate-pulse">Loading companies...</span>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="col-span-full card-base p-12 text-center">
                        <Building2 size={48} className="text-slate-800 mx-auto mb-4" />
                        <p className="text-sm text-slate-500">No companies registered</p>
                    </div>
                ) : companies.map((company) => (
                    <div key={company.id} className="card-base p-6 hover:border-brand-green/30 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-brand-green group-hover:bg-brand-green/10 transition-colors">
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{company.name}</h3>
                                    {company.address && (
                                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{company.address}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${company.isActive ? 'bg-brand-green' : 'bg-slate-700'}`} />
                                <span className={`text-[10px] font-bold uppercase ${company.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                    {company.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800/40">
                            <div className="flex items-center gap-2">
                                <Factory size={14} className="text-slate-600" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Plants</p>
                                    <p className="text-sm font-bold text-white tabular-nums">{company.plants?.length || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-600" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Users</p>
                                    <p className="text-sm font-bold text-white tabular-nums">{company.users?.length || 0}</p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                    <Pencil size={14} />
                                </button>
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
                                        <Building2 size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">New Company</h2>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Register a new company profile</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        placeholder="e.g. Enerji Corp."
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none resize-none h-24"
                                        placeholder="Company address (optional)"
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
                                    Create Company
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
