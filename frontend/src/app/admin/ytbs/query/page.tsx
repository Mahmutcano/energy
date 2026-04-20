"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Download, Factory, Activity,
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2,
    ChevronRight, ArrowLeftRight, Database, LayoutGrid,
    Trash2, Beaker
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ExternalPlant {
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
    tarihce?: {
        acGucu?: number;
        dcGucu?: number;
    };
    baglantiAnlasmasiSirketi?: {
        id: string; // Lisans No
        ad: string;
    };
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
    const [activeTab, setActiveTab] = useState<'plants' | 'logs'>('plants');
    const [logType, setLogType] = useState<'instant' | 'hourly'>('instant');
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const compRes = await apiRequest('/api/companies');
                if (compRes.ok) {
                    const result = await compRes.json();
                    const data = (result && result.success) ? result.data : result;
                    setCompanies(Array.isArray(data) ? data : []);
                }

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

    const fetchLogs = async () => {
        if (!selectedCompanyId) {
            toast.error('Önce bir firma seçmelisiniz.');
            return;
        }
        setQuerying(true);
        try {
            const res = await apiRequest(`/api/ytbs/logs?type=${logType}&companyId=${selectedCompanyId}`);
            if (res.ok) {
                const result = await res.json();
                setLogs(result.data || []);
            }
        } catch (err) {
            toast.error('Loglar çekilemedi');
        } finally {
            setQuerying(false);
        }
    };

    const handleQuery = async () => {
        if (!selectedCompanyId) {
            toast.error('Lütfen bir firma seçin');
            return;
        }

        setQuerying(true);
        if (activeTab === 'logs') {
            setLogs([]);
            try {
                const res = await apiRequest('/api/ytbs/query-external-logs', {
                    method: 'POST',
                    body: JSON.stringify({ companyId: selectedCompanyId, type: logType })
                });
                if (res.ok) {
                    const result = await res.json();
                    setLogs(result.data || []);
                    toast.success('Dış veriler çekildi.');
                } else {
                    toast.error('Sorgulama başarısız.');
                }
            } catch (err) {
                toast.error('Hata oluştu.');
            } finally {
                setQuerying(false);
            }
            return;
        }

        setExternalPlants([]);
        try {
            const res = await apiRequest('/api/ytbs/query-external', {
                method: 'POST',
                body: JSON.stringify({ companyId: selectedCompanyId })
            });

            if (res.ok) {
                const result = await res.json();
                // Handle both direct array or object with .veri property
                const list = result.data?.veri || (Array.isArray(result.data) ? result.data : []);
                setExternalPlants(list);
                if (list && list.length > 0) {
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
                body: JSON.stringify({ companyId: selectedCompanyId, plants: plantsToImport })
            });
            if (res.ok) {
                const result = await res.json();
                toast.success(`${result.importedCount} santral başarıyla eklendi/güncellendi.`, { id: t });
                setImportedIds(prev => [...prev, ...plantsToImport.map(p => p.id)]);
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
        if (!confirm('Bu santrali sistemden kaldırmak istediğinize emin misiniz?')) return;
        const t = toast.loading('Kaldırılıyor...');
        try {
            const res = await apiRequest('/api/ytbs/remove-external', {
                method: 'POST',
                body: JSON.stringify({ companyId: selectedCompanyId, ytbsId })
            });
            if (res.ok) {
                toast.success('Kaldırıldı.', { id: t });
                setImportedIds(prev => prev.filter(id => id !== ytbsId));
            } else {
                toast.error('Başarısız.', { id: t });
            }
        } catch (err) {
            toast.error('Hata oluştu.', { id: t });
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Silinecektir. Emin misiniz?')) return;
        try {
            const res = await apiRequest(`/api/ytbs/logs/${logType}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Silindi');
                fetchLogs();
            }
        } catch (err) {
            toast.error('Hata oluştu');
        }
    };

    const handleCreateTestLog = async () => {
        if (!selectedCompanyId) {
            toast.error('Önce bir firma seçmelisiniz.');
            return;
        }
        const t = toast.loading('Test verisi oluşturuluyor...');
        try {
            const res = await apiRequest('/api/ytbs/test-log', {
                method: 'POST',
                body: JSON.stringify({ companyId: selectedCompanyId, type: logType })
            });
            if (res.ok) {
                toast.success('Test kaydı oluşturuldu!', { id: t });
                fetchLogs();
            } else {
                toast.error('Oluşturulamadı', { id: t });
            }
        } catch (err) {
            toast.error('Hata oluştu', { id: t });
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in font-sans selection:bg-brand-green/30">
            <div className="card-base p-6 bg-slate-900 shadow-2xl border-brand-green/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 blur-[120px] -mr-48 -mt-48 rounded-full pointer-events-none" />
                <div className="flex flex-col md:flex-row items-end gap-6 relative z-10">
                    <div className="flex-1 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <Building2 size={12} className="text-brand-green" /> İşlem Yapılacak Şirket
                        </label>
                        <div className="relative">
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-sm font-bold text-white focus:border-brand-green outline-none appearance-none pr-12"
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
                        className="h-[52px] px-10 bg-brand-green text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {querying ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} strokeWidth={3} />}
                        Sorgula
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-950/50 border border-white/[0.03] rounded-2xl w-fit ml-4">
                <button onClick={() => setActiveTab('plants')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plants' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-500 hover:text-slate-300'}`}>Santral Listesi</button>
                <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-500 hover:text-slate-300'}`}>Gönderim Kayıtları</button>
            </div>

            <div className="card-base overflow-hidden border-white/[0.04] bg-slate-900/50 min-h-[500px]">
                <div className="px-8 py-4 border-b border-white/[0.03] flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={14} className="text-brand-green" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{activeTab === 'plants' ? 'Santral Listesi' : 'Gönderim Kayıtları'}</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-black text-brand-green tabular-nums">{activeTab === 'plants' ? externalPlants.length : logs.length} Kayıt</div>
                        {activeTab === 'logs' && (
                            <button 
                                onClick={handleCreateTestLog}
                                className="flex items-center gap-2 px-3 py-1 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all"
                            >
                                <Beaker size={10} />
                                Test Verisi Gönder
                            </button>
                        )}
                    </div>
                    {activeTab === 'logs' && (
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setLogType('instant'); setLogs([]); }} className={`text-[9px] font-black uppercase tracking-widest transition-all ${logType === 'instant' ? 'text-brand-green' : 'text-slate-600'}`}>15 Dakikalık Veri</button>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <button onClick={() => { setLogType('hourly'); setLogs([]); }} className={`text-[9px] font-black uppercase tracking-widest transition-all ${logType === 'hourly' ? 'text-brand-green' : 'text-slate-600'}`}>Saatlik Veri</button>
                        </div>
                    )}
                </div>

                {querying ? (
                    <div className="flex flex-col items-center gap-6 py-32">
                        <div className="w-12 h-12 border-3 border-brand-green/10 border-t-brand-green rounded-full animate-spin" />
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Veriler İşleniyor</span>
                    </div>
                ) : activeTab === 'plants' ? (
                    <div className="overflow-x-auto">
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
                            <tbody className="divide-y divide-white/[0.02] text-slate-400">
                                {externalPlants.length === 0 ? (
                                    <tr><td colSpan={6} className="py-32 text-center opacity-20 text-[10px] font-black uppercase italic">Sorgulama Bekleniyor</td></tr>
                                ) : (
                                    externalPlants.map((plant: ExternalPlant) => (
                                        <tr key={plant.id} className="hover:bg-white/[0.01] group">
                                            <td className="px-3 py-3 font-mono text-[9px] text-slate-500">#{plant.id}</td>
                                            <td className="px-3 py-3 truncate text-[13px] font-bold text-slate-200 group-hover:text-brand-green transition-colors">{plant.ad}</td>
                                            <td className="px-3 py-3 text-center font-black text-slate-300">{(plant.tarihce?.acGucu || 0).toLocaleString()} <small className="opacity-40">AC</small></td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${plant.durum?.id === 4 ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-amber-500/5 text-amber-500 border-amber-500/10'}`}>{plant.durum?.ad || '-'}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px] font-bold text-slate-500">{plant.il?.ad || '-'}</td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {importedIds.includes(plant.id) ? (
                                                        <><div className="px-2 py-1 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 rounded text-[8px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={10}/> Sistemde</div><button onClick={() => handleRemove(plant.id)} className="p-1.5 text-slate-700 hover:text-rose-500 transition-all"><Trash2 size={12}/></button></>
                                                    ) : (
                                                        <button onClick={() => handleImport([plant])} disabled={importing} className="px-3 py-1.5 bg-brand-green text-white rounded text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Aktar</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-[9px] text-slate-500 uppercase bg-slate-950/20 font-black tracking-widest border-b border-white/[0.02]">
                                <tr>
                                    <th className="px-6 py-3">Zaman</th>
                                    <th className="px-6 py-3 text-center">Değer</th>
                                    <th className="px-6 py-3 text-center">Durum</th>
                                    <th className="px-6 py-3 text-center">Tekrar</th>
                                    <th className="px-6 py-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02] text-slate-400">
                                {logs.length === 0 ? (
                                    <tr><td colSpan={5} className="py-32 text-center opacity-20 text-[10px] font-black uppercase italic">Kayıt Bulunmamaktadır</td></tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/[0.01]">
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col"><span className="text-[12px] font-bold text-slate-200">{log.readingDate}</span><span className="text-[10px] text-slate-600 font-mono italic">{log.readingTime || log.readingHour}</span></div>
                                            </td>
                                            <td className="px-6 py-3 text-center text-[13px] font-black">{log.valueMw || log.valueMwh} <small className="opacity-40">{logType === 'instant' ? 'MW' : 'MWh'}</small></td>
                                            <td className="px-6 py-3 text-center">
                                                {log.isSent ? (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/5 text-emerald-500 rounded border border-emerald-500/10 text-[9px] font-black uppercase"><CheckCircle2 size={12}/> GİTTİ</div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/5 text-amber-500 rounded border border-amber-500/10 text-[9px] font-black uppercase"><RefreshCw size={10} className={log.retryCount > 0 ? "animate-spin" : ""}/> BEKLEMEDE</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center text-[11px] font-bold text-slate-500">{log.retryCount} / 10</td>
                                            <td className="px-6 py-3 text-right"><button onClick={() => handleDeleteLog(log.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-all"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
