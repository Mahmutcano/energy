"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Factory, Plus, Search, MapPin, X, Building2, Cpu, Activity, Pencil, Trash2, Settings, AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PlantForm, { PlantFormData } from '@/components/forms/PlantForm';
import CompanyForm, { CompanyFormData } from '@/components/forms/CompanyForm';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface Plant {
    id: string;
    companyId: string;
    plantName: string;
    latitude: number | null;
    longitude: number | null;
    company?: { id: string; name: string };
    protocols?: any[];
    plantType: 'SOLAR' | 'WIND' | 'HYDRO';
    isActive: boolean;
    ytbsCode: string;
    canSendYtbs: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}

interface CompanyProfile {
    id: string;
    name: string;
}

const defaultFormData = {
    companyId: '',
    plantName: '',
    latitude: '',
    longitude: '',
    plantType: 'SOLAR' as 'SOLAR' | 'WIND' | 'HYDRO',
    ytbsCode: '',
    canSendYtbs: false
};

function PlantsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialCompanyId = searchParams?.get('companyId') || '';

    const [plants, setPlants] = useState<Plant[]>([]);
    const [companies, setCompanies] = useState<CompanyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
    const [formData, setFormData] = useState({ ...defaultFormData, companyId: initialCompanyId });
    const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline Company Creation State
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);

    const submittingRef = React.useRef(false);

    const fetchPlants = async () => {
        try {
            const res = await apiRequest('/api/plants');
            if (res.ok) {
                const result = await res.json();
                let data = (result && result.success) ? result.data : result;
                if (!Array.isArray(data)) data = [];
                
                if (initialCompanyId) {
                    data = data.filter((p: Plant) => p.companyId === initialCompanyId);
                }
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
                const result = await res.json();
                const data = (result && result.success) ? result.data : result;
                setCompanies(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    useEffect(() => {
        Promise.all([fetchPlants(), fetchCompanies()]);
    }, [initialCompanyId]);

    const openCreateModal = () => {
        setEditingPlant(null);
        setFormData({ ...defaultFormData, companyId: initialCompanyId || (companies.length > 0 ? companies[0].id : '') });
        setIsModalOpen(true);
    };

    const openEditModal = (plant: Plant) => {
        setEditingPlant(plant);
        setFormData({
            companyId: plant.companyId || '',
            plantName: plant.plantName || '',
            latitude: plant.latitude ? plant.latitude.toString() : '',
            longitude: plant.longitude ? plant.longitude.toString() : '',
            plantType: plant.plantType || 'SOLAR',
            ytbsCode: plant.ytbsCode || '',
            canSendYtbs: plant.canSendYtbs || false
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (plant: Plant) => {
        setPlantToDelete(plant);
    };

    const confirmDelete = async () => {
        if (!plantToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/plants/${plantToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Plant decommissioned successfully');
                setPlantToDelete(null);
                fetchPlants();
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePlantSubmit = async (data: PlantFormData) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const body = {
                companyId: data.companyId,
                plantName: data.plantName,
                latitude: data.latitude ? parseFloat(data.latitude) : null,
                longitude: data.longitude ? parseFloat(data.longitude) : null,
                plantType: data.plantType,
                ytbsCode: data.ytbsCode,
                canSendYtbs: data.canSendYtbs,
            };

            const url = editingPlant ? `/api/plants/${editingPlant.id}` : '/api/plants';
            const method = editingPlant ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingPlant ? 'Plant parameters updated' : 'New plant registered');
                setIsModalOpen(false);
                setEditingPlant(null);
                fetchPlants();
            }
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleCompanySubmit = async (data: CompanyFormData) => {
        setIsCreatingCompany(true);
        try {
            const body = {
                ...data,
                taxNumber: data.taxNumber ? parseInt(data.taxNumber) : null,
            };
            const res = await apiRequest('/api/companies', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const result = await res.json();
                const newCompany = (result && result.success) ? result.data : result;
                const companyId = newCompany.id || newCompany;
                toast.success('Company entity created');
                await fetchCompanies();
                setEditingPlant(prev => prev ? { ...prev, companyId : (typeof companyId === 'string' ? companyId : companyId.id) } : null);
                setFormData(prev => ({ ...prev, companyId: (typeof companyId === 'string' ? companyId : companyId.id) }));
                setIsCompanyModalOpen(false);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Company creation failed');
            }
        } catch (err) {
            console.error('Create company error:', err);
            toast.error('An error occurred');
        } finally {
            setIsCreatingCompany(false);
        }
    };

    return (
        <div className="space-y-8 pb-16 font-sans">
            <PageHeader 
                title="ALTYAPI" 
                highlightedTitle="DÜĞÜMLERİ"
                subtitle="Fiziksel varlıklar ve saha yapılandırma matrisi"
                icon={Factory}
            >
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(87,148,242,0.2)] font-mono"
                >
                    <Plus size={14} /> YENİ DÜĞÜM TANIMLA
                </button>
            </PageHeader>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Aktif Sahalar', val: plants.length, icon: Factory, color: 'text-grafana-accent-green' },
                    { label: 'Toplam Protokol', val: plants.reduce((sum, p) => sum + (p.protocols?.length || 0), 0), icon: Cpu, color: 'text-grafana-accent-blue' },
                    { label: 'Kurumlar', val: companies.length, icon: Building2, color: 'text-grafana-accent-orange' },
                ].map((stat, i) => (
                    <div key={i} className="card-base p-5 bg-grafana-panel/50 flex items-center gap-4 border border-grafana-border">
                        <div className={cn("p-2.5 rounded-sm bg-grafana-bg border border-grafana-border", stat.color)}>
                            <stat.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-grafana-text-primary font-mono tabular-nums leading-none">{stat.val.toString().padStart(2, '0')}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plants Table View */}
            <div className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden">
                <div className="p-4 border-b border-grafana-border bg-grafana-bg/50 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">Kayıtlı Varlık Matrisi</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-grafana-bg border border-grafana-border rounded-sm text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">
                        <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green animate-pulse" /> Canlı Sistem
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                <th>TANIMLAYICI</th>
                                <th>KURUM</th>
                                <th>TİP</th>
                                <th>YTBS DURUMU</th>
                                <th>KOORDİNATLAR</th>
                                <th>KAPASİTE</th>
                                <th className="text-right">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 font-mono text-grafana-text-secondary animate-pulse uppercase tracking-widest">Saha düğümleri taranıyor...</td>
                                </tr>
                            ) : plants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 font-mono text-grafana-text-secondary uppercase tracking-widest">Kayıtlı saha bulunamadı</td>
                                </tr>
                            ) : plants.map((plant) => (
                                <tr key={plant.id} className="group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-grafana-accent-blue rounded-full group-hover:shadow-[0_0_10px_#5794f2] transition-all" />
                                            <div className="flex flex-col">
                                                <span className="text-grafana-text-primary font-bold uppercase tracking-wide">{plant.plantName}</span>
                                                <span className="text-[9px] font-mono text-grafana-text-secondary/50">UUID: {plant.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={12} className="text-grafana-text-secondary/50" />
                                            <span className="font-mono text-[11px] text-grafana-text-secondary">{plant.company?.name || 'ROOT'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={cn(
                                            "text-[9px] font-bold px-2 py-0.5 rounded-sm border font-mono uppercase tracking-widest",
                                            plant.plantType === 'SOLAR' ? "bg-grafana-accent-orange/10 border-grafana-accent-orange/30 text-grafana-accent-orange" :
                                            plant.plantType === 'WIND' ? "bg-grafana-accent-blue/10 border-grafana-accent-blue/30 text-grafana-accent-blue" :
                                            "bg-grafana-accent-green/10 border-grafana-accent-green/30 text-grafana-accent-green"
                                        )}>
                                            {plant.plantType === 'SOLAR' ? 'GÜNEŞ' : plant.plantType === 'WIND' ? 'RÜZGAR' : 'HİDRO'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", plant.canSendYtbs ? "bg-grafana-accent-green shadow-[0_0_8px_#73bf69]" : "bg-grafana-text-secondary/30")} />
                                            <span className={cn("text-[10px] font-bold font-mono uppercase", plant.canSendYtbs ? "text-grafana-accent-green" : "text-grafana-text-secondary/50")}>
                                                {plant.canSendYtbs ? 'AKTARILIYOR' : 'BEKLEMEDE'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-[10px] font-mono text-grafana-text-secondary">
                                            {plant.latitude ? Number(plant.latitude).toFixed(4) : '0.0000'}, {plant.longitude ? Number(plant.longitude).toFixed(4) : '0.0000'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold font-mono text-grafana-text-primary">{plant.protocols?.length || 0}</span>
                                            <span className="text-[9px] font-bold font-mono text-grafana-text-secondary uppercase tracking-tighter">Uç Noktalar</span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                title="Yapılandırmayı Görüntüle" 
                                                onClick={() => router.push(`/plants/${plant.id}`)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <button 
                                                title="Düzenle" 
                                                onClick={() => openEditModal(plant)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                title="Sil" 
                                                onClick={() => handleDeleteClick(plant)} 
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

            {/* Create / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlant ? 'DÜĞÜM YAPILANDIRMA' : 'DÜĞÜM TANIMLAMA'}
                icon={Factory}
                maxWidth="5xl"
            >
                <PlantForm
                    key={editingPlant?.id || 'new'}
                    initialData={editingPlant ? {
                        companyId: editingPlant.companyId,
                        plantName: editingPlant.plantName,
                        latitude: editingPlant.latitude ? editingPlant.latitude.toString() : '',
                        longitude: editingPlant.longitude ? editingPlant.longitude.toString() : '',
                        plantType: editingPlant.plantType,
                        ytbsCode: editingPlant.ytbsCode || '',
                        canSendYtbs: editingPlant.canSendYtbs || false
                    } : { companyId: initialCompanyId, ytbsCode: '', canSendYtbs: false }}
                    companies={companies}
                    onSubmit={handlePlantSubmit}
                    onAddNewCompany={() => setIsCompanyModalOpen(true)}
                    isSubmitting={isSubmitting}
                    submitLabel={editingPlant ? 'Düğümü Yapılandır' : 'Düğümü Kaydet'}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!plantToDelete}
                onClose={() => setPlantToDelete(null)}
                title="DÜĞÜMÜ KALDIR"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-grafana-text-primary uppercase tracking-widest font-mono">Düğümü Devre Dışı Bırakmayı Onayla</h4>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed font-mono">
                            <span className="font-bold text-grafana-accent-red">[{plantToDelete?.plantName}]</span> düğümünü altyapı matrisinden kalıcı olarak siliyorsunuz. Telemetri akışı sonlandırılacaktır.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPlantToDelete(null)}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm border border-grafana-border bg-grafana-bg text-grafana-text-secondary font-bold text-[10px] hover:bg-grafana-panel transition-colors disabled:opacity-50 tracking-widest uppercase font-mono"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm bg-grafana-accent-red text-white font-bold text-[10px] hover:bg-grafana-accent-red/90 shadow-lg shadow-grafana-accent-red/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2 font-mono"
                        >
                            {isDeleting ? 'Sonlandırılıyor...' : 'Kaldırmayı Onayla'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Inline Company Create Modal */}
            <Modal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                title="KURUM KAYDI"
                icon={Building2}
                maxWidth="xl"
                zIndex={250}
            >
                <CompanyForm
                    onSubmit={handleCompanySubmit}
                    isSubmitting={isCreatingCompany}
                    submitLabel="Kurumu Kaydet"
                />
            </Modal>
        </div>
    );
}

export default function PlantsPage() {
    return (
        <Suspense fallback={<div className="p-10 font-mono text-grafana-text-secondary animate-pulse">Varlık Matrisi Yükleniyor...</div>}>
            <PlantsContent />
        </Suspense>
    );
}

