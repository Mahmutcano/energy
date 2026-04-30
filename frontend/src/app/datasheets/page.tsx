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
    Search,
    Clock,
    History
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';

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
        <div className="space-y-8 pb-24 font-sans selection:bg-grafana-accent-blue/30">
            <PageHeader 
                title="VERİ SAYFASI" 
                highlightedTitle="YÖNETİMİ"
                subtitle="Endüstriyel telemetri şablonları ve cihaz profil kütüphanesi"
                icon={FileText}
            >
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors" />
                        <input 
                            type="text" 
                            placeholder="ARAMA..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-grafana-bg border border-grafana-border rounded-sm py-1.5 pl-9 pr-4 text-[10px] font-bold tracking-widest text-white focus:outline-none focus:border-grafana-accent-blue transition-all uppercase font-mono w-48"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-bold shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all tracking-widest uppercase font-mono"
                    >
                        <Plus size={14} strokeWidth={3} /> YENİ ŞABLON
                    </button>
                </div>
            </PageHeader>

            {/* --- GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    [1,2,3].map(i => (
                        <div key={i} className="h-48 card-base animate-pulse bg-grafana-panel/50 border border-grafana-border" />
                    ))
                ) : filteredProfiles.length === 0 ? (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center card-base border-dashed border-grafana-border bg-transparent">
                        <div className="flex flex-col items-center opacity-20 text-center gap-4">
                            <FileText size={48} />
                            <p className="text-xs font-bold tracking-[0.4em] uppercase font-mono">ŞABLON BULUNAMADI</p>
                        </div>
                    </div>
                ) : filteredProfiles.map((profile, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={profile.id} 
                        className="card-base group hover:border-grafana-accent-blue/50 transition-all duration-300"
                    >
                        <div className="p-6 space-y-6">
                            {/* Header Section */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-sm border flex items-center justify-center transition-all duration-300",
                                        profile.protocolType === 'MODBUS' 
                                            ? "bg-grafana-accent-orange/5 border-grafana-accent-orange/20 text-grafana-accent-orange" 
                                            : "bg-grafana-accent-green/5 border-grafana-accent-green/20 text-grafana-accent-green"
                                    )}>
                                        {profile.protocolType === 'MODBUS' ? <Binary size={20} /> : <Activity size={20} />}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[13px] font-bold text-white tracking-tight uppercase group-hover:text-grafana-accent-blue transition-colors font-mono">{profile.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">{profile.protocolType}</span>
                                            <div className="w-1 h-1 rounded-full bg-grafana-border" />
                                            <span className="text-[9px] font-bold text-grafana-text-secondary tracking-widest uppercase font-mono">STANDART</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(profile)} className="p-1.5 text-grafana-text-secondary hover:text-grafana-accent-blue transition-all">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteClick(profile)} className="p-1.5 text-grafana-text-secondary hover:text-grafana-accent-red transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-grafana-bg border border-grafana-border p-3 rounded-sm flex items-center gap-3">
                                    <Tag size={12} className="text-grafana-accent-blue" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-grafana-text-secondary uppercase font-mono">NOKTALAR</span>
                                        <span className="text-[11px] font-bold text-white font-mono">{profile._count?.points || 0} ADET</span>
                                    </div>
                                </div>
                                <div className="bg-grafana-bg border border-grafana-border p-3 rounded-sm flex items-center gap-3">
                                    <Cpu size={12} className="text-grafana-accent-green" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-grafana-text-secondary uppercase font-mono">CİHAZLAR</span>
                                        <span className="text-[11px] font-bold text-white font-mono">{profile._count?.devices || 0} ADET</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Section */}
                            <div className="flex items-center justify-between pt-4 border-t border-grafana-border">
                                <div className="flex items-center gap-2">
                                    <Clock size={10} className="text-grafana-text-secondary" />
                                    <span className="text-[9px] font-bold text-grafana-text-secondary font-mono">
                                        {new Date(profile.updatedAt).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => router.push(`/datasheets/points?profileId=${profile.id}&protocolType=${profile.protocolType}`)}
                                    className="flex items-center gap-2 text-[9px] font-bold text-grafana-accent-blue hover:text-white transition-all uppercase tracking-widest font-mono group/btn"
                                >
                                    AYRINTILAR <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* --- MODALS --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProfile ? 'ŞEMA DÜZENLE' : 'YENİ ŞABLON'}
                subtitle="Veri Sayfası Tanımlama"
                icon={FileText}
                maxWidth="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-tech-label block ml-1">PROFİL ETİKETİ</label>
                        <input
                            type="text"
                            autoFocus
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue outline-none font-mono"
                            placeholder="ÖRN: SIEMENS_PAC4200"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-tech-label block ml-1">PROTOKOL STANDARDI</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['MODBUS', 'IEC104'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, protocolType: type })}
                                    className={cn(
                                        "py-3 px-4 rounded-sm border transition-all text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-3 font-mono",
                                        formData.protocolType === type 
                                            ? 'bg-grafana-accent-blue/10 border-grafana-accent-blue/50 text-grafana-accent-blue' 
                                            : 'bg-grafana-bg border-grafana-border text-grafana-text-secondary hover:text-white'
                                    )}
                                >
                                    {type === 'MODBUS' ? <Binary size={14} /> : <Activity size={14} />}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-grafana-accent-blue text-white font-bold tracking-widest text-[11px] rounded-sm hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono shadow-lg shadow-grafana-accent-blue/20"
                        >
                            {isSubmitting ? 'İŞLENİYOR...' : editingProfile ? 'KAYDI GÜNCELLE' : 'PROFİLİ OLUŞTUR'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!profileToDelete}
                onClose={() => setProfileToDelete(null)}
                title="ŞABLON SİLİNECEK"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 rounded-sm bg-grafana-accent-red/5 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2 px-4">
                        <p className="text-sm font-bold text-white tracking-tight uppercase font-mono">{profileToDelete?.name}</p>
                        <p className="text-[10px] text-grafana-text-secondary leading-relaxed font-bold uppercase tracking-wider font-mono">
                            Bu şablon silindiğinde tüm bağlı eşleme noktaları devreden çıkarılacaktır. İşlem geri alınamaz.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={() => setProfileToDelete(null)}
                            disabled={isDeleting}
                            className="py-3 px-6 rounded-sm border border-grafana-border text-grafana-text-secondary font-bold text-[10px] hover:bg-grafana-panel transition-all tracking-widest uppercase font-mono"
                        >
                            VAZGEÇ
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-3 px-6 rounded-sm bg-grafana-accent-red text-white font-bold text-[10px] hover:bg-grafana-accent-red/90 shadow-lg shadow-grafana-accent-red/20 transition-all tracking-widest uppercase font-mono"
                        >
                            {isDeleting ? 'SİLİNİYOR...' : 'SİLMEYİ ONAYLA'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
