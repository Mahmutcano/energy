"use client";

import HistoricalChart from '@/components/HistoricalChart';
import { useState, useEffect } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';

export default function Analytics() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        // Mock historical data generation
        const mockData = Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            value: 200 + Math.random() * 100
        }));
        setData(mockData);
    }, []);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        Historical <span className="text-emerald-500 italic">Analytics</span>
                    </h1>
                    <p className="text-slate-400">Deep dive into energy consumption patterns</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        <Calendar className="h-4 w-4" /> Last 24 Hours
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        <Filter className="h-4 w-4" /> Filters
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <HistoricalChart data={data} title="Active Power (kW) - RTU 001" color="#3b82f6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HistoricalChart
                        data={data.map(d => ({ ...d, value: 220 + Math.random() * 10 }))}
                        title="Voltage Stability (V)"
                        color="#06b6d4"
                    />
                    <HistoricalChart
                        data={data.map(d => ({ ...d, value: 50 + Math.random() * 0.1 }))}
                        title="Frequency Analysis (Hz)"
                        color="#fbbf24"
                    />
                </div>
            </div>

            <div className="bg-slate-900/30 rounded-3xl border border-slate-800 p-8">
                <h3 className="font-bold text-lg mb-6 italic text-slate-200">Statistical Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: 'Peak Demand', val: '294.2 kW', time: '14:30', trend: '+12%' },
                        { label: 'Base Load', val: '182.1 kW', time: '03:15', trend: '-2%' },
                        { label: 'Avg Consumption', val: '224.5 kW', time: 'Daily', trend: '+4%' },
                        { label: 'Power Factor', val: '0.98', time: 'Peak', trend: 'Stable' },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">{stat.label}</p>
                            <p className="text-2xl font-black text-white italic">{stat.val}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-600 font-bold uppercase">{stat.time}</span>
                                <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
