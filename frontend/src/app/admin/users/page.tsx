"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, X, ShieldCheck, Mail, Building2, Trash2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'NORMAL_USER';
    companyProfileId: string | null;
    companyProfile?: { id: string; name: string } | null;
    createdAt?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'NORMAL_USER' as 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'NORMAL_USER',
        companyProfileId: '',
    });
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const submittingRef = React.useRef(false);

    const fetchUsers = async () => {
        try {
            const res = await apiRequest('/api/users');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await apiRequest('/api/companies');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                setCompanies(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCompanies();
    }, []);

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Kullanıcı başarıyla silindi');
                setUserToDelete(null);
                fetchUsers();
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const res = await apiRequest('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role,
                    companyProfileId: formData.companyProfileId || null,
                })
            });
            if (res.ok) {
                toast.success('Kullanıcı başarıyla oluşturuldu');
                setIsModalOpen(false);
                setFormData({ email: '', password: '', name: '', role: 'NORMAL_USER', companyProfileId: '' });
                fetchUsers();
            }
        } catch (err) {
            console.error('Create error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const roleColors: Record<string, string> = {
        SUPER_ADMIN: 'text-red-400 bg-red-500/10 border-red-500/20',
        COMPANY_ADMIN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        NORMAL_USER: 'text-brand-green bg-brand-green/10 border-brand-green/20',
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">User Management</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage system users and role assignments</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all  tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> New User
                </button>
            </div>

            {/* User Table */}
            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-brand-green">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white ">User Registry</h3>
                            <p className="text-[10px] text-slate-500">{users.length} users</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500  tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No users found</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-white ">
                                                {user.name?.substring(0, 2) || 'N/A'}
                                            </div>
                                            <span className="text-sm font-bold text-white">{user.name || 'Unnamed'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold  border ${roleColors[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {user.companyProfile?.name || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            <button title="Delete" onClick={() => handleDeleteClick(user)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
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

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="New User"
                subtitle="Create user account"
                icon={ShieldCheck}
                maxWidth="lg"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            placeholder="Full name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            placeholder="user@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                            >
                                <option value="NORMAL_USER">Customer / User</option>
                                <option value="COMPANY_ADMIN">Company Admin</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400  tracking-widest uppercase">Company</label>
                            <select
                                value={formData.companyProfileId}
                                onChange={(e) => setFormData({ ...formData, companyProfileId: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none appearance-none"
                            >
                                <option value="">None</option>
                                {companies.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold  tracking-widest text-[10px] uppercase rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                    >
                        {isSubmitting ? 'Creating...' : 'Create User'}
                    </button>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                title="Delete User"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-white">{userToDelete?.name || userToDelete?.email}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setUserToDelete(null)}
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
        </div>
    );
}
