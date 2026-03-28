"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Factory, Plus, Search, MapPin, X, Building2, Cpu, Activity, Pencil, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PlantForm, { PlantFormData } from '@/components/forms/PlantForm';
import CompanyForm, { CompanyFormData } from '@/components/forms/CompanyForm';

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
    plantType: 'SOLAR' as 'SOLAR' | 'WIND' | 'HYDRO'
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
            plantType: plant.plantType || 'SOLAR'
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
                toast.success('Santral başarıyla silindi');
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
            };

            const url = editingPlant ? `/api/plants/${editingPlant.id}` : '/api/plants';
            const method = editingPlant ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingPlant ? 'Santral güncellendi' : 'Santral oluşturuldu');
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
                toast.success('Company created');
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
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">Power Plants</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage power plant locations and their connected devices</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all  tracking-widest"
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
                            <p className="text-[10px] font-bold text-slate-500  tracking-widest">{stat.label}</p>
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
                            <div className="flex items-center gap-2 text-[10px] font-bold text-brand-green">
                                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                                <span>Active</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mb-4 px-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                                <div className="flex flex-col">
                                    <span>Created At</span>
                                    {plant.createdBy && <span className="text-[8px] text-slate-700 font-medium lowercase">by: {plant.createdBy.substring(0, 8)}</span>}
                                </div>
                                <span className="text-slate-500 tabular-nums text-right">
                                    {plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('tr-TR') + ' ' + new Date(plant.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                                <div className="flex flex-col">
                                    <span>Last Update</span>
                                    {plant.updatedBy && <span className="text-[8px] text-slate-700 font-medium lowercase">by: {plant.updatedBy.substring(0, 8)}</span>}
                                </div>
                                <span className="text-amber-500/80 tabular-nums text-right">
                                    {plant.updatedAt ? new Date(plant.updatedAt).toLocaleDateString('tr-TR') + ' ' + new Date(plant.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/40">
                            <div>
                                <p className="text-[10px] font-bold text-slate-600  tracking-widest mb-1">Protocols</p>
                                <p className="text-sm font-bold text-white tabular-nums">{plant.protocols?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-600  tracking-widest mb-1">Latitude</p>
                                <p className="text-sm font-mono text-slate-400">{plant.latitude ? Number(plant.latitude).toFixed(4) : '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-600  tracking-widest mb-1">Longitude</p>
                                <p className="text-sm font-mono text-slate-400">{plant.longitude ? Number(plant.longitude).toFixed(4) : '—'}</p>
                            </div>
                            <div className="flex justify-end gap-2 items-end">
                                <button title="Protocols" onClick={() => router.push(`/protocols?plantId=${plant.id}`)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                    <Settings size={14} />
                                </button>
                                <button title="Edit" onClick={() => openEditModal(plant)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                    <Pencil size={14} />
                                </button>
                                <button title="Delete" onClick={() => handleDeleteClick(plant)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-red-500 hover:border-red-500/30 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlant ? 'Edit Plant' : 'New Plant'}
                subtitle={editingPlant ? 'Update plant details' : 'Register a new power plant'}
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
                        plantType: editingPlant.plantType
                    } : { companyId: initialCompanyId }}
                    companies={companies}
                    onSubmit={handlePlantSubmit}
                    onAddNewCompany={() => setIsCompanyModalOpen(true)}
                    isSubmitting={isSubmitting}
                    submitLabel={editingPlant ? 'Update Plant' : 'Create Plant'}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!plantToDelete}
                onClose={() => setPlantToDelete(null)}
                title="Delete Plant"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-white">{plantToDelete?.plantName}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setPlantToDelete(null)}
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

            {/* Inline Company Create Modal */}
            <Modal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                title="Add New Company"
                icon={Building2}
                maxWidth="xl"
                zIndex={250}
            >
                <CompanyForm
                    onSubmit={handleCompanySubmit}
                    isSubmitting={isCreatingCompany}
                    submitLabel="Add Company"
                />
            </Modal>
        </div>
    );
}

export default function PlantsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PlantsContent />
        </Suspense>
    );
}
