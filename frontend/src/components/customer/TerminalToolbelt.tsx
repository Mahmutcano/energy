"use client";

import React from 'react';
import { LayoutGrid, Bell, MousePointer2, Crosshair, LineChart, BarChart2, PieChart, Layers, HelpCircle } from 'lucide-react';

interface ToolbeltProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function TerminalToolbelt({ activeTab, setActiveTab }: ToolbeltProps) {
    const tools = [
        { id: 'dashboard', icon: LayoutGrid, label: 'Genel Bakış' },
        { id: 'alarms', icon: Bell, label: 'Alarmlar' },
        { id: 'current', icon: MousePointer2, label: 'Akım' },
        { id: 'voltage', icon: LineChart, label: 'Gerilim' },
        { id: 'power', icon: BarChart2, label: 'Güç' },
        { id: 'energy', icon: PieChart, label: 'Enerji' },
        { id: 'quality', icon: Layers, label: 'Kalite' },
    ];

    return (
        <div className="w-12 border-r border-[#dfe2e7] flex flex-col items-center py-4 gap-4 bg-[#f8f9fb] shrink-0 z-20">
            {tools.map((tool) => (
                <button 
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    title={tool.label}
                    className={`p-2.5 rounded-lg transition-all relative group ${
                        activeTab === tool.id 
                        ? 'bg-white text-[#2962ff] shadow-sm border border-[#dfe2e7]' 
                        : 'text-[#787b86] hover:text-[#131722] hover:bg-[#f2f3f5]'
                    }`}
                >
                    <tool.icon size={20} strokeWidth={activeTab === tool.id ? 2.5 : 1.5} />
                    {activeTab === tool.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#2962ff] rounded-r-full" />
                    )}
                </button>
            ))}
            
            <button 
                onClick={() => setActiveTab('system')}
                className={`p-2.5 text-[#787b86] hover:text-[#2962ff] transition-colors mt-auto rounded-lg ${activeTab === 'system' ? 'text-[#2962ff] bg-white border border-[#dfe2e7] shadow-sm' : ''}`}
            >
                <HelpCircle size={20} strokeWidth={1.5} />
            </button>
        </div>
    );
}
