"use client";

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ChartData {
    time: string | number | Date;
    value: number;
}

export default function HistoricalChart({ data, title, unit = '', color = '#5794f2' }: { data: ChartData[], title: string, unit?: string, color?: string }) {
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#141619',
            borderColor: '#262626',
            borderWidth: 1,
            borderRadius: 2,
            padding: [10, 14],
            textStyle: { color: '#d8d9da', fontSize: 11, fontFamily: 'Roboto Mono, monospace' },
            axisPointer: {
                type: 'cross',
                crossStyle: { color: '#2c2c2c', type: 'dashed', width: 1 },
                label: { 
                    backgroundColor: '#0b0c0e', 
                    color: '#5794f2', 
                    fontWeight: 'bold', 
                    borderColor: '#262626', 
                    borderWidth: 1,
                    fontFamily: 'Roboto Mono'
                }
            },
            formatter: (params: any) => {
                const p = params[0];
                const date = new Date(p.value[0]);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                
                return `
                    <div style="min-width: 140px; display: flex; flex-direction: column; gap: 4px;">
                        <span style="color: #7b7b7b; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${timeStr}</span>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span style="font-size: 18px; font-weight: 700; color: #d8d9da; font-family: Roboto Mono;">${Number(p.value[1]).toFixed(3)}</span>
                            <span style="color: #5794f2; font-size: 10px; font-weight: 700;">${unit}</span>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '10px',
            right: '40px',
            bottom: '10px',
            top: '30px',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#262626' } },
            axisTick: { show: false },
            splitLine: {
                show: true,
                lineStyle: { color: '#2c2c2c', type: 'solid', opacity: 0.5 }
            },
            axisLabel: {
                color: '#7b7b7b',
                fontSize: 9,
                margin: 12,
                fontFamily: 'Roboto Mono',
                formatter: (value: number) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            }
        },
        yAxis: {
            type: 'value',
            position: 'right',
            scale: true,
            splitLine: {
                show: true,
                lineStyle: { color: '#2c2c2c', type: 'solid', opacity: 0.5 }
            },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#7b7b7b', fontSize: 9, margin: 12, fontFamily: 'Roboto Mono' }
        },
        series: [
            {
                name: title,
                type: 'line',
                smooth: false,
                showSymbol: false,
                sampling: 'lttb',
                data: data.map(d => [d.time, d.value]),
                lineStyle: {
                    width: 1.5,
                    color: color
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color },
                        { offset: 1, color: 'transparent' }
                    ]),
                    opacity: 0.1 // 10% fill as requested
                },
                itemStyle: { color: color }
            }
        ]
    };

    return (
        <div className="w-full h-full min-h-[400px] bg-grafana-panel/50 p-2 border border-grafana-border rounded-sm">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
}

