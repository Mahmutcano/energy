"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { CircleDashed, Terminal, Table as TableIcon, LineChart, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#5794f2', '#73bf69', '#ff9830', '#f2495c'];

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
                backgroundColor: '#141619',
                borderColor: '#262626',
                borderWidth: 1,
                padding: [8, 12],
                textStyle: { color: '#d8d9da', fontSize: 10, fontWeight: '700' },
                axisPointer: { type: 'cross', lineStyle: { color: '#5794f2', type: 'dotted' } },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 2px;'
            },
            grid: { left: 10, right: 50, top: 20, bottom: 25, containLabel: false },
            xAxis: {
                type: 'category',
                data: categories,
                axisLine: { show: false },
                axisLabel: { color: '#7b7b7b', fontSize: 9, margin: 12, fontWeight: '700', fontFamily: 'monospace' },
                splitLine: { show: true, lineStyle: { color: '#1e1e1e', type: 'solid' } },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'right',
                axisLine: { show: false },
                axisLabel: { 
                    color: '#7b7b7b', 
                    fontSize: 9, 
                    margin: 8, 
                    fontWeight: '700', 
                    fontFamily: 'monospace',
                    formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1) 
                },
                splitLine: { show: true, lineStyle: { color: '#1e1e1e', type: 'solid' } }
            },
            series: points.map((p, i) => ({
                name: p.name,
                type: category === 'bar' ? 'bar' : 'line',
                symbol: 'circle',
                symbolSize: 4,
                showSymbol: false,
                smooth: 0.1,
                lineStyle: { width: 2, color: CHART_COLORS[i % 4] },
                itemStyle: { color: CHART_COLORS[i % 4] },
                areaStyle: category === 'area' ? {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${CHART_COLORS[i % 4]}33` },
                        { offset: 1, color: 'transparent' }
                    ])
                } : null,
                data: p.history?.map((h: any) => h.value) || []
            }))
        };
    }, [points, category]);

    if (points.length === 0) {
        return (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center border border-grafana-border rounded-sm bg-grafana-panel/20 text-grafana-text-secondary border-dashed">
                <CircleDashed className="animate-spin mb-3 opacity-30" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] font-mono">VERİ BAĞLANTISI KURULUYOR...</span>
            </div>
        );
    }

    return (
        <div className="border border-grafana-border rounded-sm bg-grafana-panel/40 flex flex-col overflow-hidden transition-all duration-500 hover:border-grafana-accent-blue/30 group shadow-xl">
            {/* Card Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-grafana-border bg-grafana-bg/50">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-grafana-accent-blue rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white font-mono group-hover:text-grafana-accent-blue transition-colors">{title}</span>
                    <button 
                        onClick={() => setView(view === 'chart' ? 'table' : 'chart')} 
                        className="ml-2 p-1.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-white transition-colors"
                    >
                        {view === 'chart' ? <TableIcon size={12} /> : <LineChart size={12} />}
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    {points.slice(0, 1).map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-lg font-bold tabular-nums text-white font-mono">
                                {p.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                                <span className="text-[10px] text-grafana-accent-blue ml-1">{unit}</span>
                            </span>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-grafana-accent-green bg-grafana-accent-green/10 px-2 py-0.5 rounded-sm border border-grafana-accent-green/20 font-mono">
                                <TrendingUp size={10} />
                                +0.45%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 p-2 relative bg-grafana-panel/20">
                {view === 'chart' ? (
                    <div className="relative group/chart">
                         {/* Subtle background grid effect */}
                         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#5794f2 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                        <ReactECharts option={chartOption} style={{ height: '220px', width: '100%' }} notMerge />
                    </div>
                ) : (
                    <div className="h-[220px] overflow-auto custom-scroll">
                        <table className="scada-table">
                            <thead className="sticky top-0 z-10 bg-grafana-bg">
                                <tr>
                                    <th>ZAMAN</th>
                                    {points.map(p => <th key={p.pointId}>{p.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {points[0].history.map((h: any, i: number) => (
                                    <tr key={i} className="hover:bg-grafana-accent-blue/[0.05] border-b border-grafana-border/30">
                                        <td className="font-bold text-grafana-text-secondary font-mono">{h.t}</td>
                                        {points.map(p => (
                                            <td key={p.pointId} className="font-bold tabular-nums text-white font-mono">
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

            {/* Range Controls */}
            <div className="h-10 flex items-center justify-between px-4 border-t border-grafana-border bg-grafana-bg/30">
                <div className="flex gap-1.5">
                    {['1g', '1h', '1a', '6a', '1y', 'Tüm'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-3 py-1 text-[9px] font-bold rounded-sm transition-all font-mono tracking-widest border border-transparent",
                                range === r 
                                    ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border-grafana-accent-blue/30 shadow-inner" 
                                    : "text-grafana-text-secondary hover:text-white hover:border-grafana-border"
                            )}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_8px_rgba(115,191,105,0.4)]" />
                    <span className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono tracking-widest">CANLI VERİ AKIŞI</span>
                </div>
            </div>

            <style jsx>{`
                .custom-scroll::-webkit-scrollbar { width: 3px; }
                .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scroll::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
            `}</style>
        </div>
    );
}
