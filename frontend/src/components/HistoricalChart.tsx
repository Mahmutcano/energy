"use client";

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';

interface ChartData {
    time: string | number | Date;
    value: number;
}

export default function HistoricalChart({ data, title, unit = '', color = '#5794f2' }: { data: ChartData[], title: string, unit?: string, color?: string }) {
    const { theme } = useTheme();
    const isLight = theme === 'light-pure';

    const colors = useMemo(() => ({
        bg: isLight ? '#ffffff' : '#141619',
        border: isLight ? '#cbd5e1' : '#262626',
        text: isLight ? '#1e293b' : '#d8d9da',
        textSecondary: isLight ? '#64748b' : '#7b7b7b',
        grid: isLight ? '#e2e8f0' : '#2c2c2c',
        tooltipBg: isLight ? '#ffffff' : '#141619',
        cross: isLight ? '#cbd5e1' : '#2c2c2c'
    }), [isLight]);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: colors.tooltipBg,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 2,
            padding: [10, 14],
            textStyle: { color: colors.text, fontSize: 11, fontFamily: 'Roboto Mono, monospace' },
            axisPointer: {
                type: 'cross',
                crossStyle: { color: colors.cross, type: 'dashed', width: 1 },
                label: { 
                    backgroundColor: isLight ? '#f0f4f8' : '#0b0c0e', 
                    color: color, 
                    fontWeight: 'bold', 
                    borderColor: colors.border, 
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
                        <span style="color: ${colors.textSecondary}; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${timeStr}</span>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span style="font-size: 18px; font-weight: 700; color: ${colors.text}; font-family: Roboto Mono;">${Number(p.value[1]).toFixed(3)}</span>
                            <span style="color: ${color}; font-size: 10px; font-weight: 700;">${unit}</span>
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
            axisLine: { lineStyle: { color: colors.border } },
            axisTick: { show: false },
            splitLine: {
                show: true,
                lineStyle: { color: colors.grid, type: 'solid', opacity: 0.5 }
            },
            axisLabel: {
                color: colors.textSecondary,
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
                lineStyle: { color: colors.grid, type: 'solid', opacity: 0.5 }
            },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: colors.textSecondary, fontSize: 9, margin: 12, fontFamily: 'Roboto Mono' }
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
                    opacity: 0.1
                },
                itemStyle: { color: color }
            }
        ]
    };

    return (
        <div className="w-full h-full min-h-[400px] bg-grafana-panel/50 p-2 border border-grafana-border rounded-sm transition-colors duration-300">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
}
