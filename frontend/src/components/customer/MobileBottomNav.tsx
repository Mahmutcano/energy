"use client";

import React from 'react';
import { LayoutDashboard, AlertTriangle, BarChart3, Settings, Zap, Shield, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NavItem {
    id: string;
    label: string;
    icon: any;
}

const ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'ÖZET', icon: LayoutDashboard },
    { id: 'voltage', label: 'GERİLİM', icon: Zap },
    { id: 'power', label: 'YÜK', icon: BarChart3 },
    { id: 'alarms', label: 'OLAY', icon: AlertTriangle },
    { id: 'system', label: 'TANI', icon: Terminal },
];

export default function MobileBottomNav({ activeTab, setActiveTab, alarmCount = 0 }: { activeTab: string, setActiveTab: (t: string) => void, alarmCount?: number }) {
    return (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 bg-grafana-panel/80 backdrop-blur-2xl border border-grafana-border/50 shadow-2xl rounded-sm h-18 flex items-center justify-around px-4 z-[1000]">
            {ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1.5 relative transition-all duration-300 w-14 h-14 rounded-sm",
                            isActive ? "text-grafana-accent-blue" : "text-grafana-text-secondary"
                        )}
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="mobile-nav-bg"
                                className="absolute inset-0 bg-grafana-accent-blue/10 border border-grafana-accent-blue/20 rounded-sm"
                            />
                        )}
                        <item.icon 
                            size={20} 
                            className={cn(
                                "relative z-10 transition-transform duration-300",
                                isActive && "scale-110"
                            )} 
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="text-[8px] font-bold uppercase tracking-widest relative z-10 font-mono">{item.label}</span>
                        
                        {item.id === 'alarms' && alarmCount > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-grafana-accent-red text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-grafana-bg animate-pulse shadow-[0_0_8px_rgba(242,73,92,0.6)]">
                                {alarmCount}
                            </span>
                        )}

                        {isActive && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-grafana-accent-blue rounded-full shadow-[0_0_8px_rgba(87,148,242,0.8)]" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
