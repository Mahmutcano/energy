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
            borderColor: 'rgba(16, 185, 129, 0.4)',
            borderWidth: 1,
            borderRadius: 16,
            padding: [16, 20],
            shadowBlur: 30,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            textStyle: {
                color: '#f8fafc',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif'
            },
            axisPointer: {
                type: 'line',
                lineStyle: {
                    color: 'rgba(16, 185, 129, 0.5)',
                    width: 2,
                    type: 'solid'
                }
            },
            formatter: (params: any) => {
                const p = params[0];
                const date = new Date(p.value[0]);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short' });

                return `
                    <div style="min-width: 180px; display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; justify-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); pb: 8px; margin-bottom: 4px;">
                            <span style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;">${dateStr}</span>
                            <span style="margin-left: auto; color: #10b981; font-weight: 900; font-family: monospace; font-size: 11px; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px;">${timeStr}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 10px; height: 10px; border-radius: 3px; background: ${p.color}; box-shadow: 0 0 10px ${p.color}80"></div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Real-time Value</span>
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <span style="font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.02em;">${Number(p.value[1]).toFixed(2)}</span>
                                    <span style="color: #64748b; font-size: 12px; font-weight: 700;">${unit}</span>
                                </div>
                            </div>
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
            left: '20px',
            right: '20px',
            bottom: '45px',
            top: '40px',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#64748b',
                fontSize: 10,
                margin: 20,
                formatter: (value: number) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }
            }
        },
        yAxis: {
            type: 'value',
            splitLine: {
                lineStyle: {
                    color: 'rgba(255,255,255,0.02)',
                    width: 1
                }
            },
            axisLine: { show: false },
            axisLabel: { color: '#64748b', fontSize: 10 }
        },
        series: [
            {
                name: title,
                type: 'line',
                smooth: true,
                showSymbol: false,
                sampling: 'lttb', // Largest-Triangle-Three-Buckets for high density performance
                data: data.map(d => [d.time, d.value]),
                lineStyle: {
                    width: 3,
                    color: color,
                    shadowColor: 'rgba(16, 185, 129, 0.2)',
                    shadowBlur: 15,
                    shadowOffsetY: 8
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
