"use client";

import React from 'react';
import { LayoutDashboard, AlertTriangle, BarChart3, Settings, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
    id: string;
    label: string;
    icon: any;
}

const ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Özet', icon: LayoutDashboard },
    { id: 'voltage', label: 'Gerilim', icon: Zap },
    { id: 'power', label: 'Güç', icon: BarChart3 },
    { id: 'alarms', label: 'Alarmlar', icon: AlertTriangle },
    { id: 'system', label: 'Sistem', icon: Settings },
];

export default function MobileBottomNav({ activeTab, setActiveTab, alarmCount = 0 }: { activeTab: string, setActiveTab: (t: string) => void, alarmCount?: number }) {
    return (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2rem] h-16 flex items-center justify-around px-2 z-[1000] border-t border-white/20">
            {ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 relative transition-all duration-300 w-12 h-12 rounded-2xl",
                            isActive ? "text-[#2962ff]" : "text-[#787b86]"
                        )}
                    >
                        <div className={cn(
                            "absolute inset-0 scale-75 opacity-0 transition-all duration-300 rounded-2xl bg-blue-50",
                            isActive && "scale-100 opacity-100"
                        )} />
                        <item.icon 
                            size={20} 
                            className={cn(
                                "relative z-10 transition-transform duration-300",
                                isActive && "scale-110"
                            )} 
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="text-[9px] font-black uppercase tracking-tighter relative z-10">{item.label}</span>
                        
                        {item.id === 'alarms' && alarmCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                {alarmCount}
                            </span>
                        )}

                        {isActive && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-[#2962ff] rounded-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
