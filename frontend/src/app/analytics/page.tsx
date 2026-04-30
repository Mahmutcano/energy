"use client";

import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
    Calendar, 
    Download, 
    Activity, 
    Cpu, 
    Database, 
    TrendingUp, 
    Clock, 
    AlertCircle, 
    Building2, 
    Factory, 
    ChevronDown, 
    RefreshCw,
    Search
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface DataPoint {
    id: string;
    dataName: string;
    unit: string | null;
}

export default function AnalyticsPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [plants, setPlants] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);

    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedPlant, setSelectedPlant] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedPoint, setSelectedPoint] = useState('');

    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hours, setHours] = useState(24);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const isAdmin = localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')!).role !== 'NORMAL_USER' : false;
                if (!isAdmin) return;

                const res = await apiRequest('/api/companies');
                if (res.ok) {
                    const result = await res.json();
                    setCompanies(result.data || result);
                }
            } catch (err) { console.error(err); }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            apiRequest('/api/plants').then(r => r.json()).then(res => {
                const data = res.data || res;
                setPlants(data.filter((p: any) => p.companyId === selectedCompany));
            });
            setSelectedPlant(''); setSelectedDevice(''); setSelectedPoint('');
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedPlant) {
            apiRequest('/api/devices').then(r => r.json()).then(res => {
                const data = res.data || res;
                setDevices(data.filter((d: any) => d.protocol?.plant?.id === selectedPlant));
            });
            setSelectedDevice(''); setSelectedPoint('');
        }
    }, [selectedPlant]);

    useEffect(() => {
        if (selectedDevice) {
            const deviceObj = devices.find(d => d.id === selectedDevice);
            if (deviceObj?.datasheetProfileId) {
                apiRequest(`/api/datasheets?profileId=${deviceObj.datasheetProfileId}`)
                    .then(r => r.json())
                    .then(res => setPoints(res.data || res));
            }
            setSelectedPoint('');
        }
    }, [selectedDevice, devices]);

    const fetchHistory = async () => {
        if (!selectedPoint) return;
        setLoading(true);
        try {
            let url = `/api/telemetry/history?pointId=${selectedPoint}`;
            if (startDate && endDate) {
                url += `&start=${startDate}&end=${endDate}`;
            } else {
                url += `&hours=${hours}`;
            }
            const res = await apiRequest(url);
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                setChartData(Array.isArray(data) ? data.map((d: any) => ({ 
                    time: d.time, 
                    value: d.value,
                    ts: new Date(d.time).getTime()
                })) : []);
            }
        } catch { toast.error("Veri çekilemedi"); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (selectedPoint) fetchHistory(); }, [selectedPoint, hours, startDate, endDate]);

    const stats = chartData.length > 0 ? {
        latest: chartData[chartData.length - 1].value.toFixed(2),
        max: Math.max(...chartData.map(d => d.value)).toFixed(2),
        min: Math.min(...chartData.map(d => d.value)).toFixed(2),
        avg: (chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(2),
        count: chartData.length,
    } : null;

    const pointUnit = points.find(p => p.id === selectedPoint)?.unit || '';

    return (
        <div className="space-y-8 pb-20 font-sans">
            <PageHeader 
                title="GEÇMİŞ" 
                highlightedTitle="ANALİZ"
                subtitle="Saha telemetri verilerinin zamansal korelasyonu ve eğilim grafikleri"
                icon={TrendingUp}
            >
                <div className="flex items-center gap-4">
                     {/* Export */}
                    <button className="flex items-center gap-3 px-6 py-2.5 bg-grafana-bg border border-grafana-border text-grafana-text-primary rounded-sm text-[10px] font-bold hover:bg-grafana-panel transition-all tracking-widest uppercase font-mono">
                        <Download size={14} /> EXCEL AKTAR
                    </button>
                    
                    <button 
                        onClick={fetchHistory}
                        className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-bold shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all tracking-widest uppercase font-mono"
                    >
                        <RefreshCw size={14} className={cn(loading && "animate-spin")} /> GÜNCELLE
                    </button>
                </div>
            </PageHeader>

            {/* Controls Matris */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {[
                    { label: 'KURUM', val: selectedCompany, setter: setSelectedCompany, data: companies, nameKey: 'name' },
                    { label: 'SANTRAL', val: selectedPlant, setter: setSelectedPlant, data: plants, nameKey: 'plantName' },
                    { label: 'CİHAZ', val: selectedDevice, setter: setSelectedDevice, data: devices, nameKey: 'deviceName' },
                    { label: 'SİNYAL', val: selectedPoint, setter: setSelectedPoint, data: points, nameKey: 'dataName' }
                ].map((sel, idx) => (
                    <div key={idx} className="space-y-2">
                        <label className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest ml-1">{sel.label}</label>
                        <select 
                            value={sel.val} 
                            onChange={e => sel.setter(e.target.value)} 
                            className="w-full bg-grafana-panel border border-grafana-border rounded-sm p-4 text-[11px] font-bold text-white outline-none focus:border-grafana-accent-blue transition-all font-mono appearance-none cursor-pointer"
                        >
                            <option value="">{sel.label} SEÇİN...</option>
                            {sel.data.map((item: any) => <option key={item.id} value={item.id}>{item[sel.nameKey]}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Viewport */}
                <div className="xl:col-span-9 space-y-6">
                    <div className="card-base bg-grafana-panel/30 border border-grafana-border/60 overflow-hidden">
                        <div className="px-6 py-4 border-b border-grafana-border flex justify-between items-center bg-grafana-bg/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-sm bg-grafana-accent-blue/10 text-grafana-accent-blue">
                                    <Activity size={16} />
                                </div>
                                <h3 className="text-xs font-bold text-grafana-text-primary tracking-widest uppercase font-mono">TELEMETRİ TRENDİ</h3>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex bg-grafana-bg border border-grafana-border rounded-sm p-1">
                                    {[1, 6, 12, 24, 168].map(h => (
                                        <button 
                                            key={h}
                                            onClick={() => { setHours(h); setStartDate(''); setEndDate(''); }}
                                            className={cn(
                                                "px-3 py-1.5 rounded-sm text-[9px] font-bold transition-all font-mono",
                                                hours === h ? "bg-grafana-accent-blue text-white shadow-sm" : "text-grafana-text-secondary hover:text-white"
                                            )}
                                        >
                                            {h < 24 ? `${h}S` : `${h/24}G`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-[450px] p-8">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <RefreshCw className="animate-spin text-grafana-accent-blue" size={32} />
                                    <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.4em] animate-pulse">Saha Verileri Analiz Ediliyor...</span>
                                </div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#5794f2" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#5794f2" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis 
                                            dataKey="time" 
                                            stroke="#6e7174" 
                                            fontSize={9} 
                                            tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            stroke="#6e7174" 
                                            fontSize={9} 
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => v.toFixed(1)}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#181b1f', border: '1px solid #262626', borderRadius: '4px', fontSize: '10px' }}
                                            itemStyle={{ color: '#5794f2', fontWeight: 'bold' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#5794f2" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorValue)" 
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                                    <Database size={48} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Görüntülenecek Veri Bulunmamaktadır</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="card-base p-6 bg-grafana-panel/50 space-y-8">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">OKUMA HACMİ</span>
                            <div className="text-3xl font-bold text-white tabular-nums tracking-tighter">{stats?.count || 0} <span className="text-xs text-slate-500 font-medium">Pkt</span></div>
                        </div>

                        <div className="space-y-6 pt-4 border-t border-grafana-border/40">
                            {[
                                { label: 'SON DEĞER', val: stats?.latest, color: 'text-grafana-accent-blue', icon: Clock },
                                { label: 'MAKSİMUM', val: stats?.max, color: 'text-grafana-accent-orange', icon: TrendingUp },
                                { label: 'MİNİMUM', val: stats?.min, color: 'text-grafana-accent-blue', icon: Activity },
                                { label: 'ORTALAMA', val: stats?.avg, color: 'text-grafana-text-primary', icon: RefreshCw },
                            ].map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-1.5 rounded-sm bg-slate-900", s.color)}>
                                            <s.icon size={12} />
                                        </div>
                                        <span className="text-[9px] font-black text-grafana-text-secondary uppercase tracking-widest font-mono">{s.label}</span>
                                    </div>
                                    <span className={cn("text-xs font-bold tabular-nums font-mono", s.color)}>{s.val || '---'} {pointUnit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-base p-6 bg-grafana-bg/50 border-dashed border-grafana-border space-y-4">
                        <h4 className="text-[10px] font-black text-grafana-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
                            <Calendar size={14} /> ÖZEL TARİH ARALIĞI
                        </h4>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Başlangıç</span>
                                <input 
                                    type="datetime-local" 
                                    value={startDate} 
                                    onChange={e => { setStartDate(e.target.value); setHours(0); }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-sm p-3 text-[10px] font-bold text-white outline-none focus:border-grafana-accent-blue font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bitiş</span>
                                <input 
                                    type="datetime-local" 
                                    value={endDate} 
                                    onChange={e => { setEndDate(e.target.value); setHours(0); }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-sm p-3 text-[10px] font-bold text-white outline-none focus:border-grafana-accent-blue font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
