"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Download, Factory, Activity,
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2,
    ChevronRight, ArrowLeftRight, Database, LayoutGrid,
    Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ExternalPlant {
    lisanssizSantral: {
        id: number;
        ad: string;
        durum?: {
            id: number;
            ad: string;
        };
        il?: {
            id: number;
            ad: string;
        };
    };
    isletmedekiGuc?: number;
    kuruluGuc?: number;
    status?: string;
    city?: string;
}

interface Company {
    id: string;
    name: string;
    ytbsUsername?: string;
    ytbsApiKey?: string;
    ytbsPassword?: string;
    baglantiAnlasmasiSirketiLisansNo?: string;
}

export default function YtbsQueryPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [loading, setLoading] = useState(false);
    const [querying, setQuerying] = useState(false);
    const [importing, setImporting] = useState(false);
    const [externalPlants, setExternalPlants] = useState<ExternalPlant[]>([]);
    const [importedIds, setImportedIds] = useState<number[]>([]);

    // 1. Şirketleri ve Mevcut Kayıtlı Santralleri Getir
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Şirketleri çek
                const compRes = await apiRequest('/api/companies');
                if (compRes.ok) {
                    const result = await compRes.json();
                    const data = (result && result.success) ? result.data : result;
                    setCompanies(Array.isArray(data) ? data : []);
                }

                // Sistemde kayıtlı olan YTBS ID'lerini çek
                const plantsRes = await apiRequest('/api/ytbs/imported-ids');
                if (plantsRes.ok) {
                    const result = await plantsRes.json();
                    setImportedIds(result.data || []);
                }
            } catch (err) {
                toast.error('Veriler yüklenemedi');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleQuery = async () => {
        if (!selectedCompanyId) {
            toast.error('Lütfen bir firma seçin');
            return;
        }

        const company = companies.find(c => c.id === selectedCompanyId);
        if (!company?.ytbsUsername || !company?.ytbsPassword || !company?.ytbsApiKey) {
            toast.error('Firma YTBS bilgileri (API Key/Kullanıcı adı/Şifre) eksik!');
            return;
        }

        setQuerying(true);
        setExternalPlants([]);
        try {
            const res = await apiRequest('/api/ytbs/query-external', {
                method: 'POST',
                body: JSON.stringify({ companyId: selectedCompanyId })
            });

            if (res.ok) {
                const result = await res.json();
                const list = result.data || [];
                setExternalPlants(list);
                if (list.length > 0) {
                    toast.success(`${list.length} santral bulundu.`);
                } else {
                    toast.error('Kayıtlı santral bulunamadı.');
                }
            } else {
                const err = await res.json();
                toast.error(err.message || 'Sorgulama başarısız.');
            }
        } catch (err) {
            toast.error('Sorgulama sırasında bir hata oluştu.');
        } finally {
            setQuerying(false);
        }
    };

    const handleImport = async (plantsToImport: ExternalPlant[]) => {
        if (plantsToImport.length === 0) return;

        setImporting(true);
        const t = toast.loading(`${plantsToImport.length} santral içeri aktarılıyor...`);
        try {
            const res = await apiRequest('/api/ytbs/import-external', {
                method: 'POST',
                body: JSON.stringify({
                    companyId: selectedCompanyId,
                    plants: plantsToImport
                })
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(`${result.importedCount} santral başarıyla eklendi/güncellendi.`, { id: t });
                // Yeni I dleri ekle
                setImportedIds(prev => [...prev, ...plantsToImport.map(p => p.lisanssizSantral.id)]);
            } else {
                toast.error('Aktarım başarısız.', { id: t });
            }
        } catch (err) {
            toast.error('Bir hata oluştu.', { id: t });
        } finally {
            setImporting(false);
        }
    };

    const handleRemove = async (ytbsId: number) => {
        if (!confirm('Bu santrali yerel veritabanından silmek istediğinize emin misiniz?')) return;

        const t = toast.loading('Santral sistemden kaldırılıyor...');
        try {
            const res = await apiRequest('/api/ytbs/remove-external', {
                method: 'POST',
                body: JSON.stringify({
                    companyId: selectedCompanyId,
                    ytbsId: ytbsId
                })
            });

            if (res.ok) {
                toast.success('Santral sistemden kaldırıldı.', { id: t });
                setImportedIds(prev => prev.filter(id => id !== ytbsId));
            } else {
                toast.error('Kaldırma işlemi başarısız.', { id: t });
            }
        } catch (err) {
            toast.error('Bir hata oluştu.', { id: t });
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in font-sans selection:bg-brand-green/30">

            {/* 1. SORGULAMA ALANI */}
            <div className="card-base p-6 bg-slate-900 shadow-2xl shadow-black/50 border-brand-green/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 blur-[120px] -mr-48 -mt-48 rounded-full pointer-events-none" />

                <div className="flex flex-col md:flex-row items-end gap-6 relative z-10">
                    <div className="flex-1 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <Building2 size={12} className="text-brand-green" />
                            İşlem Yapılacak Şirket
                        </label>
                        <div className="relative">
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-sm font-bold text-white focus:border-brand-green outline-none transition-all shadow-inner appearance-none pr-12"
                            >
                                <option value="">Bir şirket seçiniz...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {(!c.ytbsUsername || !c.ytbsApiKey) ? '⚠️ (Profil Eksik)' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleQuery}
                        disabled={querying || !selectedCompanyId}
                        className="h-[52px] px-10 bg-brand-green text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3 whitespace-nowrap min-w-[180px]"
                    >
                        {querying ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} strokeWidth={3} />}
                        Sorgula
                    </button>
                </div>
            </div>

            {/* 2. SONUÇLAR TABLOSU */}
            <div className="card-base overflow-hidden border-white/[0.04] bg-slate-900/50">
                <div className="px-8 py-4 border-b border-white/[0.03] flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={14} className="text-brand-green" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Santral Listesi</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-black text-brand-green uppercase tabular-nums">
                            {externalPlants.length} Kayıt
                        </div>
                    </div>
                </div>

                <div className="min-h-[400px]">
                    {querying ? (
                        <div className="flex flex-col items-center gap-6 py-32">
                            <div className="relative">
                                <div className="w-12 h-12 border-3 border-brand-green/10 border-t-brand-green rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-brand-green">
                                    <Activity size={18} className="animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-1 text-center">
                                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] block">Veriler Çekiliyor</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block opacity-50">YTBS API BAĞLANTISI AKTİF</span>
                            </div>
                        </div>
                    ) : externalPlants.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-32 opacity-20">
                            <Factory size={48} className="text-slate-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Henüz sorgulama yapılmadı.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto selection:bg-brand-green/20">
                            <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                                <thead className="text-[9px] text-slate-500 uppercase bg-slate-950/20 font-black tracking-widest border-b border-white/[0.02]">
                                    <tr>
                                        <th className="w-[70px] px-3 py-3">ID</th>
                                        <th className="px-3 py-3">Santral Bilgisi</th>
                                        <th className="w-[120px] px-3 py-3 text-center">İşletme Gücü</th>
                                        <th className="w-[100px] px-3 py-3 text-center">Durum</th>
                                        <th className="w-[100px] px-3 py-3 text-center">Şehir</th>
                                        <th className="w-[120px] px-3 py-3 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02] text-slate-400 font-medium">
                                    {externalPlants.map((plant) => {
                                        const isImported = importedIds.includes(plant.lisanssizSantral.id);
                                        return (
                                            <tr key={plant.lisanssizSantral.id} className="hover:bg-white/[0.01] transition-colors group">
                                                <td className="px-3 py-2.5">
                                                    <span className="px-1.5 py-0.5 bg-slate-950 border border-white/5 text-[9px] font-mono font-bold text-slate-500/50 rounded">
                                                        #{plant.lisanssizSantral.id}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 overflow-hidden">
                                                    <div className="flex flex-col gap-0.5 max-w-full">
                                                        <span className="text-[13px] font-bold text-slate-200 truncate group-hover:text-brand-green transition-colors" title={plant.lisanssizSantral.ad}>
                                                            {plant.lisanssizSantral.ad}
                                                        </span>
                                                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Güneş Enerji Santrali</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-[12px] font-black text-slate-300 tabular-nums">
                                                            {(plant.isletmedekiGuc || 0).toLocaleString()} <span className="text-[8px] opacity-40">AC</span>
                                                        </div>
                                                        {plant.kuruluGuc && plant.kuruluGuc > 0 && (
                                                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">
                                                                DC: {plant.kuruluGuc.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.05em] border ${
                                                        plant.lisanssizSantral.durum?.id === 4 
                                                        ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' 
                                                        : 'bg-amber-500/5 text-amber-500 border-amber-500/10'
                                                    }`}>
                                                        {plant.lisanssizSantral.durum?.ad || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{plant.lisanssizSantral.il?.ad || '-'}</span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <div className="flex justify-end items-center gap-1.5">
                                                        {isImported ? (
                                                            <>
                                                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase tracking-widest">
                                                                    <CheckCircle2 size={10} />
                                                                    Sistemde
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleRemove(plant.lisanssizSantral.id)}
                                                                    className="p-1.5 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleImport([plant])}
                                                                disabled={importing}
                                                                className="px-3 py-1.5 bg-brand-green text-white rounded text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-green/20"
                                                            >
                                                                Aktar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
