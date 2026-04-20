import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Trash2, CheckCircle2, XCircle, Clock, Calendar, BarChart3, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogRecord {
    id: string;
    ytbsPlantId: string;
    readingDate: string;
    readingHour?: string;
    readingTime?: string;
    valueMwh?: number;
    valueMw?: number;
    isSent: boolean;
    retryCount: number;
    lastAttemptAt: string | null;
    createdAt: string;
    ytbsPlant: {
        plantName: string;
        licenseNo: string;
    };
}

export default function YtbsLogViewer() {
    const [type, setType] = useState<'hourly' | 'instant'>('hourly');
    const [logs, setLogs] = useState<LogRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [type]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiRequest(`/api/ytbs/logs?type=${type}`);
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (error) {
            console.error('Logs fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await apiRequest(`/api/ytbs/logs/${type}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Kayıt silindi');
                setLogs(prev => prev.filter(l => l.id !== id));
            }
        } catch (error) {
            toast.error('Silme hatası');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 p-1 bg-slate-900/50 rounded-xl w-fit">
                <button
                    onClick={() => setType('hourly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${type === 'hourly' ? 'bg-brand-green text-white' : 'text-slate-500 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart3 size={14} /> Saatlik Üretim
                    </div>
                </button>
                <button
                    onClick={() => setType('instant')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${type === 'instant' ? 'bg-brand-green text-white' : 'text-slate-500 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Zap size={14} /> 15DK Anlık Arz
                    </div>
                </button>
            </div>

            <div className="card-base bg-slate-950/50 border border-slate-800/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-900/50 font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Santral</th>
                                <th className="px-6 py-4">Tarih / Saat</th>
                                <th className="px-6 py-4">Değer ({type === 'hourly' ? 'MWh' : 'MW'})</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4">Deneme</th>
                                <th className="px-6 py-4 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center animate-pulse text-xs uppercase tracking-widest font-bold">Yükleniyor...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">Kayıt bulunamadı.</td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-white mb-0.5">{log.ytbsPlant.plantName}</p>
                                        <p className="text-[10px] text-slate-500">Lisans: {log.ytbsPlant.licenseNo}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar size={12} /> {log.readingDate}
                                            <Clock size={12} className="ml-2" /> {type === 'hourly' ? log.readingHour : log.readingTime}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-brand-green">
                                        {type === 'hourly' ? log.valueMwh : log.valueMw}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.isSent ? (
                                            <div className="flex items-center gap-2 text-brand-green">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[10px] font-black uppercase">Gönderildi</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-yellow-500">
                                                <Clock size={14} />
                                                <span className="text-[10px] font-black uppercase">Bekliyor</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{log.retryCount}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
