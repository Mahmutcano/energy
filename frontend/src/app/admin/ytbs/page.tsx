"use client";

import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Trash2, ShieldCheck, Activity, Link as LinkIcon, Building2, ExternalLink, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import YtbsLogViewer from '@/components/ytbs/YtbsLogViewer';

export default function YtbsIntegrationPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'plants' | 'logs'>('plants');
    const [ytbsPlants, setYtbsPlants] = useState<any[]>([]);
    const [scadaPlants, setScadaPlants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        plantId: '',
        ytbsId: '',
        licenseNo: '',
        plantName: '',
        capacityAc: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ytbsRes, scadaRes, statsRes] = await Promise.all([
                apiRequest('/api/ytbs/plants'),
                apiRequest('/api/plants'), // Assume we have this
                apiRequest('/api/ytbs/stats')
            ]);

            if (ytbsRes.ok) {
                const data = await ytbsRes.json();
                setYtbsPlants(Array.isArray(data) ? data : []);
            }
            if (scadaRes.ok) {
                const data = await scadaRes.json();
                setScadaPlants(Array.isArray(data) ? data : []);
            }
            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiRequest('/api/ytbs/plants', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success('YTBS kaydı oluşturuldu.');
                setIsModalOpen(false);
                setFormData({ plantId: '', ytbsId: '', licenseNo: '', plantName: '', capacityAc: '' });
                fetchData();
            } else {
                const result = await res.json();
                toast.error(result.message || 'Bir hata oluştu');
            }
        } catch (error) {
            toast.error('Bağlantı hatası');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu YTBS eşlemesini silmek istediğinize emin misiniz?')) return;
        try {
            const res = await apiRequest(`/api/ytbs/plants/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Eşleme silindi');
                setYtbsPlants(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error('Silinirken hata oluştu');
            }
        } catch (err) {
            toast.error('Silinirken hata oluştu');
        }
    };

    const triggerSync = async () => {
        setIsSyncing(true);
        try {
            const res = await apiRequest('/api/ytbs/sync', { method: 'POST' });
            if (res.ok) {
                toast.success('Manuel senkronizasyon tetiklendi. Arka planda işleniyor.');
                fetchData();
            } else {
                toast.error('Tetikleme başarısız');
            }
        } catch (e) {
            toast.error('Tetikleme başarısız');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight">TEİAŞ YTBS Entegrasyonu</h1>
                    </div>
                    <p className="text-sm text-slate-500">Santral bazlı YTBS bağlantılarını ve veri senkronizasyonunu yönetin.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => router.push('/admin/ytbs/query')}
                        className="flex items-center gap-3 px-6 py-3 bg-slate-900 border border-brand-green/30 text-brand-green rounded-xl text-xs font-bold transition-all hover:bg-slate-800 tracking-widest uppercase"
                    >
                        <Search size={16} strokeWidth={3} /> Lisanssız Santral Sorgula
                    </button>
                    <button
                        onClick={triggerSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold transition-all hover:bg-slate-800 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isSyncing ? "animate-spin text-brand-green" : ""} />
                        Manuel Senkronizasyon
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-widest"
                    >
                        <Plus size={16} strokeWidth={3} /> Yeni Eşleme Ekle
                    </button>
                </div>
            </div>

            {/* Sync Queue Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-base p-6 bg-slate-900/40 border-slate-800/40 relative overflow-hidden flex flex-col items-center justify-center text-center">
                        <div className="absolute top-4 right-4 opacity-10"><Database size={48} /></div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Anlık Üretim Kuyruğu (15DK)</h3>
                        <div className="flex gap-12">
                            <div>
                                <p className="text-3xl font-black text-white">{stats.instant.unsent}</p>
                                <p className="text-[10px] text-brand-green uppercase font-bold tracking-widest mt-1">Bekleyen</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-400">{stats.instant.sent}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Gönderilen</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-red-400">{stats.instant.failed}</p>
                                <p className="text-[10px] text-red-500 uppercase font-bold tracking-widest mt-1">Hatalı (Timeout)</p>
                            </div>
                        </div>
                    </div>

                    <div className="card-base p-6 bg-slate-900/40 border-slate-800/40 relative overflow-hidden flex flex-col items-center justify-center text-center">
                        <div className="absolute top-4 right-4 opacity-10"><Activity size={48} /></div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Saatlik Üretim Kuyruğu (MWh)</h3>
                        <div className="flex gap-12">
                            <div>
                                <p className="text-3xl font-black text-white">{stats.hourly.unsent}</p>
                                <p className="text-[10px] text-brand-green uppercase font-bold tracking-widest mt-1">Bekleyen</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-400">{stats.hourly.sent}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Gönderilen</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-red-400">{stats.hourly.failed}</p>
                                <p className="text-[10px] text-red-500 uppercase font-bold tracking-widest mt-1">Hatalı (Timeout)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800/60 pb-px">
                <button
                    onClick={() => setActiveTab('plants')}
                    className={`px-8 py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${activeTab === 'plants' ? 'border-brand-green text-white bg-brand-green/5' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                    Santraller
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-8 py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${activeTab === 'logs' ? 'border-brand-green text-white bg-brand-green/5' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                    Log Kayıtları (Gönderimler)
                </button>
            </div>

            {activeTab === 'plants' ? (
                /* Plants Table */
                <div className="card-base bg-slate-950/50 border border-slate-800/60 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white tracking-widest uppercase">Eşleşmiş Santraller</h2>
                    </div>
                    {loading ? (
                        <div className="p-12 pl-6 text-slate-500 animate-pulse text-xs tracking-widest font-black uppercase">Yükleniyor...</div>
                    ) : ytbsPlants.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-700">
                                <LinkIcon size={24} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Henüz hiçbir santral YTBS sistemine bağlanmamış.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-[10px] text-slate-500 uppercase bg-slate-900/50 font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Sistem Santrali</th>
                                        <th className="px-6 py-4">YTBS ID</th>
                                        <th className="px-6 py-4">Lisans No</th>
                                        <th className="px-6 py-4">YTBS Santral Adı</th>
                                        <th className="px-6 py-4">AC Güç (KW)</th>
                                        <th className="px-6 py-4">Durum</th>
                                        <th className="px-6 py-4 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
                                    {ytbsPlants.map((plant) => (
                                        <tr key={plant.id} className="hover:bg-slate-900/30 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-slate-900 rounded-lg">
                                                    <Building2 size={14} className="text-brand-green" />
                                                </div>
                                                <span className="font-bold text-white">{plant.plant?.plantName || 'Bilinmiyor'}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-400">{plant.ytbsId}</td>
                                            <td className="px-6 py-4 font-mono text-slate-400">{plant.licenseNo}</td>
                                            <td className="px-6 py-4">{plant.plantName}</td>
                                            <td className="px-6 py-4 font-mono">{plant.capacityAc} kW</td>
                                            <td className="px-6 py-4">
                                                {plant.isActive ? (
                                                    <span className="px-2.5 py-1 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-md text-[10px] font-black uppercase tracking-wider">Aktif</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-md text-[10px] font-black uppercase tracking-wider">Pasif</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(plant.id)}
                                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* Logs View */
                <YtbsLogViewer />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Yeni YTBS Eşlemesi Ekle"
                subtitle="TEİAŞ gönderimleri için bir SCADA santralini YTBS lisans bilgileriyle eşleştirin"
                icon={LinkIcon}
                maxWidth="md"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block">SİSTEM SANTRALİ (SCADA)</label>
                        <select
                            value={formData.plantId}
                            onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                            required
                        >
                            <option value="">Santral Seçiniz</option>
                            {scadaPlants.filter(sp => !ytbsPlants.some(yp => yp.plantId === sp.id)).map(p => (
                                <option key={p.id} value={p.id}>{p.plantName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block">LİSANS NO</label>
                            <input
                                type="text"
                                value={formData.licenseNo}
                                onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block">YTBS LİSANSSIZ SANTRAL ID</label>
                            <input
                                type="number"
                                value={formData.ytbsId}
                                onChange={(e) => setFormData({ ...formData, ytbsId: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block">YTBS KAYITLI ADI</label>
                            <input
                                type="text"
                                value={formData.plantName}
                                onChange={(e) => setFormData({ ...formData, plantName: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block">AC GÜCÜ (kW)</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.capacityAc}
                                onChange={(e) => setFormData({ ...formData, capacityAc: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-brand-green/50 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-brand-green text-white font-black tracking-[0.2em] text-xs rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all uppercase shadow-lg shadow-brand-green/20"
                        >
                            {isSubmitting ? 'KAYDEDİLİYOR...' : 'EŞLEŞTİRMEYİ TAMAMLA'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
