"use client";

import React from 'react';
import { Database, Maximize2, Settings2, Info } from 'lucide-react';

interface HeaderProps {
    plants: any[];
    devices: any[];
    selectedPlantId: string;
    selectedDeviceId: string;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isHistoricalMode: boolean;
    setHistoricalMode: (val: boolean) => void;
    titleMap: Record<string, string>;
    sidebarOpen: boolean;
    setSidebarOpen: (val: boolean) => void;
}

export default function TradingViewHeader({
    plants,
    devices,
    selectedPlantId,
    selectedDeviceId,
    activeTab,
    setActiveTab,
    isHistoricalMode,
    setHistoricalMode,
    titleMap,
    sidebarOpen,
    setSidebarOpen
}: HeaderProps) {
    return (
        <header className="h-12 flex items-center justify-between border-b border-[#dfe2e7] px-3 shrink-0 bg-white z-40 relative">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 pr-4 border-r border-[#dfe2e7]">
                    <div className="w-7 h-7 rounded-lg bg-[#2962ff] flex items-center justify-center text-white">
                        <Database size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black tracking-tight text-[#131722] leading-none uppercase">
                            {plants.find(p => p.id === selectedPlantId)?.plantName || 'TESİS'} 
                        </span>
                        <span className="text-[8px] text-[#2962ff] font-black uppercase tracking-tighter">
                            {devices.find(d => d.id === selectedDeviceId)?.deviceName || 'CİHAZ'}
                        </span>
                    </div>
                </div>
                
                <nav className="flex items-center h-full gap-0.5">
                    {Object.keys(titleMap).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 h-8 rounded-md flex items-center text-[10px] font-black uppercase tracking-tight transition-all hover:bg-[#f0f3fa] ${activeTab === tab ? 'text-[#2962ff] bg-blue-50' : 'text-[#787b86]'}`}
                        >
                            {titleMap[tab]}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex bg-[#f0f3fa] p-0.5 rounded-lg border border-[#dfe2e7]">
                    <button 
                        onClick={() => setHistoricalMode(false)}
                        className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${!isHistoricalMode ? 'bg-white text-[#2962ff] shadow-sm' : 'text-[#787b86] hover:text-[#131722]'}`}
                    >
                        CANLI
                    </button>
                    <button 
                        onClick={() => setHistoricalMode(true)}
                        className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${isHistoricalMode ? 'bg-white text-[#2962ff] shadow-sm' : 'text-[#787b86] hover:text-[#131722]'}`}
                    >
                        GEÇMİŞ
                    </button>
                </div>
                
                <div className="flex items-center gap-1 border-l border-[#dfe2e7] pl-3">
                    <button className="p-2 hover:bg-[#f0f3fa] rounded-lg text-[#787b86] hover:text-[#2962ff] transition-all">
                        <Maximize2 size={16} />
                    </button>
                    <button className="p-2 hover:bg-[#f0f3fa] rounded-lg text-[#787b86] hover:text-[#2962ff] transition-all">
                        <Settings2 size={16} />
                    </button>
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-2 rounded-lg transition-all ${sidebarOpen ? 'bg-blue-50 text-[#2962ff]' : 'text-[#787b86] hover:bg-[#f0f3fa]'}`}
                    >
                        <Info size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
