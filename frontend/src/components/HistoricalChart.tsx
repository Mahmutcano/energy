"use client";

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ChartData {
    time: string;
    value: number;
}

export default function HistoricalChart({ data, title, color = '#3b82f6' }: { data: ChartData[], title: string, color?: string }) {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            textStyle: { color: isDark ? '#f1f5f9' : '#1e293b' },
            axisPointer: { type: 'cross', label: { backgroundColor: isDark ? '#1e293b' : '#f8fafc' } },
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(d => d.time),
            axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
            axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9', type: 'dashed' } },
            axisLine: { show: false },
            axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }
        },
        series: [
            {
                name: title,
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: data.map(d => d.value),
                lineStyle: { width: 3, color: color },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${color}33` },
                        { offset: 1, color: `${color}00` }
                    ])
                },
                itemStyle: { color: color }
            }
        ]
    };

    return (
        <div className="w-full h-full min-h-[300px]">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
}
