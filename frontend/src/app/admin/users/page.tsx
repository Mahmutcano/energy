"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, X, ShieldCheck, Mail, Building2, Trash2, AlertTriangle, Pencil, Key, Shield, UserPlus, Activity, Database, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'NORMAL_USER';
    companyProfileId: string | null;
    companyProfile?: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
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
            console.error('Kullanıcılar getirilemedi:', err);
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
            console.error('Kurumlar getirilemedi:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCompanies();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ email: '', password: '', name: '', role: 'NORMAL_USER', companyProfileId: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email || '',
            password: '',
            name: user.name || '',
            role: user.role || 'NORMAL_USER',
            companyProfileId: user.companyProfile?.id || '',
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Personel dizinden temizlendi');
                setUserToDelete(null);
                fetchUsers();
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'İptal işlemi başarısız';
                toast.error(errorMessage);
                fetchUsers();
            }
        } catch (err) {
            console.error('Silme hatası:', err);
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
            if (editingUser) {
                const res = await apiRequest(`/api/users/${editingUser.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        email: formData.email,
                        name: formData.name,
                        role: formData.role,
                        companyProfileId: formData.companyProfileId || null,
                    })
                });
                if (res.ok) {
                    toast.success('Kimlik bilgileri güncellendi');
                    setIsModalOpen(false);
                    fetchUsers();
                } else {
                    const result = await res.json();
                    toast.error(result.error?.message || result.error || 'Güncelleme başarısız');
                }
            } else {
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
                    toast.success('Personel kaydedildi');
                    setIsModalOpen(false);
                    setFormData({ email: '', password: '', name: '', role: 'NORMAL_USER', companyProfileId: '' });
                    fetchUsers();
                } else {
                    const result = await res.json();
                    toast.error(result.error?.message || result.error || 'Kayıt başarısız');
                }
            }
        } catch (err) {
            console.error('Gönderim hatası:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const getRoleBadgeStyles = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-grafana-accent-red/10 border-grafana-accent-red/30 text-grafana-accent-red';
            case 'COMPANY_ADMIN':
                return 'bg-grafana-accent-orange/10 border-grafana-accent-orange/30 text-grafana-accent-orange';
            default:
                return 'bg-grafana-accent-blue/10 border-grafana-accent-blue/30 text-grafana-accent-blue';
        }
    };

    return (
        <div className="space-y-8 pb-16 font-sans">
            <PageHeader 
                title="PERSONEL" 
                highlightedTitle="DİZİNİ"
                subtitle="Kimlik yönetimi ve erişim yetki seviyeleri"
                icon={Users}
            >
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(87,148,242,0.2)] font-mono whitespace-nowrap"
                >
                    <UserPlus size={14} /> PERSONEL KAYDET
                </button>
            </PageHeader>

            {/* Personel Kaydı */}
            <div className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden">
                <div className="p-4 border-b border-grafana-border bg-grafana-bg/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">Erişim Matrisi</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-sm bg-grafana-accent-blue/10 border border-grafana-accent-blue/20 text-grafana-accent-blue font-mono font-bold">
                            {users.length} KİMLİK EŞLEŞTİ
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                <th>TANIMLAYICI</th>
                                <th>E-POSTA GEÇİDİ</th>
                                <th>YETKİ</th>
                                <th>KURUM</th>
                                <th>ZAMAN DAMGASI</th>
                                <th className="text-right">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 font-mono text-grafana-text-secondary animate-pulse uppercase tracking-widest">Kimlik sunucusu taranıyor...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 font-mono text-grafana-text-secondary uppercase tracking-widest">Yerel sektörde personel kaydı bulunamadı</td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-sm bg-grafana-bg border border-grafana-border flex items-center justify-center text-[10px] font-bold text-grafana-accent-blue font-mono group-hover:border-grafana-accent-blue/50 transition-colors">
                                                {user.name?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-wide">{user.name || 'ANONİM PERSONEL'}</span>
                                                <span className="text-[9px] font-mono text-grafana-text-secondary uppercase tracking-tighter">UID: {user.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Mail size={12} className="text-grafana-text-secondary/50" />
                                            <span className="text-[11px] font-mono text-grafana-text-secondary group-hover:text-grafana-text-primary transition-colors">{user.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-sm border font-mono uppercase tracking-widest",
                                            getRoleBadgeStyles(user.role)
                                        )}>
                                            {user.role === 'SUPER_ADMIN' ? 'KÖK ADMİN' : user.role === 'COMPANY_ADMIN' ? 'KURUM ADMİNİ' : 'KULLANICI'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={12} className="text-grafana-text-secondary/50" />
                                            <span className="text-[11px] font-mono text-grafana-text-primary uppercase">
                                                {user.companyProfile?.name || '---'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col font-mono">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-grafana-text-primary tabular-nums">
                                                <Clock size={10} className="text-grafana-accent-blue" />
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '---'}
                                            </div>
                                            <span className="text-[9px] text-grafana-text-secondary uppercase tracking-tighter ml-4">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                title="Yetkiyi Düzenle" 
                                                onClick={() => openEditModal(user)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                title="Erişimi İptal Et" 
                                                onClick={() => handleDeleteClick(user)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-red hover:border-grafana-accent-red/50 transition-all"
                                            >
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

            {/* Oluştur / Düzenle Modalı */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'KİMLİK YAPILANDIRMA' : 'PERSONEL KAYDI'}
                icon={ShieldCheck}
                maxWidth="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Resmi Ad</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono uppercase"
                            placeholder="PERSONEL ADI"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Ağ Kimliği (E-Posta)</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono lowercase"
                            placeholder="gecit@sektor.net"
                            required
                        />
                    </div>

                    {!editingUser && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Erişim Anahtarı (Parola)</label>
                            <div className="relative group">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Yetki Seviyesi</label>
                            <div className="relative group">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors pointer-events-none" />
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none uppercase"
                                >
                                    <option value="NORMAL_USER">KULLANICI SEVİYESİ</option>
                                    <option value="COMPANY_ADMIN">KURUM ADMİNİ</option>
                                    <option value="SUPER_ADMIN">KÖK ADMİN</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Kurum Ataması</label>
                            <div className="relative group">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors pointer-events-none" />
                                <select
                                    value={formData.companyProfileId}
                                    onChange={(e) => setFormData({ ...formData, companyProfileId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none uppercase"
                                >
                                    <option value="">ATAMA YOK</option>
                                    {companies.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-grafana-accent-blue disabled:opacity-50 text-white font-bold tracking-[0.2em] text-[11px] rounded-sm shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono"
                    >
                        {isSubmitting ? 'KOMUT ÇALIŞTIRILIYOR...' : editingUser ? 'YAPILANDIRMAYI UYGULA' : 'KAYDI TAMAMLA'}
                    </button>
                </form>
            </Modal>

            {/* Silme Onay Modalı */}
            <Modal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                title="ERİŞİMİ İPTAL ET"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4 font-mono">
                    <div className="w-16 h-16 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-grafana-text-primary uppercase tracking-widest">Personel Erişimini İptal Et</h4>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed">
                            <span className="font-bold text-grafana-accent-red">[{userToDelete?.name || userToDelete?.email}]</span> kimliğini kayıtlardan temizlemek istediğinize emin misiniz? Erişim derhal kesilecektir.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setUserToDelete(null)}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm border border-grafana-border bg-grafana-bg text-grafana-text-secondary font-bold text-[10px] hover:bg-grafana-panel transition-colors disabled:opacity-50 tracking-widest uppercase"
                        >
                            İptal
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm bg-grafana-accent-red text-white font-bold text-[10px] hover:bg-grafana-accent-red/90 shadow-lg shadow-grafana-accent-red/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                            {isDeleting ? 'İPTAL EDİLİYOR...' : 'İptali Onayla'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
