"use client";

import React from 'react';
import { Zap, Activity, Radio, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerPoint {
    name?: string;
    value: number | null;
    prevValue?: number | null;
    unit?: string;
}

export default function TickerBar({ points, status }: { points: TickerPoint[], status: string }) {
    return (
        <div className="h-10 border-b border-grafana-border flex items-center bg-grafana-panel/90 backdrop-blur-md overflow-hidden shrink-0 z-50">
            <div className="flex items-center h-full px-5 border-r border-grafana-border bg-grafana-bg shadow-2xl relative z-10">
                <Radio size={14} className="text-grafana-accent-blue mr-3 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white font-mono whitespace-nowrap">CANLI TELEMETRİ</span>
            </div>
            
            <div className="flex-1 flex items-center gap-12 px-8 animate-ticker whitespace-nowrap overflow-x-auto no-scrollbar relative">
                {points.length === 0 ? (
                    <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.5em] font-mono animate-pulse">VERİ AKIŞI AKTİF...</span>
                ) : (
                    points.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 px-3 py-1 rounded-sm transition-all">
                            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest group-hover:text-grafana-accent-blue transition-colors font-mono">{p.name || 'VERİ'}:</span>
                            <span className="text-[11px] font-bold tabular-nums transition-all duration-300 text-white font-mono">
                                {p.value?.toFixed(2)} <span className="text-[9px] text-grafana-accent-blue font-bold ml-1">{p.unit}</span>
                            </span>
                            <div className={cn(
                                "w-1 h-3 rounded-full transition-all",
                                (p.value || 0) >= (p.prevValue || 0) 
                                    ? "bg-grafana-accent-green shadow-[0_0_8px_rgba(115,191,105,0.4)]" 
                                    : "bg-grafana-accent-red shadow-[0_0_8px_rgba(242,73,92,0.4)]"
                            )} />
                        </div>
                    ))
                )}
            </div>

            <div className="px-6 flex items-center gap-5 border-l border-grafana-border bg-grafana-bg h-full ml-auto shadow-2xl relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]",
                        status === 'BAĞLI' || status === 'CONNECTED' ? "bg-grafana-accent-green text-grafana-accent-green" : "bg-grafana-accent-red text-grafana-accent-red"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white font-mono">{status}</span>
                </div>
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-20%); }
                }
                .animate-ticker {
                    animation: ticker 60s linear infinite;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
