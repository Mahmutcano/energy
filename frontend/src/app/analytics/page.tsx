"use client";

import HistoricalChart from '@/components/HistoricalChart';
import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, TrendingUp, Info, Activity, Building2, Factory, Cpu, Database, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';

interface Company { id: string; name: string; }
interface Plant { id: string; plantName: string; company_id: string; }
interface Device { id: string; deviceName: string; deviceType: string; protocol: { plant: { id: string } }; datasheet_profile_id: string; }
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

    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial load
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await apiRequest('/api/companies');
                if (res.ok) setCompanies(await res.json());
            } catch (err) {
                console.error("Fetch companies error:", err);
            }
        };
        fetchInitial();
    }, []);

    // Fetch plants when company changes
    useEffect(() => {
        if (!selectedCompany) { setPlants([]); return; }
        const fetchPlants = async () => {
            const res = await apiRequest('/api/plants');
            if (res.ok) {
                const all = await res.json();
                setPlants(all.filter((p: any) => p.company_id === selectedCompany));
            }
        };
        fetchPlants();
        setSelectedPlant('');
        setSelectedDevice('');
        setSelectedPoint('');
    }, [selectedCompany]);

    // Fetch devices when plant changes
    useEffect(() => {
        if (!selectedPlant) { setDevices([]); return; }
        const fetchDevices = async () => {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                const all = await res.json();
                setDevices(all.filter((d: any) => d.protocol?.plant?.id === selectedPlant));
            }
        };
        fetchDevices();
        setSelectedDevice('');
        setSelectedPoint('');
    }, [selectedPlant]);

    // Fetch points when device changes
    useEffect(() => {
        if (!selectedDevice) { setPoints([]); return; }
        const fetchPoints = async () => {
            const device = devices.find(d => d.id === selectedDevice);
            if (device?.datasheet_profile_id) {
                const res = await apiRequest(`/api/datasheets?profileId=${device.datasheet_profile_id}`);
                if (res.ok) setPoints(await res.json());
            }
        };
        fetchPoints();
        setSelectedPoint('');
    }, [selectedDevice, devices]);

    // Fetch historical data
    const fetchHistory = async () => {
        if (!selectedDevice || !selectedPoint) return;
        setLoading(true);
        try {
            const res = await apiRequest(`/api/telemetry/history?deviceId=${selectedDevice}&pointId=${selectedPoint}&hours=${hours}`);
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map((d: any) => ({
                    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    value: d.value
                }));
                setChartData(formatted);
            } else {
                toast.error("Failed to fetch history");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPoint) fetchHistory();
    }, [selectedPoint, hours]);

    return (
        <div className="space-y-8 pb-20 animate-in-up font-sans selection:bg-brand-green/30">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 relative">
                <div className="space-y-3">
                    <div className="flex items-center gap-5">
                        <div className="w-1.5 h-10 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight leading-none">Historical Analytics</h1>
                            <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Deep dive into telemetry performance and trends</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <select
                            value={hours}
                            onChange={(e) => setHours(Number(e.target.value))}
                            className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-slate-300 outline-none hover:border-brand-green/30 hover:text-white transition-all appearance-none cursor-pointer pr-12 uppercase tracking-[0.15em] shadow-xl"
                        >
                            <option value={1}>Last Hour</option>
                            <option value={6}>Last 6 Hours</option>
                            <option value={12}>Last 12 Hours</option>
                            <option value={24}>Last 24 Hours</option>
                            <option value={168}>Last 7 Days</option>
                            <option value={720}>Last 30 Days</option>
                        </select>
                        <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-brand-green transition-colors" size={14} />
                    </div>

                    <button className="flex items-center justify-center gap-3 px-10 py-4 bg-brand-green text-white rounded-2xl text-xs font-black shadow-[0_20px_40px_rgba(16,185,129,0.15)] hover:bg-emerald-500 hover:scale-[1.03] active:scale-95 transition-all tracking-[0.2em] uppercase shrink-0">
                        <Download size={16} strokeWidth={3} /> Export
                    </button>
                </div>
            </div>

            {/* Premium Selector System */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-2">
                {[
                    { label: 'Company', icon: <Building2 />, state: selectedCompany, setState: setSelectedCompany, options: companies, displayKey: 'name', disabled: false, placeholder: 'Select Company' },
                    { label: 'Plant', icon: <Factory />, state: selectedPlant, setState: setSelectedPlant, options: plants, displayKey: 'plantName', disabled: !selectedCompany, placeholder: 'Select Plant' },
                    { label: 'Device', icon: <Cpu />, state: selectedDevice, setState: setSelectedDevice, options: devices, displayKey: 'deviceName', disabled: !selectedPlant, placeholder: 'Select Device' },
                    { label: 'Data Point', icon: <Database />, state: selectedPoint, setState: setSelectedPoint, options: points, displayKey: 'dataName', disabled: !selectedDevice, placeholder: 'Select Point' },
                ].map((selector) => (
                    <div key={selector.label} className="group flex flex-col space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                            {React.cloneElement(selector.icon as React.ReactElement, { size: 12, className: selector.disabled ? 'text-slate-800' : 'text-brand-green' })}
                            {selector.label}
                        </span>
                        <div className="relative">
                            <select
                                value={selector.state}
                                onChange={(e) => selector.setState(e.target.value)}
                                disabled={selector.disabled}
                                className="w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all appearance-none cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed group-hover:border-slate-700"
                            >
                                <option value="">{selector.placeholder}</option>
                                {selector.options.map((opt: any) => (
                                    <option key={opt.id} value={opt.id}>{(opt as any)[selector.displayKey]}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" size={12} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytics Arena */}
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px]">
                {/* Main Visualizer */}
                <div className="flex-1">
                    <div className="h-full card-base bg-slate-950/40 border-slate-800/40 backdrop-blur-3xl overflow-hidden flex flex-col relative group">
                        {/* Decorative background effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-green/5 blur-[120px] rounded-full pointer-events-none"></div>

                        <div className="p-10 flex items-center justify-between border-b border-white/[0.03] relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="p-4 rounded-2xl bg-brand-green shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
                                    <Activity size={24} className="text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white tracking-tight">
                                        {points.find(p => p.id === selectedPoint)?.dataName || 'Awaiting Point Selection'}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 text-[8px] font-mono font-black py-0.5 px-2 bg-slate-900 text-slate-500 rounded-md uppercase tracking-widest border border-slate-800/50">
                                            {selectedPoint ? `ID::${selectedPoint.substring(0, 8)}` : 'SYS::OFFLINE'}
                                        </span>
                                        {loading && <span className="flex items-center gap-2 text-[8px] font-black text-brand-green uppercase animate-pulse"><RefreshCw size={10} className="animate-spin" /> Fetching Archive</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-8 min-h-[500px] flex flex-col relative z-10">
                            {selectedPoint ? (
                                chartData.length > 0 ? (
                                    <div className="flex-1 opacity-0 animate-in-fade" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                                        <HistoricalChart
                                            data={chartData}
                                            title={points.find(p => p.id === selectedPoint)?.dataName || 'Value'}
                                            color="#10b981"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-20">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-brand-green/10 blur-[60px] rounded-full scale-150"></div>
                                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center animate-spin-slow">
                                                <Database size={32} className="text-slate-800" />
                                            </div>
                                            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" size={20} />
                                        </div>
                                        <div className="text-center space-y-3">
                                            <h4 className="text-lg font-black text-slate-300 tracking-tight uppercase">Archive Empty</h4>
                                            <p className="max-w-xs text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-widest mx-auto">No historical telemetry recorded for selected window</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-20 grayscale opacity-40">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-3xl border border-slate-800 flex items-center justify-center rotate-12 shadow-2xl">
                                            <TrendingUp size={48} className="text-slate-700 -rotate-12" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em] text-center leading-loose">
                                        Select context from top menu <br /> to initialize visualization
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metrics */}
                <div className="w-full xl:w-[380px] space-y-6">
                    <div className="card-base bg-slate-950/60 border-slate-800 shadow-3xl p-8 space-y-8 relative overflow-hidden backdrop-blur-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 blur-3xl -mr-16 -mt-16 rounded-full"></div>

                        <div className="flex items-center gap-4 relative z-10 border-b border-white/[0.03] pb-6">
                            <div className="p-3 bg-slate-900 rounded-xl border border-white/[0.05]">
                                <Activity size={18} className="text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white tracking-[0.25em] uppercase">Insight Metrics</h3>
                                <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Real-time computation</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 relative z-10">
                            {[
                                { label: 'Latest Reading', val: chartData.length > 0 ? chartData[chartData.length - 1].value.toFixed(2) : '--', unit: points.find(p => p.id === selectedPoint)?.unit || '', color: 'text-brand-green', icon: <TrendingUp /> },
                                { label: 'Peak Analysis', val: chartData.length > 0 ? Math.max(...chartData.map(d => d.value)).toFixed(2) : '--', color: 'text-orange-400', icon: <Info /> },
                                { label: 'Lowest Threshold', val: chartData.length > 0 ? Math.min(...chartData.map(d => d.value)).toFixed(2) : '--', color: 'text-blue-400', icon: <Info /> },
                                { label: 'Samples Logged', val: chartData.length, color: 'text-slate-400', icon: <Database /> },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col space-y-1 hover:border-brand-green/20 hover:bg-white/[0.04] transition-all cursor-default"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                        <div className={`${stat.color} opacity-40`}>{React.cloneElement(stat.icon as React.ReactElement, { size: 10 })}</div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white tabular-nums tracking-tight">{stat.val}</span>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{stat.unit}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-4 relative z-10">
                            <button className="w-full py-5 bg-slate-900/50 border border-slate-800/80 text-slate-400 rounded-2xl text-[10px] font-black shadow-2xl hover:text-white hover:border-brand-green/40 hover:bg-slate-900 transition-all uppercase tracking-[0.2em]">
                                Generate Extended Archive (.csv)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
