"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Pencil, Trash2, Tag, Cpu, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
    _count?: {
        points: number;
        devices: number;
    }
}

export default function DatasheetProfilesPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<DatasheetProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProfile, setEditingProfile] = useState<DatasheetProfile | null>(null);
    const [formData, setFormData] = useState({ name: '', protocolType: 'MODBUS' });
    const submittingRef = React.useRef(false);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await apiRequest('/api/datasheet-profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (err) {
            console.error("Failed to fetch profiles:", err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingProfile(null);
        setFormData({ name: '', protocolType: 'MODBUS' });
        setIsModalOpen(true);
    };

    const openEditModal = (profile: DatasheetProfile) => {
        setEditingProfile(profile);
        setFormData({ name: profile.name, protocolType: profile.protocolType });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this profile? Note: It must not be assigned to any devices.')) return;
        try {
            const res = await apiRequest(`/api/datasheet-profiles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setProfiles(profiles.filter(p => p.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || 'Operation failed');
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
            const url = editingProfile ? `/api/datasheet-profiles/${editingProfile.id}` : '/api/datasheet-profiles';
            const method = editingProfile ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchProfiles();
            } else {
                const data = await res.json();
                alert(data.error || 'Operation failed');
            }
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Datasheet Profiles</h1>
                    </div>
                    <p className="text-sm text-slate-500">Create device data templates once, assign them to multiple devices.</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> Add Profile
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full p-8 text-center text-slate-500 animate-pulse">Loading profiles...</div>
                ) : profiles.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500">No profiles found.</div>
                ) : profiles.map(profile => (
                    <div key={profile.id} className="flex flex-col p-6 card-base bg-slate-900/40 border border-slate-800/40 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                    <FileText size={24} className="text-brand-green" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{profile.name}</h3>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        {profile.protocolType} PROTOCOL
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button title="Edit" onClick={() => openEditModal(profile)} className="p-2 rounded-md bg-slate-900 hover:text-brand-green transition-colors text-slate-400">
                                    <Pencil size={14} />
                                </button>
                                <button title="Delete" onClick={() => handleDelete(profile.id)} className="p-2 rounded-md bg-slate-900 hover:text-red-500 transition-colors text-slate-400">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-6 bg-slate-950/50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <Tag size={14} /> {profile._count?.points || 0} Data Points
                            </div>
                            <div className="flex items-center gap-2">
                                <Cpu size={14} /> {profile._count?.devices || 0} Devices Linked
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`/datasheets/points?profileId=${profile.id}&protocolType=${profile.protocolType}`)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800/40 hover:bg-brand-green hover:text-white transition-all rounded-xl text-xs font-bold tracking-widest text-slate-400 border border-slate-800 hover:border-brand-green"
                        >
                            Manage Data Points <ArrowRight size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-md bg-slate-950 border-slate-800 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                                <h2 className="text-lg font-bold text-white">{editingProfile ? 'Edit Profile' : 'Create Profile'}</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 tracking-widest">Profile Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        placeholder="e.g. Huawei SUN2000"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 tracking-widest">Protocol Type</label>
                                    <select
                                        value={formData.protocolType}
                                        onChange={(e) => setFormData({ ...formData, protocolType: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                        required
                                    >
                                        <option value="MODBUS">MODBUS</option>
                                        <option value="IEC104">IEC 104</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-brand-green text-white font-bold tracking-widest text-xs rounded-xl hover:scale-[1.01] transition-all"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Profile'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-3 bg-transparent text-slate-500 font-bold tracking-widest text-xs hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
