"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, Factory, ToggleLeft, ToggleRight, Pencil, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import CompanyForm, { CompanyFormData } from '@/components/forms/CompanyForm';

interface CompanyProfile {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    representative: string | null;
    taxOffice: string | null;
    taxNumber: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    updatedBy?: string | null;
    plantCount?: number;
    userCount?: number;
}

const defaultFormData = {
    isActive: true,
};

export default function CompaniesPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<CompanyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null);
    const submittingRef = React.useRef(false);
    const [companyToDelete, setCompanyToDelete] = useState<CompanyProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const openCreateModal = () => {
        setEditingCompany(null);
        setIsModalOpen(true);
    };

    const openEditModal = (company: CompanyProfile) => {
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (company: CompanyProfile) => {
        setCompanyToDelete(company);
    };

    const confirmDelete = async () => {
        if (!companyToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/companies/${companyToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Firma başarıyla silindi');
                setCompanies(companies.filter(c => c.id !== companyToDelete.id));
                setCompanyToDelete(null);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Firma silinemedi';
                toast.error(errorMessage);
                fetchCompanies();
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFormSubmit = async (data: CompanyFormData) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const body = {
                ...data,
                taxNumber: data.taxNumber ? parseInt(data.taxNumber) : null,
            };

            const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies';
            const method = editingCompany ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingCompany ? 'Firma güncellendi' : 'Firma oluşturuldu');
                setIsModalOpen(false);
                setEditingCompany(null);
                fetchCompanies();
            }
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">Company Profiles</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Manage company profiles and their associated plants and users</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all  tracking-widest"
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
                                    {(company.taxOffice || company.taxNumber) && (
                                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{company.taxOffice} - {company.taxNumber}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${company.isActive ? 'bg-brand-green' : 'bg-slate-700'}`} />
                                <span className={`text-[10px] font-bold  ${company.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                    {company.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 mb-4 px-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                                <div className="flex flex-col">
                                    <span>Created At</span>
                                    {company.createdBy && <span className="text-[8px] text-slate-700 font-medium lowercase">by: {company.createdBy.substring(0, 8)}</span>}
                                </div>
                                <span className="text-slate-500 tabular-nums text-right">
                                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString('tr-TR') + ' ' + new Date(company.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                                <div className="flex flex-col">
                                    <span>Last Update</span>
                                    {company.updatedBy && <span className="text-[8px] text-slate-700 font-medium lowercase">by: {company.updatedBy.substring(0, 8)}</span>}
                                </div>
                                <span className="text-amber-500/80 tabular-nums text-right">
                                    {company.updatedAt ? new Date(company.updatedAt).toLocaleDateString('tr-TR') + ' ' + new Date(company.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800/40">
                            <div className="flex items-center gap-2">
                                <Factory size={14} className="text-slate-600" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 ">Plants</p>
                                    <p className="text-sm font-bold text-white tabular-nums">{company.plantCount || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-600" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 ">Users</p>
                                    <p className="text-sm font-bold text-white tabular-nums">{company.userCount || 0}</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button title="Plants" onClick={() => router.push(`/plants?companyId=${company.id}`)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                    <Factory size={14} />
                                </button>
                                <button title="Edit" onClick={() => openEditModal(company)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-brand-green hover:border-brand-green/30 transition-all">
                                    <Pencil size={14} />
                                </button>
                                <button title="Delete" onClick={() => handleDeleteClick(company)} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-600 hover:text-red-500 hover:border-red-500/30 transition-all">
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
                title={editingCompany ? 'Edit Company' : 'New Company'}
                subtitle={editingCompany ? 'Update company details' : 'Register a new company profile'}
                icon={Building2}
                maxWidth="xl"
            >
                <CompanyForm
                    key={editingCompany?.id || 'new'}
                    initialData={editingCompany ? {
                        name: editingCompany.name,
                        address: editingCompany.address,
                        phone: editingCompany.phone,
                        email: editingCompany.email,
                        representative: editingCompany.representative,
                        taxOffice: editingCompany.taxOffice,
                        taxNumber: editingCompany.taxNumber ? editingCompany.taxNumber.toString() : '',
                        isActive: editingCompany.isActive
                    } : undefined}
                    onSubmit={handleFormSubmit}
                    isSubmitting={isSubmitting}
                    submitLabel={editingCompany ? 'Update Company' : 'Create Company'}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!companyToDelete}
                onClose={() => setCompanyToDelete(null)}
                title="Delete Company"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-white">{companyToDelete?.name}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setCompanyToDelete(null)}
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
