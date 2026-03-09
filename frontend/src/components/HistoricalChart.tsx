"use client";

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ChartData {
    time: string | number | Date;
    value: number;
}

export default function HistoricalChart({ data, title, unit = '', color = '#3b82f6' }: { data: ChartData[], title: string, unit?: string, color?: string }) {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 1,
            borderRadius: 8,
            padding: [12, 16],
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.8)',
            textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: 'Inter, sans-serif' },
            axisPointer: {
                type: 'cross',
                crossStyle: { color: 'rgba(16, 185, 129, 0.5)', type: 'dashed', width: 1 },
                label: { backgroundColor: '#0f172a', color: '#10b981', fontWeight: 'bold', borderColor: 'rgba(16, 185, 129, 0.5)', borderWidth: 1 }
            },
            formatter: (params: any) => {
                const p = params[0];
                const date = new Date(p.value[0]);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

                return `
                    <div style="min-width: 140px; display: flex; flex-direction: column; gap: 8px;">
                        <span style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">${dateStr} ${timeStr}</span>
                        <div style="display: flex; align-items: baseline; gap: 6px;">
                            <span style="font-size: 20px; font-weight: 900; color: ${p.color};">${Number(p.value[1]).toFixed(2)}</span>
                            <span style="color: #64748b; font-size: 11px; font-weight: 700;">${unit}</span>
                        </div>
                    </div>
                `;
            }
        },
        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                type: 'slider',
                bottom: 0,
                height: 20,
                borderColor: 'rgba(16, 185, 129, 0.1)',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                fillerColor: 'rgba(16, 185, 129, 0.1)',
                handleStyle: {
                    color: '#10b981',
                    borderWidth: 0
                },
                textStyle: { color: 'transparent' },
                moveHandleSize: 0,
                showDetail: false
            }
        ],
        grid: {
            left: '10px',
            right: '50px',
            bottom: '40px',
            top: '20px',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
                show: true,
                lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' }
            },
            axisLabel: {
                color: '#64748b',
                fontSize: 10,
                margin: 12,
                formatter: (value: number) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }
        },
        yAxis: {
            type: 'value',
            position: 'right', // Crypto style
            scale: true, // Auto scaling instead of starting from 0
            splitLine: {
                lineStyle: {
                    color: 'rgba(255,255,255,0.04)',
                    type: 'dashed',
                    width: 1
                }
            },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#64748b', fontSize: 10, margin: 12 }
        },
        series: [
            {
                name: title,
                type: 'line',
                smooth: false, // Crypto is typically rigid/sharp
                showSymbol: false,
                sampling: 'lttb',
                data: data.map(d => [d.time, d.value]),
                lineStyle: {
                    width: 1.5,
                    color: color,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                    shadowBlur: 5,
                    shadowOffsetY: 2
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.15)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                    ])
                },
                itemStyle: { color: color }
            }
        ]
    };

    return (
        <div className="w-full h-full min-h-[450px]">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
}
