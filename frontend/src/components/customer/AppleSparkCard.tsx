"use client";

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SparkCardProps {
    title: string;
    value: number | null;
    unit: string;
    history: any[];
    color?: string;
}

export default function AppleSparkCard({ title, value, unit, history, color = '#2962ff' }: SparkCardProps) {
    const displayHistory = useMemo(() => history.slice(-15), [history]);

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
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: { type: 'category', show: false, data: displayHistory.map(h => h.t) },
        yAxis: { type: 'value', show: false, scale: true },
        series: [{
            type: 'line',
            data: displayHistory.map(h => h.value),
            symbol: 'none',
            smooth: true,
            lineStyle: { width: 2, color: color },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: `${color}20` },
                        { offset: 1, color: 'transparent' }
                    ]
                }
            }
        }]
    };

    return (
        <div className="bg-white border border-[#dfe2e7] rounded-xl p-4 flex flex-col gap-3 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#2962ff33] transition-all duration-300 group relative">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider">{title}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black tracking-tighter text-[#131722] group-hover:text-[#2962ff] transition-colors">
                            {value?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-black text-[#787b86]">{unit}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${isUp ? 'text-[#089981] bg-emerald-50' : 'text-[#f23645] bg-red-50'}`}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {delta}
                </div>
            </div>
            
            <div className="h-12 w-full mt-auto">
                <ReactECharts option={chartOption} style={{ height: '48px', width: '100%' }} notMerge />
            </div>
        </div>
    );
}
