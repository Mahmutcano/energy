"use client";

import HistoricalChart from '@/components/HistoricalChart';
import { useState, useEffect } from 'react';
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
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight">System Analytics</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Historical telemetry data and performance metrics</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-slate-400 outline-none hover:border-brand-green/30 transition-all uppercase tracking-widest"
                    >
                        <option value={1}>Last Hour</option>
                        <option value={6}>Last 6 Hours</option>
                        <option value={24}>Last 24 Hours</option>
                        <option value={168}>Last 7 Days</option>
                    </select>
                    <button className="flex items-center gap-3 px-8 py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-[0.2em]">
                        <Download size={16} strokeWidth={3} /> Export Report
                    </button>
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 card-base p-6 bg-slate-900/20 dot-bg border-slate-800/40">
                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Building2 size={12} /> Company
                    </label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all"
                    >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Factory size={12} /> Plant
                    </label>
                    <select
                        value={selectedPlant}
                        onChange={(e) => setSelectedPlant(e.target.value)}
                        disabled={!selectedCompany}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20"
                    >
                        <option value="">Select Plant</option>
                        {plants.map(p => <option key={p.id} value={p.id}>{p.plantName}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Cpu size={12} /> Device
                    </label>
                    <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        disabled={!selectedPlant}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20"
                    >
                        <option value="">Select Device</option>
                        {devices.map(d => <option key={d.id} value={d.id}>{d.deviceName}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Database size={12} /> Data Point
                    </label>
                    <select
                        value={selectedPoint}
                        onChange={(e) => setSelectedPoint(e.target.value)}
                        disabled={!selectedDevice}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20"
                    >
                        <option value="">Select Point</option>
                        {points.map(p => <option key={p.id} value={p.id}>{p.dataName}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Chart */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8">
                    <div className="card-base p-10 bg-slate-900/20 dot-bg">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
                                    <TrendingUp size={24} className="text-brand-green" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white tracking-tight">
                                        {points.find(p => p.id === selectedPoint)?.dataName || 'Select a point to visualize'}
                                    </h3>
                                    <p className="text-[10px] font-mono mt-1 text-slate-600 uppercase tracking-widest">
                                        {selectedPoint ? `POINT_ID::${selectedPoint.substring(0, 8)}` : 'AWAITING_SELECTION'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {loading && <RefreshCw size={14} className="text-brand-green animate-spin" />}
                                <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                                    <Filter size={14} className="text-slate-500" />
                                    <span className="text-[10px] font-mono font-black text-slate-500 uppercase">SYS::TIMESERIES_V1</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[500px] relative z-10 w-full">
                            {selectedPoint ? (
                                chartData.length > 0 ? (
                                    <HistoricalChart
                                        data={chartData}
                                        title={points.find(p => p.id === selectedPoint)?.dataName || 'Value'}
                                        color="#10b981"
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                                        <Activity size={48} className="opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-[0.3em]">No historical data found for this period</p>
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                                    <Database size={64} className="opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Select Company, Plant, Device and Point to begin analysis</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4">
                    {/* Statistical Module */}
                    <div className="card-base bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden p-8 space-y-8">
                        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                            <Activity size={24} className="text-brand-green" />
                            <div>
                                <h3 className="text-xs font-black text-white tracking-[0.3em] uppercase">Quick Stats</h3>
                                <p className="text-[8px] font-mono text-slate-600 uppercase">Calculated from visible window</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    label: 'Current Value',
                                    val: chartData.length > 0 ? chartData[chartData.length - 1].value.toFixed(2) : '--',
                                    icon: <Activity size={14} />
                                },
                                {
                                    label: 'Peak Value',
                                    val: chartData.length > 0 ? Math.max(...chartData.map(d => d.value)).toFixed(2) : '--',
                                    icon: <TrendingUp size={14} />
                                },
                                {
                                    label: 'Minimum Value',
                                    val: chartData.length > 0 ? Math.min(...chartData.map(d => d.value)).toFixed(2) : '--',
                                    icon: <Info size={14} />
                                },
                                {
                                    label: 'Data Samples',
                                    val: chartData.length,
                                    icon: <Database size={14} />
                                },
                            ].map((stat) => (
                                <div key={stat.label} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/40 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="text-slate-600">{stat.icon}</div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{stat.label}</span>
                                    </div>
                                    <span className="text-lg font-black text-white tabular-nums">{stat.val}</span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-4 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-[10px] font-black shadow-xl hover:text-white hover:border-brand-green/30 transition-all uppercase tracking-widest">
                            Download Raw Dataset (.csv)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
