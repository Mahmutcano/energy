"use client";

import HistoricalChart from '@/components/HistoricalChart';
import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, TrendingUp, Info, Activity, Building2, Factory, Cpu, Database, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';

interface Company { id: string; name: string; }
interface Plant { id: string; plantName: string; companyId: string; }
interface Device { id: string; deviceName: string; deviceType: string; protocol: { plant: { id: string } }; datasheetProfileId: string; }
interface DataPoint { id: string; dataName: string; unit?: string; dataType?: string; }

export default function Analytics() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [selectedPoint, setSelectedPoint] = useState<string>('');
    const [hours, setHours] = useState<number>(24);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await apiRequest('/api/companies');
                if (res.ok) setCompanies(await res.json());
            } catch (err) { console.error("Fetch companies error:", err); }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        if (!selectedCompany) { setPlants([]); return; }
        const fetchPlants = async () => {
            const res = await apiRequest('/api/plants');
            if (res.ok) { const all = await res.json(); setPlants(all.filter((p: any) => p.companyId === selectedCompany)); }
        };
        fetchPlants();
        setSelectedPlant(''); setSelectedDevice(''); setSelectedPoint('');
    }, [selectedCompany]);

    useEffect(() => {
        if (!selectedPlant) { setDevices([]); return; }
        const fetchDevices = async () => {
            const res = await apiRequest('/api/devices');
            if (res.ok) { const all = await res.json(); setDevices(all.filter((d: any) => d.protocol?.plant?.id === selectedPlant)); }
        };
        fetchDevices();
        setSelectedDevice(''); setSelectedPoint('');
    }, [selectedPlant]);

    useEffect(() => {
        if (!selectedDevice) { setPoints([]); return; }
        const fetchPoints = async () => {
            const device = devices.find(d => d.id === selectedDevice);
            if (device?.datasheetProfileId) {
                const res = await apiRequest(`/api/datasheets?profileId=${device.datasheetProfileId}`);
                if (res.ok) setPoints(await res.json());
            }
        };
        fetchPoints();
        setSelectedPoint('');
    }, [selectedDevice, devices]);

    const fetchHistory = async () => {
        if (!selectedDevice || !selectedPoint) return;
        setLoading(true);
        try {
            let url = `/api/telemetry/history?deviceId=${selectedDevice}&pointId=${selectedPoint}`;
            if (startDate) url += `&startDate=${new Date(startDate).toISOString()}`;
            if (endDate) url += `&endDate=${new Date(endDate).toISOString()}`;
            if (!startDate && !endDate) url += `&hours=${hours}`;
            const res = await apiRequest(url);
            if (res.ok) {
                const data = await res.json();
                setChartData(data.map((d: any) => ({ time: d.time, value: d.value })));
            } else toast.error("Failed to fetch");
        } catch { toast.error("Network error"); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (selectedPoint) fetchHistory(); }, [selectedPoint, hours, startDate, endDate]);

    // Computed stats
    const stats = chartData.length > 0 ? {
        latest: chartData[chartData.length - 1].value.toFixed(2),
        max: Math.max(...chartData.map(d => d.value)).toFixed(2),
        min: Math.min(...chartData.map(d => d.value)).toFixed(2),
        avg: (chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(2),
        count: chartData.length,
    } : null;

    const pointUnit = points.find(p => p.id === selectedPoint)?.unit || '';

    return (
        <div className="space-y-3 pb-6 animate-in-up font-sans selection:bg-brand-green/30">
            {/* Header + Controls Row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-7 bg-brand-green rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight leading-none">Historical Analytics</h1>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">Telemetry performance & trends</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date Range */}
                    <div className="flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
                        <div className="flex flex-col">
                            <span className="text-[6px] font-bold text-slate-600 uppercase tracking-wider ml-1">From</span>
                            <input type="datetime-local" value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); if (e.target.value) setHours(0); }}
                                className="bg-transparent border-none text-[9px] font-bold text-white outline-none px-1 py-0.5 appearance-none cursor-pointer hover:text-brand-green transition-colors w-32" />
                        </div>
                        <div className="w-px h-5 bg-slate-800"></div>
                        <div className="flex flex-col">
                            <span className="text-[6px] font-bold text-slate-600 uppercase tracking-wider ml-1">To</span>
                            <input type="datetime-local" value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); if (e.target.value) setHours(0); }}
                                className="bg-transparent border-none text-[9px] font-bold text-white outline-none px-1 py-0.5 appearance-none cursor-pointer hover:text-brand-green transition-colors w-32" />
                        </div>
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); setHours(24); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                                <RefreshCw size={9} />
                            </button>
                        )}
                    </div>

                    {/* Period Selector */}
                    <div className="relative">
                        <select value={hours} onChange={(e) => { setHours(Number(e.target.value)); setStartDate(''); setEndDate(''); }}
                            className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-[9px] font-bold text-slate-300 outline-none hover:border-brand-green/30 transition-all appearance-none cursor-pointer pr-7 uppercase tracking-wider">
                            <option value={0} disabled={!startDate && !endDate}>Custom</option>
                            <option value={1}>1 Hour</option>
                            <option value={6}>6 Hours</option>
                            <option value={12}>12 Hours</option>
                            <option value={24}>24 Hours</option>
                            <option value={168}>7 Days</option>
                            <option value={720}>30 Days</option>
                        </select>
                        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={10} />
                    </div>

                    {/* Export */}
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-green text-white rounded-lg text-[9px] font-bold shadow-md shadow-brand-green/10 hover:bg-emerald-500 transition-all uppercase tracking-wider">
                        <Download size={11} /> Export
                    </button>
                </div>
            </div>

            {/* Selector Row - Inline */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Company', icon: Building2, state: selectedCompany, setState: setSelectedCompany, options: companies, displayKey: 'name', disabled: false, placeholder: 'Select...' },
                    { label: 'Plant', icon: Factory, state: selectedPlant, setState: setSelectedPlant, options: plants, displayKey: 'plantName', disabled: !selectedCompany, placeholder: 'Select...' },
                    { label: 'Device', icon: Cpu, state: selectedDevice, setState: setSelectedDevice, options: devices, displayKey: 'deviceName', disabled: !selectedPlant, placeholder: 'Select...' },
                    { label: 'Point', icon: Database, state: selectedPoint, setState: setSelectedPoint, options: points, displayKey: 'dataName', disabled: !selectedDevice, placeholder: 'Select...' },
                ].map((s) => (
                    <div key={s.label} className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                            {React.createElement(s.icon, { size: 9, className: s.disabled ? 'text-slate-800' : 'text-brand-green' })}
                            {s.label}
                        </span>
                        <div className="relative">
                            <select value={s.state} onChange={(e) => s.setState(e.target.value)} disabled={s.disabled}
                                className="w-full bg-slate-900/50 border border-slate-800/60 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-brand-green/30 transition-all appearance-none cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed">
                                <option value="">{s.placeholder}</option>
                                {s.options.map((opt: any) => <option key={opt.id} value={opt.id}>{(opt as any)[s.displayKey]}</option>)}
                            </select>
                            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" size={9} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main: Chart + Stats */}
            <div className="flex gap-3 min-h-[420px]">
                {/* Chart Panel */}
                <div className="flex-1 card-base bg-slate-950/40 border-slate-800/40 overflow-hidden flex flex-col relative">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-green/5 blur-[80px] rounded-full pointer-events-none"></div>

                    {/* Chart Header */}
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.03] relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-green shadow-md shadow-brand-green/20">
                                <Activity size={13} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-[11px] font-black text-white tracking-tight leading-none">
                                    {points.find(p => p.id === selectedPoint)?.dataName || 'Awaiting Selection'}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[7px] font-mono font-bold py-0.5 px-1.5 bg-slate-900 text-slate-500 rounded uppercase tracking-wider border border-slate-800/50">
                                        {selectedPoint ? `${selectedPoint.substring(0, 8)}` : 'OFFLINE'}
                                    </span>
                                    {loading && <span className="flex items-center gap-1 text-[7px] font-bold text-brand-green uppercase animate-pulse"><RefreshCw size={8} className="animate-spin" /> Fetching</span>}
                                </div>
                            </div>
                        </div>
                        {stats && (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase block">Latest</span>
                                    <span className="text-sm font-black text-brand-green tabular-nums">{stats.latest}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase block">Samples</span>
                                    <span className="text-sm font-black text-white tabular-nums">{stats.count.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chart Body */}
                    <div className="flex-1 p-4 flex flex-col relative z-10">
                        {selectedPoint ? (
                            chartData.length > 0 ? (
                                <div className="flex-1 opacity-0 animate-in-fade" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
                                    <HistoricalChart data={chartData} title={points.find(p => p.id === selectedPoint)?.dataName || 'Value'} color="#10b981" />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand-green/10 blur-[40px] rounded-full scale-150"></div>
                                        <div className="w-14 h-14 rounded-full border border-dashed border-slate-800 flex items-center justify-center">
                                            <Database size={20} className="text-slate-800" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="text-xs font-black text-slate-400 uppercase">No Data</h4>
                                        <p className="text-[8px] text-slate-600 font-medium mt-1">No records in selected window</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-30">
                                <div className="w-16 h-16 rounded-xl border border-slate-800 flex items-center justify-center rotate-6">
                                    <TrendingUp size={28} className="text-slate-700 -rotate-6" />
                                </div>
                                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em] text-center">
                                    Select context to initialize
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Sidebar */}
                <div className="w-60 space-y-3">
                    {/* Metrics Card */}
                    <div className="card-base bg-slate-950/60 p-4 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-brand-green/5 blur-2xl -mr-8 -mt-8 rounded-full"></div>

                        <div className="flex items-center gap-2 relative z-10 border-b border-white/[0.03] pb-2">
                            <div className="p-1.5 bg-slate-900 rounded-md border border-white/[0.05]">
                                <Activity size={11} className="text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-[9px] font-black text-white tracking-wider uppercase leading-none">Insights</h3>
                                <p className="text-[7px] font-medium text-slate-600 mt-0.5">Live computation</p>
                            </div>
                        </div>

                        <div className="space-y-2 relative z-10">
                            {[
                                { label: 'Latest', val: stats?.latest || '--', unit: pointUnit, color: 'text-brand-green', icon: TrendingUp },
                                { label: 'Maximum', val: stats?.max || '--', color: 'text-orange-400', icon: Info },
                                { label: 'Minimum', val: stats?.min || '--', color: 'text-blue-400', icon: Info },
                                { label: 'Average', val: stats?.avg || '--', color: 'text-purple-400', icon: Activity },
                                { label: 'Samples', val: stats?.count?.toLocaleString() || '--', color: 'text-slate-400', icon: Database },
                            ].map((m, i) => (
                                <motion.div key={m.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-brand-green/15 transition-all">
                                    <div className="flex items-center gap-2">
                                        <div className={`${m.color} opacity-40`}>{React.createElement(m.icon, { size: 9 })}</div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-white tabular-nums">{m.val}</span>
                                        {m.unit && <span className="text-[7px] font-bold text-slate-600 uppercase">{m.unit}</span>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Export Card */}
                    <button className="w-full card-base py-3 px-4 flex items-center justify-center gap-2 text-slate-500 hover:text-white hover:border-brand-green/30 transition-all text-[9px] font-bold uppercase tracking-wider">
                        <Download size={11} /> Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
