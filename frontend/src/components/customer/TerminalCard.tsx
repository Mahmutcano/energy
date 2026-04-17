"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { CircleDashed } from 'lucide-react';

const CHART_COLORS = ['#089981', '#2962ff', '#fb8c00', '#f23645'];

interface TerminalCardProps {
    title: string;
    points: any[];
    unit?: string;
    category?: 'line' | 'bar' | 'area';
    range: string;
    setRange: (r: string) => void;
}

export default function TerminalCard({ title, points, unit = '', category = 'line', range, setRange }: TerminalCardProps) {
    const [view, setView] = useState<'chart' | 'table'>('chart');

    const chartOption = useMemo(() => {
        if (points.length === 0) return {};
        const categories = points[0]?.history?.map((h: any) => h.t) || [];

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#ffffff',
                borderColor: '#dfe2e7',
                borderWidth: 1,
                padding: [8, 12],
                textStyle: { color: '#131722', fontSize: 10, fontWeight: '700' },
                axisPointer: { type: 'cross', lineStyle: { color: '#787b86', type: 'dotted' } },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);'
            },
            grid: { left: 10, right: 45, top: 10, bottom: 25, containLabel: false },
            xAxis: {
                type: 'category',
                data: categories,
                axisLine: { show: false },
                axisLabel: { color: '#787b86', fontSize: 9, margin: 8, fontWeight: '500' },
                splitLine: { show: true, lineStyle: { color: '#f0f3fa', type: 'solid' } },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'right',
                axisLine: { show: false },
                axisLabel: { 
                    color: '#787b86', 
                    fontSize: 9, 
                    margin: 8, 
                    fontWeight: '500', 
                    formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1) 
                },
                splitLine: { show: true, lineStyle: { color: '#f0f3fa', type: 'solid' } }
            },
            series: points.map((p, i) => ({
                name: p.name,
                type: category === 'bar' ? 'bar' : 'line',
                symbol: 'none',
                smooth: 0.2,
                lineStyle: { width: 2, color: CHART_COLORS[i % 4] },
                itemStyle: { color: CHART_COLORS[i % 4] },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${CHART_COLORS[i % 4]}10` },
                        { offset: 1, color: 'transparent' }
                    ])
                },
                data: p.history?.map((h: any) => h.value) || []
            }))
        };
    }, [points, category]);

    if (points.length === 0) {
        return (
            <div className="flex h-full min-h-[250px] flex-col items-center justify-center border border-[#dfe2e7] rounded-lg bg-[#f8f9fb] text-[#787b86] border-dashed">
                <CircleDashed className="animate-spin mb-2 opacity-20" size={20} />
                <span className="text-[8px] font-black uppercase tracking-tight">VERİ BEKLENİYOR...</span>
            </div>
        );
    }

    return (
        <div className="border border-[#dfe2e7] rounded-lg bg-white flex flex-col overflow-hidden transition-all duration-300">
            <div className="h-10 flex items-center justify-between px-3 border-b border-[#f0f3fa] bg-white">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-tight text-[#131722]">{title} ›</span>
                    <button onClick={() => setView(view === 'chart' ? 'table' : 'chart')} className="text-[8px] font-bold text-[#2962ff] opacity-40 hover:opacity-100 transition-opacity">
                        {view === 'chart' ? '[TABLE]' : '[CHART]'}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    {points.slice(0, 1).map((p, i) => (
                        <div key={i} className="flex items-baseline gap-1.5">
                            <span className="text-[14px] font-bold tabular-nums text-[#131722]">
                                {p.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-black text-[#089981] px-1 py-0.5 bg-emerald-50 rounded">
                                +0.45%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 p-1 relative">
                {view === 'chart' ? (
                    <ReactECharts option={chartOption} style={{ height: '160px', width: '100%' }} notMerge />
                ) : (
                    <div className="h-[160px] overflow-auto custom-scrollbar">
                        <table className="w-full text-[9px] text-left">
                            <thead className="sticky top-0 bg-[#f8f9fb] text-[#787b86] font-black uppercase border-b border-[#dfe2e7]">
                                <tr>
                                    <th className="p-2">ZAMAN</th>
                                    {points.map(p => <th key={p.pointId} className="p-2">{p.name}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f3fa]">
                                {points[0].history.map((h: any, i: number) => (
                                    <tr key={i} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="p-2 font-bold text-[#787b86]">{h.t}</td>
                                        {points.map(p => (
                                            <td key={p.pointId} className="p-2 font-black tabular-nums text-[#131722]">
                                                {p.history[i]?.value?.toFixed(3)}
                                            </td>
                                        ))}
                                    </tr>
                                )).reverse()}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="h-10 flex items-center justify-between px-3 border-t border-[#f0f3fa]">
                <div className="flex gap-1">
                    {['1g', '1h', '1a', '6a', '1y', 'Tüm'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-2 py-1 text-[9px] font-black rounded transition-all ${range === r ? 'bg-[#f0f3fa] text-[#2962ff]' : 'text-[#787b86] hover:text-[#131722]'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 2px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #dfe2e7; border-radius: 4px; }
            `}</style>
        </div>
    );
}
