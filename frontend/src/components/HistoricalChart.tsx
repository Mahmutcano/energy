"use client";

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ChartData {
    time: string;
    value: number;
}

export default function HistoricalChart({ data, title, color = '#3b82f6' }: { data: ChartData[], title: string, color?: string }) {
    const option = {
        backgroundColor: 'transparent',
        title: {
            text: title,
            textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: 'medium' },
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            textStyle: { color: '#f1f5f9' },
            axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(d => d.time),
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#64748b' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#1e293b' } },
            axisLabel: { color: '#64748b' }
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
                        { offset: 0, color: `${color}44` },
                        { offset: 1, color: `${color}00` }
                    ])
                },
                itemStyle: { color: color }
            }
        ]
    };

    return (
        <div className="w-full h-[400px] bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
