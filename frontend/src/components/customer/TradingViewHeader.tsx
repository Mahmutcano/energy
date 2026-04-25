"use client";

import React from 'react';
import { Database, Maximize2, Settings2, Info, Activity, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <header className="h-12 flex items-center justify-between border-b border-grafana-border px-4 shrink-0 bg-grafana-panel/80 z-40 relative backdrop-blur-md">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-6 border-r border-grafana-border/50">
                    <div className="w-8 h-8 rounded-sm bg-grafana-bg border border-grafana-border flex items-center justify-center text-grafana-accent-blue shadow-inner">
                        <Database size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold tracking-tight text-white leading-none uppercase font-mono">
                            {plants.find(p => p.id === selectedPlantId)?.plantName || 'TESİS YOK'} 
                        </span>
                        <span className="text-[9px] text-grafana-accent-blue font-bold uppercase tracking-widest font-mono mt-1">
                            {devices.find(d => d.id === selectedDeviceId)?.deviceName || 'İSTASYON YOK'}
                        </span>
                    </div>
                </div>
                
                <nav className="flex items-center h-full gap-1">
                    {Object.keys(titleMap).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 h-8 rounded-sm flex items-center text-[10px] font-bold uppercase tracking-widest transition-all font-mono",
                                activeTab === tab 
                                    ? "text-white bg-grafana-accent-blue/10 border border-grafana-accent-blue/20" 
                                    : "text-grafana-text-secondary hover:text-white hover:bg-grafana-panel"
                            )}
                        >
                            {titleMap[tab]}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex bg-grafana-bg p-0.5 rounded-sm border border-grafana-border">
                    <button 
                        onClick={() => setHistoricalMode(false)}
                        className={cn(
                            "px-5 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all font-mono tracking-widest",
                            !isHistoricalMode 
                                ? "bg-grafana-panel text-grafana-accent-green shadow-inner" 
                                : "text-grafana-text-secondary hover:text-white"
                        )}
                    >
                        CANLI AKIŞ
                    </button>
                    <button 
                        onClick={() => setHistoricalMode(true)}
                        className={cn(
                            "px-5 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all font-mono tracking-widest",
                            isHistoricalMode 
                                ? "bg-grafana-panel text-grafana-accent-blue shadow-inner" 
                                : "text-grafana-text-secondary hover:text-white"
                        )}
                    >
                        GEÇMİŞ
                    </button>
                </div>
                
                <div className="flex items-center gap-1 border-l border-grafana-border pl-4">
                    <button className="p-2 text-grafana-text-secondary hover:text-white transition-colors">
                        <Maximize2 size={16} />
                    </button>
                    <button className="p-2 text-grafana-text-secondary hover:text-white transition-colors">
                        <Settings2 size={16} />
                    </button>
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={cn(
                            "p-2 rounded-sm transition-all",
                            sidebarOpen ? "text-grafana-accent-blue bg-grafana-accent-blue/10" : "text-grafana-text-secondary hover:text-white"
                        )}
                    >
                        <Info size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
