"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Download, Factory, Activity,
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2,
    ChevronRight, ArrowLeftRight, Database, LayoutGrid,
    Trash2, Beaker, Globe, FileEdit,
    Zap
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
    const [activeTab, setActiveTab] = useState<'import' | 'plants' | 'data' | 'reports'>('import');
    const [logType, setLogType] = useState<'instant' | 'hourly'>('instant');
    const [logs, setLogs] = useState<any[]>([]);
    const filteredLogs = activeTab === 'reports' ? logs.filter(l => l.isSent) : logs;

    const handleExport = () => {
        if (logs.length === 0) {
            toast.error('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        // Simple CSV export
        const headers = ['Tarih', 'Saat/Saatlik', 'Değer', 'Birim', 'Durum'].join(',');
        const rows = logs.map(log => [
            log.readingDate,
            log.readingTime || log.readingHour,
            log.valueMw || log.valueMwh,
            logType === 'instant' ? 'MW' : 'MWh',
            log.isSent ? 'GÖNDERİLDİ' : 'BEKLEMEDE'
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ytbs_rapor_${logType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Rapor indirildi.');
    };

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedPlantId, setSelectedPlantId] = useState(''); // This is the YtbsPlant UUID
    const [importedPlants, setImportedPlants] = useState<any[]>([]);
    const [testValue, setTestValue] = useState<string>('');
    const [testDate, setTestDate] = useState(startDate);
    const [testTime, setTestTime] = useState('01:00');

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
            const res = await apiRequest(`/api/ytbs/logs?type=${logType}&companyId=${selectedCompanyId}&plantId=${selectedPlantId}&startDate=${startDate}&endDate=${endDate}`);
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

    const fetchImportedPlants = async (companyId: string) => {
        if (!companyId) return;
        setLoading(true);
        try {
            const res = await apiRequest(`/api/ytbs/plants?companyId=${companyId}`);
            if (res.ok) {
                const result = await res.json();
                setImportedPlants(result.data || []);
            }
        } catch (err) {
            console.error('Imported plants fetch error:', err);
            toast.error('Santral listesi yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyChange = (id: string) => {
        setSelectedCompanyId(id);
        setSelectedPlantId('');
        setExternalPlants([]);
        setLogs([]);
        if (id) {
            fetchImportedPlants(id);
        }
    };

    const fetchImportedIds = async (companyId: string) => {
        if (!companyId) return;
        try {
            const res = await apiRequest(`/api/ytbs/imported-ids?companyId=${companyId}`);
            if (res.ok) {
                const result = await res.json();
                setImportedIds(result.data || []);
            }
        } catch (err) {
            console.error('Imported IDs fetch error:', err);
        }
    };

    const handleQuery = async () => {
        if (!selectedCompanyId) {
            toast.error('Lütfen bir firma seçin');
            return;
        }

        setQuerying(true);
        // Her sorguda güncel aktarılmış ID listesini çek
        await fetchImportedIds(selectedCompanyId);

        if (activeTab === 'data') {
            await fetchLogs();
            setQuerying(false);
            return;
        }

        if (activeTab === 'plants') {
            await fetchImportedPlants(selectedCompanyId);
            setQuerying(false);
            return;
        }

        // Import tab logic (external)
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
                const data = result.data || result;

                if (plantsToImport.length === 1) {
                    toast.success(`[${plantsToImport[0].ad}] santrali başarıyla sisteme aktarıldı.`, { id: t });
                } else {
                    toast.success(`${data.importedCount || plantsToImport.length} santral başarıyla sisteme aktarıldı.`, { id: t });
                }

                // Ensure IDs are treated as numbers for consistency
                const newIds = plantsToImport.map(p => Number(p.id));
                setImportedIds(prev => [...prev, ...newIds]);
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
            toast.error('Hata oluştu', { id: t });
        }
    };

    const handleSendLog = async (id: string) => {
        if (!confirm('Bu veri YTBS sistemine (TEİAŞ) anlık olarak gönderilecektir. Onaylıyor musunuz?')) return;
        const t = toast.loading('Veri gönderiliyor...');
        try {
            const res = await apiRequest(`/api/ytbs/logs/${logType}/${id}/send`, { method: 'POST' });
            if (res.ok) {
                toast.success('Başarıyla gönderildi', { id: t });
                fetchLogs();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Gönderim başarısız', { id: t });
            }
        } catch (err) {
            toast.error('Hata oluştu', { id: t });
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Bu kayıt yerel veritabanından kalıcı olarak silinecektir. Emin misiniz?')) return;
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

    const handleCreateTestLog = async (logType: 'instant' | 'hourly', manualYtbsId?: number, manualLicense?: string, value?: number, date?: string, time?: string) => {
        if (!selectedCompanyId) {
            toast.error('Lütfen önce bir firma seçin');
            return;
        }

        const t = toast.loading('Taslak kayıt oluşturuluyor...');
        try {
            const res = await apiRequest('/api/ytbs/test-log', {
                method: 'POST',
                body: JSON.stringify({
                    companyId: selectedCompanyId,
                    type: logType,
                    ytbsId: manualYtbsId ? Number(manualYtbsId) : undefined,
                    licenseNo: manualLicense,
                    value: value,
                    date: date,
                    time: time
                })
            });
            if (res.ok) {
                toast.success('Taslak kayıt başarıyla oluşturuldu', { id: t });
                setTestValue('');
                fetchLogs();
            } else {
                const errData = await res.json();
                toast.error(`Hata: ${errData.error || 'Oluşturulamadı'}`, { id: t });
            }
        } catch (err) {
            toast.error('Bağlantı hatası oluştu', { id: t });
        }
    };

    useEffect(() => {
        if (selectedCompanyId) {
            fetchImportedIds(selectedCompanyId);
        }
    }, [selectedCompanyId]);

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
                            onClick={() => setActiveTab('import')}
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'import' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            DIŞ SANTRAL AKTARIMI
                        </button>
                        <button
                            onClick={() => setActiveTab('plants')}
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'plants' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            SİSTEM SANTRALLERİ
                        </button>
                        <button
                            onClick={() => setActiveTab('data')}
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'data' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            VERİ YÖNETİMİ
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={cn(
                                "px-4 py-1.5 rounded-sm text-[10px] font-bold transition-all font-mono",
                                activeTab === 'reports' ? "bg-grafana-accent-blue text-white" : "text-grafana-text-secondary hover:text-white"
                            )}
                        >
                            GÖNDERİM GEÇMİŞİ
                        </button>
                    </div>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-4">
                    <div className="card-base p-6 bg-grafana-panel/50 space-y-6">
                        <div className="space-y-4">
                            {/* Firma Seçimi (Shared) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Building2 size={12} className="text-grafana-accent-blue" /> ŞİRKET SEÇİMİ
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCompanyId}
                                        onChange={(e) => handleCompanyChange(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-xs font-bold text-white focus:border-grafana-accent-blue outline-none appearance-none pr-12 font-mono disabled:opacity-50"
                                    >
                                        <option value="">{loading ? 'ŞİRKETLER YÜKLENİYOR...' : 'FİRMA SEÇİNİZ...'}</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {(!c.ytbsUsername || !c.ytbsApiKey) ? '⚠️' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-grafana-text-secondary">
                                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} className="rotate-90" />}
                                    </div>
                                </div>
                            </div>

                            {(activeTab === 'data' || activeTab === 'reports') && (
                                <>
                                    {/* Santral Seçimi */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Factory size={12} className="text-grafana-accent-blue" /> SANTRAL SEÇİMİ
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedPlantId}
                                                onChange={(e) => setSelectedPlantId(e.target.value)}
                                                disabled={!selectedCompanyId || loading}
                                                className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-xs font-bold text-white focus:border-grafana-accent-blue outline-none appearance-none pr-12 font-mono disabled:opacity-30"
                                            >
                                                <option value="">{loading ? 'YÜKLENİYOR...' : 'TÜM SANTRALLER'}</option>
                                                {importedPlants.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.plantName} ({p.ytbsCode})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-grafana-text-secondary">
                                                {loading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} className="rotate-90" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarih Aralığı */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1">BAŞLANGIÇ</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-3 py-2 text-xs font-bold text-white focus:border-grafana-accent-blue outline-none font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1">BİTİŞ</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-3 py-2 text-xs font-bold text-white focus:border-grafana-accent-blue outline-none font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Veri Sıklığı (Enum) */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1">VERİ SIKLIĞI</label>
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
                                    </div>
                                </>
                            )}

                            {/* Ana İşlem Butonları */}
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <button
                                    onClick={handleQuery}
                                    disabled={querying || !selectedCompanyId}
                                    className="w-full h-11 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-black uppercase tracking-widest shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all disabled:opacity-30 flex items-center justify-center gap-3 font-mono"
                                >
                                    {querying ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} strokeWidth={3} />}
                                    {activeTab === 'import' ? 'DIŞ SİSTEMİ SORGULA' : activeTab === 'plants' ? 'SİSTEM SANTRALLERİNİ GETİR' : 'VERİLERİ GETİR'}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'reports' && (
                            <div className="pt-6 border-t border-grafana-border">
                                <button
                                    onClick={handleExport}
                                    disabled={logs.length === 0}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-grafana-accent-green/10 border border-grafana-accent-green/20 text-grafana-accent-green rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-grafana-accent-green/20 transition-all font-mono disabled:opacity-30"
                                >
                                    <Download size={12} /> RAPORU İNDİR (CSV)
                                </button>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="pt-6 border-t border-grafana-border space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Zap size={12} className="text-grafana-accent-orange" /> MANUEL VERİ GİRİŞİ (TASLAK)
                                    </label>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Değer Girişi */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-grafana-text-secondary ml-1">ÜRETİM DEĞERİ ({logType === 'instant' ? 'MW' : 'MWh'})</span>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    placeholder="0.0000"
                                                    value={testValue}
                                                    onChange={(e) => setTestValue(e.target.value)}
                                                    className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-lg font-bold text-white focus:border-grafana-accent-blue outline-none font-mono"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-grafana-text-secondary font-mono">
                                                    {logType === 'instant' ? 'MW' : 'MWh'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tarih ve Saat Seçimi */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-grafana-text-secondary ml-1 uppercase">Zaman Seçimi</span>
                                                <input
                                                    type="date"
                                                    value={testDate}
                                                    onChange={(e) => setTestDate(e.target.value)}
                                                    className="bg-transparent border-none text-[10px] font-bold text-grafana-accent-blue focus:outline-none font-mono cursor-pointer"
                                                />
                                            </div>

                                            {/* Saat Grid'i */}
                                            <div className={cn(
                                                "grid gap-1 max-h-[160px] overflow-y-auto p-1 bg-black/20 rounded-sm border border-grafana-border/50",
                                                logType === 'instant' ? "grid-cols-4" : "grid-cols-6"
                                            )}>
                                                {Array.from({ length: logType === 'instant' ? 96 : 24 }).map((_, i) => {
                                                    let timeLabel = "";
                                                    if (logType === 'hourly') {
                                                        timeLabel = `${String(i + 1).padStart(2, '0')}:00`;
                                                    } else {
                                                        const h = Math.floor(i / 4);
                                                        const m = (i % 4) * 15;
                                                        timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                    }

                                                    const isSelected = testTime === timeLabel;

                                                    return (
                                                        <button
                                                            key={timeLabel}
                                                            onClick={() => setTestTime(timeLabel)}
                                                            className={cn(
                                                                "py-1.5 rounded-[2px] text-[9px] font-bold font-mono transition-all border",
                                                                isSelected
                                                                    ? "bg-grafana-accent-blue text-white border-grafana-accent-blue shadow-[0_0_8px_rgba(0,120,215,0.3)]"
                                                                    : "bg-grafana-bg text-grafana-text-secondary border-grafana-border hover:border-grafana-text-secondary"
                                                            )}
                                                        >
                                                            {timeLabel}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const plant = importedPlants.find(p => p.id === selectedPlantId);
                                        handleCreateTestLog(
                                            logType,
                                            plant ? Number(plant.ytbsId) : undefined,
                                            undefined,
                                            testValue ? Number(testValue) : undefined,
                                            testDate,
                                            testTime
                                        );
                                    }}
                                    disabled={!selectedCompanyId || !testValue}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-grafana-accent-blue/90 transition-all font-mono shadow-xl shadow-grafana-accent-blue/20 disabled:opacity-30"
                                >
                                    <Beaker size={14} /> TASLAK OLARAK KAYDET
                                </button>
                                <p className="text-[8px] text-center text-grafana-text-secondary font-mono leading-relaxed px-4">
                                    * Kayıtlar sisteme TASLAK olarak eklenir. Kontrol ettikten sonra yanlarındaki GÖNDER butonu ile TEİAŞa iletebilirsiniz.
                                </p>
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
                                    {activeTab === 'import' ? 'DIŞ SİSTEM (TEİAŞ) SANTRAL LİSTESİ' : activeTab === 'plants' ? 'SİSTEME ENTEGRE SANTRALLER' : 'VERİ & BİLDİRİM KAYITLARI'}
                                </span>
                            </div>
                            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-sm text-[9px] font-bold text-grafana-accent-blue tabular-nums font-mono">
                                {activeTab === 'import' ? externalPlants.length : activeTab === 'plants' ? importedPlants.length : logs.length} KAYIT
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            {querying ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <RefreshCw className="animate-spin text-grafana-accent-blue" size={24} />
                                    <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.4em] font-mono">Veriler İşleniyor...</span>
                                </div>
                            ) : activeTab === 'import' ? (
                                <table className="scada-table">
                                    <thead>
                                        <tr>
                                            <th className="w-[80px]">ID</th>
                                            <th>SANTRAL ADI</th>
                                            <th className="text-center">HIZLI TEST</th>
                                            <th className="text-center">GÜÇ (AC)</th>
                                            <th className="text-center">DURUM</th>
                                            <th className="text-center">ŞEHİR</th>
                                            <th className="text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {externalPlants.length === 0 ? (
                                            <tr><td colSpan={7} className="py-32 text-center opacity-20 text-[10px] font-bold uppercase font-mono">Sorgulama Bekleniyor</td></tr>
                                        ) : (() => {
                                            const getIsImported = (p: any) => {
                                                if (p.isImported !== undefined) return p.isImported;
                                                return importedIds.some(id => String(id) === String(p.id));
                                            };

                                            const imported = externalPlants.filter(p => getIsImported(p));
                                            const notImported = externalPlants.filter(p => !getIsImported(p));

                                            const renderRow = (plant: ExternalPlant, isAlreadyImported: boolean) => (
                                                <tr key={plant.id} className={cn("group hover:bg-white/[0.01]", isAlreadyImported && "bg-grafana-bg/20 opacity-70")}>
                                                    <td className="px-4 py-3 font-mono text-[10px] text-grafana-text-secondary">#{plant.id}</td>
                                                    <td className="px-4 py-3 font-bold text-white group-hover:text-grafana-accent-blue transition-colors font-mono">
                                                        <span>{plant.ad}</span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCreateTestLog('instant', plant.id, plant.baglantiAnlasmasiSirketi?.id)}
                                                                className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded hover:bg-yellow-500/30 transition-colors text-[8px] font-bold font-mono"
                                                                title="Anlık Test Verisi Oluştur"
                                                            >
                                                                ANLIK
                                                            </button>
                                                            <button
                                                                onClick={() => handleCreateTestLog('hourly', plant.id, plant.baglantiAnlasmasiSirketi?.id)}
                                                                className="px-2 py-1 bg-orange-500/20 text-orange-500 rounded hover:bg-orange-500/30 transition-colors text-[8px] font-bold font-mono"
                                                                title="Saatlik Test Verisi Oluştur"
                                                            >
                                                                SAATLİK
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-grafana-text-primary font-mono">{(plant.tarihce?.acGucu || 0).toLocaleString()} <small className="opacity-40">MW</small></td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-sm text-[8px] font-bold uppercase border font-mono",
                                                            plant.durum?.id === 4 ? "bg-grafana-accent-green/5 text-grafana-accent-green border-grafana-accent-green/20" : "bg-grafana-accent-orange/5 text-grafana-accent-orange border-grafana-accent-orange/20"
                                                        )}>
                                                            {plant.durum?.ad || 'BİLİNMİYOR'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-grafana-text-secondary font-mono text-[10px]">{plant.il?.ad || '-'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {isAlreadyImported ? (
                                                            <div className="flex items-center justify-end gap-2 text-grafana-accent-green text-[10px] font-black font-mono">
                                                                <CheckCircle2 size={14} /> AKTARILDI
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleImport([plant])}
                                                                disabled={importing}
                                                                className="px-4 py-2 bg-grafana-accent-blue text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-grafana-accent-blue/90 transition-all font-mono shadow-lg shadow-grafana-accent-blue/20"
                                                            >
                                                                SİSTEME AKTAR
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );

                                            return (
                                                <>
                                                    {notImported.length > 0 && (
                                                        <>
                                                            <tr className="bg-grafana-accent-orange/5">
                                                                <td colSpan={7} className="px-4 py-2 border-y border-grafana-accent-orange/20 text-center">
                                                                    <span className="text-[9px] font-black text-grafana-accent-orange uppercase tracking-[0.3em] font-mono">SİSTEMDE OLMAYAN SANTRALLER ({notImported.length})</span>
                                                                </td>
                                                            </tr>
                                                            {notImported.map(p => renderRow(p, false))}
                                                        </>
                                                    )}
                                                    {imported.length > 0 && (
                                                        <>
                                                            <tr className="bg-grafana-accent-green/5">
                                                                <td colSpan={7} className="px-4 py-2 border-y border-grafana-accent-green/20 text-center">
                                                                    <span className="text-[9px] font-black text-grafana-accent-green uppercase tracking-[0.3em] font-mono">SİSTEME AKTARILMIŞ SANTRALLER ({imported.length})</span>
                                                                </td>
                                                            </tr>
                                                            {imported.map(p => renderRow(p, true))}
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            ) : activeTab === 'plants' ? (
                                <table className="scada-table">
                                    <thead>
                                        <tr>
                                            <th>SANTRAL ADI</th>
                                            <th className="text-center">YTBS KODU</th>
                                            <th className="text-center">LİSANS NO</th>
                                            <th className="text-center">KAPASİTE</th>
                                            <th className="text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {importedPlants.length === 0 ? (
                                            <tr><td colSpan={5} className="py-32 text-center opacity-20 text-[10px] font-bold uppercase font-mono">Sistemde Kayıtlı Santral Yok</td></tr>
                                        ) : (
                                            importedPlants.map((plant) => (
                                                <tr key={plant.id} className="hover:bg-white/[0.01]">
                                                    <td className="px-6 py-4 font-bold text-white font-mono">{plant.plantName}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-grafana-accent-blue">{plant.ytbsCode}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-grafana-text-secondary">{plant.licenseNo || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-white">{plant.installedPower || '-'} <small className="opacity-40">MW</small></td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setActiveTab('data')}
                                                            className="px-3 py-1.5 bg-grafana-bg border border-grafana-border text-[9px] font-black uppercase tracking-widest hover:border-grafana-accent-blue transition-all font-mono"
                                                        >
                                                            VERİLERİ YÖNET
                                                        </button>
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
                                        {filteredLogs.length === 0 ? (
                                            <tr><td colSpan={5} className="py-32 text-center opacity-20 text-[10px] font-bold uppercase font-mono">Kayıt Bulunmamaktadır</td></tr>
                                        ) : (
                                            filteredLogs.map((log) => (
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
                                                                <CheckCircle2 size={12} /> BAŞARILI
                                                            </div>
                                                        ) : log.retryCount === -1 ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded-sm border border-slate-500/20 text-[8px] font-bold uppercase font-mono">
                                                                <FileEdit size={10} /> TASLAK
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-grafana-accent-orange/5 text-grafana-accent-orange rounded-sm border border-grafana-accent-orange/20 text-[8px] font-bold uppercase font-mono">
                                                                <RefreshCw size={10} className={log.retryCount > 0 ? "animate-spin" : ""} /> BEKLEMEDE
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-center text-[10px] font-bold text-grafana-text-secondary font-mono">
                                                        {log.retryCount === -1 ? '-' : `${log.retryCount} / 10`}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleSendLog(log.id)}
                                                                className={cn(
                                                                    "px-2 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest transition-all font-mono border",
                                                                    log.isSent
                                                                        ? "bg-grafana-bg border-grafana-border text-grafana-text-secondary hover:text-white hover:border-white"
                                                                        : "bg-grafana-accent-green/20 text-grafana-accent-green border-grafana-accent-green/30 hover:bg-grafana-accent-green/30"
                                                                )}
                                                            >
                                                                {log.isSent ? 'YENİDEN GÖNDER' : 'GÖNDER'}
                                                            </button>
                                                            <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-grafana-text-secondary hover:text-grafana-accent-red transition-all">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
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
