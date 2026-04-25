"use client";

import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Plus, 
    Pencil, 
    Trash2, 
    Tag, 
    Cpu, 
    ArrowRight, 
    AlertTriangle, 
    Database,
    Binary,
    Activity,
    ChevronRight,
    Search
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/PageHeader';

interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    updatedBy?: string | null;
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
    const [profileToDelete, setProfileToDelete] = useState<DatasheetProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleCloseModal = React.useCallback(() => {
        setIsModalOpen(false);
    }, []);
    const submittingRef = React.useRef(false);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await apiRequest('/api/datasheet-profiles');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                setProfiles(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Profiller çekilemedi:", err);
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

    const handleDeleteClick = (profile: DatasheetProfile) => {
        setProfileToDelete(profile);
    };

    const confirmDelete = async () => {
        if (!profileToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/datasheet-profiles/${profileToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Profil başarıyla silindi');
                setProfiles(profiles.filter(p => p.id !== profileToDelete.id));
                setProfileToDelete(null);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Silme hatası';
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Silme hatası:', err);
            toast.error('Bir hata oluştu');
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
            const url = editingProfile ? `/api/datasheet-profiles/${editingProfile.id}` : '/api/datasheet-profiles';
            const method = editingProfile ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingProfile ? 'Profil güncellendi' : 'Profil oluşturuldu');
                setIsModalOpen(false);
                fetchProfiles();
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'İşlem başarısız';
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Kaydetme hatası:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const filteredProfiles = profiles.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.protocolType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-24 font-sans selection:bg-grafana-accent-blue/30">
            <PageHeader 
                title="VERİ SAYFASI" 
                highlightedTitle="KAYDI"
                subtitle="Endüstriyel iletişim için hassas mühendislikle hazırlanmış şablonlar"
                icon={FileText}
            >
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors" />
                        <input 
                            type="text" 
                            placeholder="KAYDI FİLTRELE..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-grafana-bg border border-grafana-border rounded-sm py-2 pl-12 pr-6 text-[10px] font-bold tracking-widest text-white focus:outline-none focus:border-grafana-accent-blue/50 transition-all uppercase font-mono"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-black shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all tracking-[0.2em] uppercase font-mono whitespace-nowrap"
                    >
                        <Plus size={16} strokeWidth={3} /> Yeni Veri Sayfası Kaydet
                    </button>
                </div>
            </PageHeader>

            {/* --- GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [1,2,3].map(i => (
                        <div key={i} className="h-64 volt-card animate-pulse bg-white/5 border border-white/10" />
                    ))
                ) : filteredProfiles.length === 0 ? (
                    <div className="col-span-full h-[40vh] flex flex-col items-center justify-center volt-card border-dashed bg-transparent border-white/10">
                        <div className="flex flex-col items-center opacity-20 text-center">
                            <FileText size={64} className="mb-6" />
                            <p className="text-xl font-black tracking-[0.6em] uppercase">Şema Bulunamadı</p>
                            <p className="text-[10px] uppercase tracking-[0.3em] mt-3 leading-relaxed">Kayıt boş. Lütfen yeni bir<br/>telemetri profili başlatın.</p>
                        </div>
                    </div>
                ) : filteredProfiles.map((profile, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={profile.id} 
                        className="volt-card p-10 flex flex-col justify-between group overflow-hidden border-white/5 hover:border-grafana-accent-blue/30 transition-all duration-700 relative"
                    >
                        {/* Arkaplan Efekti */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-grafana-accent-blue/5 blur-3xl group-hover:bg-grafana-accent-blue/10 transition-all duration-700" />
                        
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:border-grafana-accent-blue/50 transition-all duration-500 shadow-xl group-hover:shadow-grafana-accent-blue/10">
                                    {profile.protocolType === 'MODBUS' ? <Binary className="text-amber-500" size={24} /> : <Activity className="text-grafana-accent-blue" size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-grafana-accent-blue transition-colors">{profile.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${profile.protocolType === 'MODBUS' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-grafana-accent-blue shadow-[0_0_8px_#10B981]'}`} />
                                        <span className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">{profile.protocolType} Standart</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                <button onClick={() => openEditModal(profile)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-grafana-accent-blue hover:bg-grafana-accent-blue/10 hover:border-grafana-accent-blue/20 transition-all">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDeleteClick(profile)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#020617]/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase">Kayıt Düğümleri</span>
                                    <div className="flex items-center gap-2">
                                        <Tag size={12} className="text-grafana-accent-blue" />
                                        <span className="text-sm font-black text-white tabular-nums">{profile._count?.points || 0} Nokta</span>
                                    </div>
                                </div>
                                <div className="bg-[#020617]/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase">Bağlı Donanım</span>
                                    <div className="flex items-center gap-2">
                                        <Cpu size={12} className="text-cyan-400" />
                                        <span className="text-sm font-black text-white tabular-nums">{profile._count?.devices || 0} Cihaz</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10 pt-4 border-t border-white/5 mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase">Versiyon Durumu</span>
                                <span className="text-[10px] font-bold text-slate-400">{new Date(profile.updatedAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <button
                                onClick={() => router.push(`/datasheets/points?profileId=${profile.id}&protocolType=${profile.protocolType}`)}
                                className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-grafana-accent-blue group/btn transition-all duration-300 rounded-xl border border-white/5 hover:border-grafana-accent-blue shadow-xl"
                            >
                                <span className="text-[9px] font-black tracking-widest text-slate-400 group-hover/btn:text-[#020617] transition-colors">ŞEMAYA ERİŞ</span>
                                <ArrowRight size={14} className="text-slate-600 group-hover/btn:text-[#020617] group-hover/btn:translate-x-1 transition-all" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* --- MODALLAR --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProfile ? 'Şema Değişikliği' : 'Yeni Kayıt'}
                subtitle="Veri Sayfası Yapılandırması"
                icon={FileText}
                maxWidth="md"
            >
                <form onSubmit={handleSubmit} className="space-y-8 p-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase block">PROFİL ETİKETİ</label>
                        <input
                            type="text"
                            autoFocus
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-sm text-white focus:border-grafana-accent-blue/50 focus:ring-4 focus:ring-grafana-accent-blue/5 outline-none transition-all placeholder:text-slate-700"
                            placeholder="örn. SIEMENS PAC4200"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase block">PROTOKOL STANDARDI</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['MODBUS', 'IEC104'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, protocolType: type })}
                                    className={`py-4 px-6 rounded-2xl border transition-all text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-3 ${
                                        formData.protocolType === type 
                                            ? 'bg-grafana-accent-blue/10 border-grafana-accent-blue/50 text-grafana-accent-blue' 
                                            : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'
                                    }`}
                                >
                                    {type === 'MODBUS' ? <Binary size={14} /> : <Activity size={14} />}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-grafana-accent-blue text-[#020617] font-black tracking-[0.3em] text-[10px] rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all uppercase shadow-2xl shadow-grafana-accent-blue/20"
                        >
                            {isSubmitting ? 'SENKRONİZE EDİLİYOR...' : editingProfile ? 'KAYDI GÜNCELLE' : 'PROFİLİ BAŞLAT'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!profileToDelete}
                onClose={() => setProfileToDelete(null)}
                title="Profili Devreden Çıkar"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <p className="text-lg font-black text-white tracking-tight uppercase">Kalıcı Olarak Silinsin mi?</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Şema <span className="text-white font-bold">{profileToDelete?.name}</span> kayıttan silinecektir. 
                            Tüm bağlı eşleme noktaları devreden çıkarılacaktır.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={() => setProfileToDelete(null)}
                            disabled={isDeleting}
                            className="py-4 px-6 rounded-2xl border border-white/5 text-slate-500 font-black text-[9px] hover:bg-white/5 transition-all tracking-[0.3em] uppercase"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-4 px-6 rounded-2xl bg-red-500 text-white font-black text-[9px] hover:bg-red-600 shadow-2xl shadow-red-500/30 transition-all tracking-[0.3em] uppercase"
                        >
                            {isDeleting ? 'SİLİNİYOR...' : 'SİLMEYİ ONAYLA'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
