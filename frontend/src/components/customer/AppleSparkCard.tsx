"use client";

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SparkCardProps {
    title: string;
    value: number | null;
    unit: string;
    history: any[];
    color?: string;
}

export default function AppleSparkCard({ title, value, unit, history, color = '#5794f2' }: SparkCardProps) {
    const displayHistory = useMemo(() => history.slice(-20), [history]);

    const isUp = useMemo(() => {
        if (displayHistory.length < 2) return true;
        const last = displayHistory[displayHistory.length - 1]?.value || 0;
        const prev = displayHistory[displayHistory.length - 2]?.value || 0;
        return last >= prev;
    }, [displayHistory]);

    const delta = useMemo(() => {
        if (displayHistory.length < 2) return "0.00%";
        const last = displayHistory[displayHistory.length - 1]?.value || 0;
        const prev = displayHistory[displayHistory.length - 2]?.value || 0;
        if (prev === 0) return "0.00%";
        const diff = ((last - prev) / prev) * 100;
        return (diff >= 0 ? "+" : "") + diff.toFixed(2) + "%";
    }, [displayHistory]);

    const chartOption = {
        grid: { left: 0, right: 0, top: 5, bottom: 5 },
        xAxis: { type: 'category', show: false, data: displayHistory.map(h => h.t) },
        yAxis: { type: 'value', show: false, scale: true },
        series: [{
            type: 'line',
            data: displayHistory.map(h => h.value),
            symbol: 'none',
            smooth: 0.1,
            lineStyle: { width: 1.5, color: color },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: `${color}15` },
                        { offset: 1, color: 'transparent' }
                    ]
                }
            }
        }]
    };

    return (
        <div className="bg-grafana-panel/40 border border-grafana-border rounded-sm p-4 flex flex-col gap-4 hover:shadow-2xl hover:border-grafana-accent-blue/30 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Activity size={48} />
            </div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono group-hover:text-grafana-accent-blue transition-colors">{title}</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black tracking-tighter text-white font-mono group-hover:scale-105 transition-transform duration-500">
                            {value?.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-grafana-accent-blue font-mono uppercase tracking-widest">{unit}</span>
                    </div>
                </div>
                <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold font-mono tracking-widest border",
                    isUp 
                        ? "text-grafana-accent-green bg-grafana-accent-green/5 border-grafana-accent-green/20" 
                        : "text-grafana-accent-red bg-grafana-accent-red/5 border-grafana-accent-red/20"
                )}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {delta}
                </div>
            </div>
            
            <div className="h-10 w-full mt-auto relative z-10">
                <ReactECharts option={chartOption} style={{ height: '40px', width: '100%' }} notMerge />
            </div>
        </div>
    );
}
