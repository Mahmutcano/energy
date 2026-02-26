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
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            borderRadius: 12,
            padding: [12, 16],
            textStyle: {
                color: '#f8fafc',
                fontSize: 11,
                fontWeight: 'bold'
            },
            axisPointer: {
                type: 'line',
                lineStyle: {
                    color: 'rgba(16, 185, 129, 0.4)',
                    width: 2,
                    type: 'dashed'
                }
            },
            formatter: (params: any) => {
                const p = params[0];
                return `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="color:#64748b; font-size:10px; text-transform:uppercase; letter-spacing:0.1em">${p.name}</div>
                        <div style="display:flex; align-items:center; gap:8px">
                            <div style="width:8px; height:8px; border-radius:100%; background:${p.color}"></div>
                            <div style="font-size:18px; font-weight:900; color:#fff">${p.value}</div>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '20px',
            right: '20px',
            bottom: '20px',
            top: '40px',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(d => d.time),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#64748b',
                fontSize: 10,
                margin: 20
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
                data: data.map(d => d.value),
                lineStyle: {
                    width: 4,
                    color: color,
                    shadowColor: 'rgba(16, 185, 129, 0.2)',
                    shadowBlur: 20,
                    shadowOffsetY: 10
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
