"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Download, Factory, Activity,
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2,
    ChevronRight, ArrowLeftRight, Database
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ExternalPlant {
    lisanssizSantral: {
        id: number;
        ad: string;
    };
    isletmedekiGuc?: number;
    kuruluGuc?: number;
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

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            try {
                const res = await apiRequest('/api/companies');
                if (res.ok) {
                    const result = await res.json();
                    const data = (result && result.success) ? result.data : result;
                    setCompanies(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                toast.error('Firmalar yüklenemedi');
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const handleQuery = async () => {
        if (!selectedCompanyId) {
            toast.error('Lütfen bir firma seçin');
            return;
        }

        const company = companies.find(c => c.id === selectedCompanyId);
        if (!company?.ytbsUsername || !company?.ytbsPassword || !company?.ytbsApiKey) {
            toast.error('Seçilen firmanın YTBS bilgileri (API Key/Kullanıcı adı) eksik!');
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
                const data = result.data || [];
                // API might return nested data depending on YTBS response structure
                const list = Array.isArray(data) ? data : (data.veriler || data.items || []);
                setExternalPlants(list);
                toast.success(`${list.length} santral bulundu.`);
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
                toast.success(`${result.importedCount} yeni santral başarıyla eklendi.`, { id: t });
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

    return (
        <div className="space-y-8 pb-20 animate-in-up font-sans selection:bg-brand-green/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-brand-green shadow-xl shadow-brand-green/5">
                            <Download size={22} className="animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight uppercase">External <span className="text-brand-green">Inquiry</span></h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <Database size={10} /> YTBS Lisanssız Santral Sorgulama
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleQuery}
                        disabled={querying || !selectedCompanyId}
                        className="flex items-center gap-3 px-6 py-2.5 bg-brand-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {querying ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} strokeWidth={3} />}
                        Sorgula
                    </button>
                </div>
            </div>

            {/* Selection Area */}
            <div className="card-base p-6 bg-slate-900/20 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={12} className="text-brand-green" />
                            İşlem Yapılacak Firma
                        </label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-brand-green/50 outline-none transition-all shadow-inner custom-select appearance-none"
                        >
                            <option value="">Firma Seçiniz...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {(!c.ytbsUsername || !c.ytbsApiKey) ? '(YTBS Bilgileri Eksik)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-300">Güvenli Sorgulama</p>
                            <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">
                                Seçilen firma YTBS API bilgileri ile otomatik login yapılarak güncel santral listesi çekilecektir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="card-base overflow-hidden border-white/[0.04]">
                <div className="px-6 py-4 border-b border-white/[0.03] flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Sonuçlar</span>
                        <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[9px] font-black text-slate-500 uppercase tabular-nums">
                            {externalPlants.length} Bulundu
                        </div>
                    </div>
                    {externalPlants.length > 0 && (
                        <button
                            onClick={() => handleImport(externalPlants.filter(p => !importedIds.includes(p.lisanssizSantral.id)))}
                            disabled={importing || externalPlants.filter(p => !importedIds.includes(p.lisanssizSantral.id)).length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-brand-green/10 disabled:hover:text-brand-green"
                        >
                            {importing ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                            Tümünü Aktar
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/20 border-b border-white/[0.02]">
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">YTBS ID</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Santral Adı</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Güç Bilgisi</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {querying ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                                            <span className="text-[11px] font-bold text-brand-green uppercase tracking-widest animate-pulse">YTBS Sunucularına Bağlanılıyor...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : externalPlants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <Factory size={48} className="text-slate-500" />
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Henüz sorgulama yapılmadı veya sonuç bulunamadı.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : externalPlants.map((plant, idx) => {
                                const isImported = importedIds.includes(plant.lisanssizSantral.id);
                                return (
                                    <motion.tr
                                        key={plant.lisanssizSantral.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-white/[0.01] transition-all group"
                                    >
                                        <td className="px-6 py-5">
                                            <span className="text-[11px] font-black text-slate-300 font-mono tracking-tighter">#{plant.lisanssizSantral.id}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-white group-hover:text-brand-green transition-colors">{plant.lisanssizSantral.ad}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Tür: SOLAR</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="space-y-1">
                                                <span className="text-xs font-black text-white tabular-nums">{(plant.isletmedekiGuc || 0).toLocaleString()} kW</span>
                                                <p className="text-[9px] font-bold text-slate-600 uppercase">Aktif Güç</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                {isImported ? (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg">
                                                        <CheckCircle2 size={12} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Aktarıldı</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleImport([plant])}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-brand-green hover:border-brand-green transition-all"
                                                    >
                                                        Aktar <ChevronRight size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hint Box */}
            <div className="flex items-start gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl mx-1">
                <AlertTriangle size={18} className="text-blue-400 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Bilgilendirme</p>
                    <p className="text-[10px] text-blue-300/60 leading-relaxed font-medium">
                        Aktarılan santraller otomatik olarak SOLAR tipinde kaydedilecektir. ID eşleştirmesi karşı taraftan (YTBS) gelen ID ile yapılmaktadır.
                        Bir santral bir kez aktarıldıktan sonra tekrar aktarılmaz, güncellenmez.
                    </p>
                </div>
            </div>
        </div>
    );
}
