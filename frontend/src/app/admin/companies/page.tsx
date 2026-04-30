"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, Factory, ToggleLeft, ToggleRight, Pencil, Trash2, Settings, AlertTriangle, Shield, Globe, Mail, Phone, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import CompanyForm, { CompanyFormData } from '@/components/forms/CompanyForm';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface CompanyProfile {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    representative: string | null;
    taxOffice: string | null;
    taxNumber: number | null;
    ytbsUsername?: string | null;
    ytbsPassword?: string | null;
    ytbsApiKey?: string | null;
    baglantiAnlasmasiSirketiLisansNo?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    updatedBy?: string | null;
    plantCount?: number;
    userCount?: number;
}

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
            console.error('Kurumlar getirilemedi:', err);
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
                toast.success('Kurum kayıtlardan temizlendi');
                setCompanies(companies.filter(c => c.id !== companyToDelete.id));
                setCompanyToDelete(null);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Silme işlemi başarısız';
                toast.error(errorMessage);
                fetchCompanies();
            }
        } catch (err) {
            console.error('Silme hatası:', err);
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
                toast.success(editingCompany ? 'Kurum güncellendi' : 'Kurum kaydedildi');
                setIsModalOpen(false);
                setEditingCompany(null);
                fetchCompanies();
            }
        } catch (err) {
            console.error('Gönderim hatası:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    return (
        <div className="space-y-8 pb-16 font-sans">
            <PageHeader 
                title="KURUMSAL" 
                highlightedTitle="KAYITLAR"
                subtitle="Kurumsal varlıkların ve düğüm sahipliklerinin yönetimi"
                icon={Building2}
            >
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(87,148,242,0.2)] font-mono whitespace-nowrap"
                >
                    <Plus size={14} /> KURUM KAYDET
                </button>
            </PageHeader>

            {/* Kurumlar Izgarası */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center font-mono text-grafana-text-secondary animate-pulse uppercase tracking-widest bg-grafana-panel/20 border border-grafana-border/50 rounded-sm">
                        Kurumsal kayıtlar taranıyor...
                    </div>
                ) : companies.length === 0 ? (
                    <div className="col-span-full py-20 text-center font-mono text-grafana-text-secondary uppercase tracking-widest bg-grafana-panel/20 border border-grafana-border/50 rounded-sm">
                        <Building2 size={48} className="text-grafana-text-secondary/20 mx-auto mb-4" />
                        <p>Kayıtlı kurum bulunamadı</p>
                    </div>
                ) : companies.map((company) => (
                    <motion.div 
                        key={company.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden group hover:border-grafana-accent-blue/30 transition-all shadow-xl"
                    >
                        <div className="p-5 border-b border-grafana-border bg-grafana-bg/50 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-accent-blue shadow-inner group-hover:shadow-grafana-accent-blue/5 transition-all">
                                    <Building2 size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-grafana-text-primary uppercase tracking-tight group-hover:text-white transition-colors">{company.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            company.isActive ? "bg-grafana-accent-green shadow-[0_0_8px_rgba(115,191,105,0.4)]" : "bg-grafana-text-secondary/20"
                                        )} />
                                        <span className={cn(
                                            "text-[10px] font-bold font-mono uppercase tracking-widest",
                                            company.isActive ? "text-grafana-accent-green" : "text-grafana-text-secondary/40"
                                        )}>
                                            {company.isActive ? 'AKTİF' : 'DEVRE DIŞI'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button 
                                    title="Düğümleri Görüntüle" 
                                    onClick={() => router.push(`/plants?companyId=${company.id}`)}
                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                >
                                    <ExternalLink size={14} />
                                </button>
                                <button 
                                    title="Yapılandır" 
                                    onClick={() => openEditModal(company)}
                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button 
                                    title="Sil" 
                                    onClick={() => handleDeleteClick(company)}
                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-red hover:border-grafana-accent-red/50 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-grafana-panel/30">
                            {/* İletişim Bilgileri */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Globe size={14} className="text-grafana-text-secondary" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Vergi Bilgileri</span>
                                        <span className="text-[11px] font-mono text-grafana-text-primary uppercase">
                                            {company.taxOffice || 'BİLİNMİYOR'} {company.taxNumber ? `// ${company.taxNumber}` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail size={14} className="text-grafana-text-secondary" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">E-Posta Geçidi</span>
                                        <span className="text-[11px] font-mono text-grafana-text-primary">
                                            {company.email || 'E-POSTA YAPILANDIRILMADI'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone size={14} className="text-grafana-text-secondary" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">İletişim Kanalı</span>
                                        <span className="text-[11px] font-mono text-grafana-text-primary">
                                            {company.phone || 'TELEFON KAYDI YOK'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Düğüm İstatistikleri */}
                            <div className="flex flex-col justify-between p-4 bg-grafana-bg border border-grafana-border/50 rounded-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-grafana-accent-blue">
                                            <Factory size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Düğümler</span>
                                        </div>
                                        <div className="text-2xl font-bold text-grafana-text-primary tabular-nums font-mono">
                                            {company.plantCount || 0}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-grafana-accent-green">
                                            <Users size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Personel</span>
                                        </div>
                                        <div className="text-2xl font-bold text-grafana-text-primary tabular-nums font-mono">
                                            {company.userCount || 0}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-grafana-border/30 flex items-center justify-between font-mono text-[9px] text-grafana-text-secondary uppercase">
                                    <span>Sektör Girişi: {company.createdAt ? new Date(company.createdAt).toLocaleDateString('tr-TR') : 'BİLİNMİYOR'}</span>
                                    <span className="text-grafana-accent-blue/50">ID: {company.id.substring(0, 8)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Oluştur / Düzenle Modalı */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCompany ? 'KURUM YAPILANDIRMA' : 'KURUM KAYDI'}
                icon={Building2}
                maxWidth="xl"
            >
                <div className="pt-4">
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
                            ytbsUsername: editingCompany.ytbsUsername,
                            ytbsPassword: editingCompany.ytbsPassword,
                            ytbsApiKey: editingCompany.ytbsApiKey,
                            baglantiAnlasmasiSirketiLisansNo: editingCompany.baglantiAnlasmasiSirketiLisansNo,
                            isActive: editingCompany.isActive
                        } : undefined}
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                        submitLabel={editingCompany ? 'YAPILANDIRMAYI UYGULA' : 'KAYDI TAMAMLA'}
                    />
                </div>
            </Modal>

            {/* Silme Onay Modalı */}
            <Modal
                isOpen={!!companyToDelete}
                onClose={() => setCompanyToDelete(null)}
                title="KURUMU SİL"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4 font-mono">
                    <div className="w-16 h-16 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-grafana-text-primary uppercase tracking-widest">Silme Protokolünü Çalıştır</h4>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed">
                            <span className="font-bold text-grafana-accent-red">[{companyToDelete?.name}]</span> kurumunu kayıtlardan siliyorsunuz. Bu işlem tüm ilişkili düğüm ve personeli ayıracaktır.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setCompanyToDelete(null)}
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
                            {isDeleting ? 'SİLİNİYOR...' : 'Silmeyi Onayla'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
