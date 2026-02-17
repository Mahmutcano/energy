"use client";

import HistoricalChart from '@/components/HistoricalChart';
import { useState, useEffect } from 'react';
import { Calendar, Download, Filter, BarChart3, TrendingUp, Info, ArrowUpRight, ArrowDownRight, Layers, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const mockData = Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            value: 200 + Math.random() * 100
        }));
        setData(mockData);
    }, []);

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* 1. Analytics Directive Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">System Analytics</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Historical telemetry data and performance metrics</p>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-6 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest hover:border-brand-green/30 transition-all">
                        <Calendar size={14} className="text-brand-green" /> Last 24 Hours
                    </button>
                    <button className="flex items-center gap-3 px-8 py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-[0.2em]">
                        <Download size={16} strokeWidth={3} /> Export Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* 2. Primary Trend Mapping */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="card-base p-10 bg-slate-900/20 dot-bg">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
                                    <TrendingUp size={24} className="text-brand-green" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Active Power Consumption</h3>
                                    <p className="text-tech-label mt-1 text-slate-600">Grid Resource Usage - Vector 01</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                                <Filter size={14} className="text-slate-500" />
                                <span className="text-[10px] font-mono font-black text-slate-500">PARAM::FILTER_STABLE</span>
                            </div>
                        </div>
                        <div className="h-[450px] relative z-10">
                            <HistoricalChart data={data} title="Active Power (kW)" color="#10b981" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="card-base p-8 bg-slate-900/20 dot-bg">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-tech-label">Voltage Stability (V)</h3>
                                <Info size={14} className="text-slate-700" />
                            </div>
                            <div className="h-[280px]">
                                <HistoricalChart
                                    data={data.map(d => ({ ...d, value: 220 + Math.random() * 8 }))}
                                    title="Line Voltage L1-N"
                                    color="#3b82f6"
                                />
                            </div>
                        </div>
                        <div className="card-base p-8 bg-slate-900/20 dot-bg">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-tech-label">Grid Frequency (Hz)</h3>
                                <Activity size={14} className="text-slate-700" />
                            </div>
                            <div className="h-[280px]">
                                <HistoricalChart
                                    data={data.map(d => ({ ...d, value: 50 + Math.random() * 0.08 }))}
                                    title="System Frequency"
                                    color="#f59e0b"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Statistical Intelligence Module */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="card-base flex flex-col h-full bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent)] pointer-events-none" />

                        <div className="p-8 border-b border-slate-800 flex items-center gap-5 bg-slate-900/30">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <Layers size={22} className="text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Statistical Engine</h3>
                                <p className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Analysis Core V4.2</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 flex-1 relative z-10">
                            {[
                                { label: 'Peak Demand', val: '294.2 kW', time: '14:30 UTC', trend: '+12%', type: 'up' },
                                { label: 'Base Load', val: '182.1 kW', time: '03:15 UTC', trend: '-2%', type: 'down' },
                                { label: 'Avg Consumption', val: '224.5 kW', time: 'Last 24h', trend: '+4%', type: 'up' },
                                { label: 'Power Factor', val: '0.98 Φ', time: 'Stable', trend: 'Optimal', type: 'stable' },
                                { label: 'Total THD', val: '1.4%', time: 'Nominal', trend: 'Level 1', type: 'stable' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/40 hover:border-brand-green/30 transition-all group"
                                >
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 leading-none italic">{stat.label}</p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{stat.val}</p>
                                        <div className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border ${stat.type === 'up' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                                            stat.type === 'down' ? 'text-brand-green border-brand-green/20 bg-brand-green/5' :
                                                'text-slate-500 border-slate-800 bg-slate-900/50'
                                            }`}>
                                            {stat.type === 'up' ? <ArrowUpRight size={12} /> : stat.type === 'down' ? <ArrowDownRight size={12} /> : null}
                                            {stat.trend}
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-mono text-slate-700 mt-3 uppercase tracking-tighter">Event Time: {stat.time}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="p-8 bg-slate-900/30 border-t border-slate-800/60">
                            <button className="w-full py-4 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-black shadow-xl hover:text-white hover:border-brand-green/30 transition-all uppercase tracking-widest">
                                Comprehensive Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
