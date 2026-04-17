"use client";

import React from 'react';
import { Zap } from 'lucide-react';

interface TickerPoint {
    name?: string;
    value: number | null;
    prevValue?: number | null;
    unit?: string;
}

export default function TickerBar({ points, status }: { points: TickerPoint[], status: string }) {
    return (
        <div className="h-10 border-b border-[#dfe2e7] flex items-center bg-white overflow-hidden shrink-0 z-50">
            <div className="flex items-center h-full px-4 border-r border-[#dfe2e7] bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                <Zap size={14} className="text-[#2962ff] mr-2" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-[#131722]">Live Market</span>
            </div>
            <div className="flex-1 flex items-center gap-10 px-6 animate-ticker whitespace-nowrap overflow-x-auto no-scrollbar">
                {points.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 group cursor-pointer">
                        <span className="text-[10px] font-bold text-[#787b86] uppercase tracking-tighter group-hover:text-[#131722] transition-colors">{p.name || 'Value'}:</span>
                        <span className="text-[11px] font-black tabular-nums transition-all duration-300 text-[#131722]">
                            {p.value?.toFixed(2)} <small className="text-[8px] opacity-60 font-black">{p.unit}</small>
                        </span>
                        <div className={`w-1 h-3 rounded-full ${p.value! >= (p.prevValue || 0) ? 'bg-[#089981]' : 'bg-[#f23645]'} shadow-sm`} />
                    </div>
                ))}
            </div>
            <div className="px-6 flex items-center gap-4 border-l border-[#dfe2e7] bg-white h-full ml-auto">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${status === 'CONNECTED' ? 'bg-[#089981]' : 'bg-[#f23645]'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#131722]">{status}</span>
                </div>
            </div>
            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-15%); }
                }
                .animate-ticker {
                    animation: ticker 40s linear infinite;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
