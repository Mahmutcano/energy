"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Download, Factory, Activity,
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2,
    ChevronRight, ArrowLeftRight, Database, LayoutGrid,
    Trash2, Beaker, Globe
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';

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
            toast.error('Kayıtlar çekilemedi');
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
        if (!confirm('Kayıt silinecektir. Emin misiniz?')) return;
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
        <div className="space-y-8 pb-20 font-sans selection:bg-grafana-accent-blue/30">
            <PageHeader 
                title="YTBS" 
                highlightedTitle="KONTROL"
                subtitle="Dış sistem veri entegrasyonu ve merkezi şebeke bildirim yönetimi"
                icon={Globe}
            >
                <div className="flex items-center gap-4">
                     <div className="flex bg-grafana-bg border border-grafana-border rounded-sm p-1">
                        <button 
                            onClick={() => setActiveTab('plants')} 
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'plants' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            SANTRALLER
                        </button>
                        <button 
                            onClick={() => setActiveTab('logs')} 
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'logs' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            LOGLAR
                        </button>
                    </div>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-4">
                    <div className="card-base p-6 bg-grafana-panel/50 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Building2 size={12} className="text-grafana-accent-blue" /> ŞİRKET SEÇİMİ
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCompanyId}
                                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                                        className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-xs font-bold text-white focus:border-grafana-accent-blue outline-none appearance-none pr-12 font-mono"
                                    >
                                        <option value="">FİRMA SEÇİNİZ...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {(!c.ytbsUsername || !c.ytbsApiKey) ? '⚠️' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-grafana-text-secondary">
                                        <ChevronRight size={14} className="rotate-90" />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleQuery}
                                disabled={querying || !selectedCompanyId}
                                className="w-full h-12 bg-grafana-accent-blue text-white rounded-sm text-[11px] font-black uppercase tracking-widest shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all disabled:opacity-30 flex items-center justify-center gap-3 font-mono"
                            >
                                {querying ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} strokeWidth={3} />}
                                {activeTab === 'plants' ? 'SANTRAL SORGULA' : 'DIŞ VERİ ÇEK'}
                            </button>
                        </div>

                        {activeTab === 'logs' && (
                            <div className="pt-6 border-t border-grafana-border space-y-4">
                                <div className="flex bg-grafana-bg border border-grafana-border rounded-sm p-1">
                                    <button 
                                        onClick={() => { setLogType('instant'); setLogs([]); }} 
                                        className={cn(
                                            "flex-1 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all font-mono",
                                            logType === 'instant' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                                        )}
                                    >
                                        15 DK
                                    </button>
                                    <button 
                                        onClick={() => { setLogType('hourly'); setLogs([]); }} 
                                        className={cn(
                                            "flex-1 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all font-mono",
                                            logType === 'hourly' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                                        )}
                                    >
                                        SAATLİK
                                    </button>
                                </div>
                                <button 
                                    onClick={handleCreateTestLog}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-grafana-bg border border-grafana-border text-grafana-accent-blue rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-grafana-panel transition-all font-mono"
                                >
                                    <Beaker size={12} /> TEST VERİSİ GÖNDER
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-8">
                    <div className="card-base bg-grafana-panel/30 border border-grafana-border rounded-sm overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-grafana-border flex items-center justify-between bg-grafana-bg/50">
                            <div className="flex items-center gap-3">
                                <LayoutGrid size={14} className="text-grafana-accent-blue" />
                                <span className="text-[10px] font-bold text-grafana-text-primary uppercase tracking-widest font-mono">
                                    {activeTab === 'plants' ? 'SİSTEM DIŞI SANTRALLER' : 'BİLDİRİM KAYITLARI'}
                                </span>
                            </div>
                            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-sm text-[9px] font-bold text-grafana-accent-blue tabular-nums font-mono">
                                {activeTab === 'plants' ? externalPlants.length : logs.length} KAYIT
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            {querying ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <RefreshCw className="animate-spin text-grafana-accent-blue" size={24} />
                                    <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.4em] font-mono">Veriler İşleniyor...</span>
                                </div>
                            ) : activeTab === 'plants' ? (
                                <table className="scada-table">
                                    <thead>
                                        <tr>
                                            <th className="w-[80px]">ID</th>
                                            <th>SANTRAL ADI</th>
                                            <th className="text-center">GÜÇ (AC)</th>
                                            <th className="text-center">DURUM</th>
                                            <th className="text-center">ŞEHİR</th>
                                            <th className="text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {externalPlants.length === 0 ? (
                                            <tr><td colSpan={6} className="py-32 text-center opacity-20 text-[10px] font-bold uppercase font-mono">Sorgulama Bekleniyor</td></tr>
                                        ) : (
                                            externalPlants.map((plant: ExternalPlant) => (
                                                <tr key={plant.id} className="group hover:bg-white/[0.01]">
                                                    <td className="px-4 py-3 font-mono text-[10px] text-grafana-text-secondary">#{plant.id}</td>
                                                    <td className="px-4 py-3 font-bold text-white group-hover:text-grafana-accent-blue transition-colors font-mono">{plant.ad}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-grafana-text-primary font-mono">{(plant.tarihce?.acGucu || 0).toLocaleString()} <small className="opacity-40">MW</small></td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-sm text-[8px] font-bold uppercase border font-mono",
                                                            plant.durum?.id === 4 ? "bg-grafana-accent-green/5 text-grafana-accent-green border-grafana-accent-green/20" : "bg-grafana-accent-orange/5 text-grafana-accent-orange border-grafana-accent-orange/20"
                                                        )}>
                                                            {plant.durum?.ad || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-[10px] font-bold text-grafana-text-secondary font-mono">{plant.il?.ad || '-'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {importedIds.includes(plant.id) ? (
                                                                <>
                                                                    <div className="px-2 py-1 bg-grafana-accent-green/5 text-grafana-accent-green border border-grafana-accent-green/20 rounded-sm text-[8px] font-bold uppercase flex items-center gap-1 font-mono">
                                                                        <CheckCircle2 size={10}/> AKTİF
                                                                    </div>
                                                                    <button onClick={() => handleRemove(plant.id)} className="p-1.5 text-grafana-text-secondary hover:text-grafana-accent-red transition-all">
                                                                        <Trash2 size={14}/>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleImport([plant])} 
                                                                    disabled={importing} 
                                                                    className="px-3 py-1.5 bg-grafana-accent-blue text-white rounded-sm text-[9px] font-bold uppercase tracking-widest hover:bg-grafana-accent-blue/90 transition-all font-mono"
                                                                >
                                                                    SİSTEME EKLE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="scada-table">
                                    <thead>
                                        <tr>
                                            <th>ZAMAN</th>
                                            <th className="text-center">DEĞER</th>
                                            <th className="text-center">DURUM</th>
                                            <th className="text-center">DENEME</th>
                                            <th className="text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {logs.length === 0 ? (
                                            <tr><td colSpan={5} className="py-32 text-center opacity-20 text-[10px] font-bold uppercase font-mono">Kayıt Bulunmamaktadır</td></tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-white/[0.01]">
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-white font-mono">{log.readingDate}</span>
                                                            <span className="text-[9px] text-grafana-text-secondary font-mono italic">{log.readingTime || log.readingHour}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center text-[12px] font-bold text-white font-mono">{log.valueMw || log.valueMwh} <small className="opacity-40">{logType === 'instant' ? 'MW' : 'MWh'}</small></td>
                                                    <td className="px-6 py-3 text-center">
                                                        {log.isSent ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-grafana-accent-green/5 text-grafana-accent-green rounded-sm border border-grafana-accent-green/20 text-[8px] font-bold uppercase font-mono">
                                                                <CheckCircle2 size={12}/> BAŞARILI
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-grafana-accent-orange/5 text-grafana-accent-orange rounded-sm border border-grafana-accent-orange/20 text-[8px] font-bold uppercase font-mono">
                                                                <RefreshCw size={10} className={log.retryCount > 0 ? "animate-spin" : ""}/> BEKLEMEDE
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-center text-[10px] font-bold text-grafana-text-secondary font-mono">{log.retryCount} / 10</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-grafana-text-secondary hover:text-grafana-accent-red transition-all">
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
