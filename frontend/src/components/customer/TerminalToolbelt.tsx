"use client";

import React from 'react';
import { LayoutGrid, Bell, MousePointer2, Crosshair, LineChart, BarChart2, PieChart, Layers, HelpCircle, Terminal, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbeltProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function TerminalToolbelt({ activeTab, setActiveTab }: ToolbeltProps) {
    const tools = [
        { id: 'dashboard', icon: LayoutGrid, label: 'ÖZET' },
        { id: 'alarms', icon: Bell, label: 'OLAYLAR' },
        { id: 'current', icon: Zap, label: 'AKIM' },
        { id: 'voltage', icon: Activity, label: 'GERİLİM' },
        { id: 'power', icon: BarChart2, label: 'YÜK' },
        { id: 'energy', icon: PieChart, label: 'DENETİM' },
        { id: 'quality', icon: Layers, label: 'ANALİZ' },
    ];

    return (
        <div className="w-12 border-r border-grafana-border flex flex-col items-center py-4 gap-6 bg-grafana-panel/20 shrink-0 z-20">
            {tools.map((tool) => (
                <button 
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    title={tool.label}
                    className={cn(
                        "p-2.5 rounded-sm transition-all relative group",
                        activeTab === tool.id 
                            ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border border-grafana-accent-blue/20" 
                            : "text-grafana-text-secondary hover:text-white hover:bg-grafana-panel"
                    )}
                >
                    <tool.icon size={18} strokeWidth={activeTab === tool.id ? 2.5 : 1.5} />
                    {activeTab === tool.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-grafana-accent-blue rounded-r-full shadow-[0_0_8px_rgba(87,148,242,0.6)]" />
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-2 py-1 bg-grafana-bg border border-grafana-border rounded-sm text-[9px] font-bold text-white uppercase font-mono tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-2xl">
                        {tool.label}
                    </div>
                </button>
            ))}
            
            <button 
                onClick={() => setActiveTab('system')}
                className={cn(
                    "p-2.5 rounded-sm transition-all mt-auto group relative",
                    activeTab === 'system' 
                        ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border border-grafana-accent-blue/20" 
                        : "text-grafana-text-secondary hover:text-white hover:bg-grafana-panel"
                )}
            >
                <Terminal size={18} strokeWidth={1.5} />
                <div className="absolute left-full ml-3 px-2 py-1 bg-grafana-bg border border-grafana-border rounded-sm text-[9px] font-bold text-white uppercase font-mono tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-2xl">
                    TANILAMA
                </div>
            </button>
        </div>
    );
}
