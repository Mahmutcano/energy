"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Info, Activity, Shield, Zap, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    setOpen: (val: boolean) => void;
    livePoints: any[];
}

export default function SidebarInfo({ isOpen, setOpen, livePoints }: SidebarProps) {
    const [page, setPage] = useState<'signals' | 'health'>('signals');

    if (!isOpen) return (
        <button 
            onClick={() => setOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-grafana-panel border border-grafana-border border-r-0 rounded-l-sm flex items-center justify-center text-grafana-text-secondary hover:text-grafana-accent-blue shadow-2xl z-30 transition-colors"
        >
            <ChevronRight size={14} className="rotate-180" />
        </button>
    );

    return (
        <motion.aside 
            key="sidebar-aside"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-grafana-border bg-grafana-bg flex flex-col shrink-0 z-20 shadow-2xl relative h-full overflow-hidden"
        >
            <div className="h-12 flex items-center justify-between px-4 border-b border-grafana-border bg-grafana-panel/50 shrink-0">
                <div className="flex bg-grafana-bg p-0.5 rounded-sm border border-grafana-border relative z-30">
                    <button 
                        onClick={() => setPage('signals')}
                        className={cn(
                            "px-4 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all cursor-pointer font-mono tracking-widest",
                            page === 'signals' ? "bg-grafana-panel text-grafana-accent-blue shadow-inner" : "text-grafana-text-secondary hover:text-white"
                        )}
                    >
                        SİNYALLER
                    </button>
                    <button 
                        onClick={() => setPage('health')}
                        className={cn(
                            "px-4 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all cursor-pointer font-mono tracking-widest",
                            page === 'health' ? "bg-grafana-panel text-grafana-accent-blue shadow-inner" : "text-grafana-text-secondary hover:text-white"
                        )}
                    >
                        SAĞLIK
                    </button>
                </div>
                <button onClick={() => setOpen(false)} className="text-grafana-text-secondary hover:text-white p-2 hover:bg-grafana-panel rounded-sm transition-all cursor-pointer relative z-30">
                    <ChevronRight size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-6">
                {page === 'signals' ? (
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1 text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.3em] font-mono">
                            <span>AKTİF KAYITLAR</span>
                            <Activity size={12} className="text-grafana-accent-blue" />
                        </div>
                        <div className="space-y-1">
                            {livePoints.slice(0, 100).map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-sm bg-grafana-panel/30 border border-grafana-border hover:border-grafana-accent-blue/40 transition-all group cursor-pointer active:scale-[0.98]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white truncate w-36 uppercase font-mono group-hover:text-grafana-accent-blue transition-colors">{p.name || 'DEĞER'}</span>
                                        <span className="text-[8px] text-grafana-text-secondary font-bold uppercase tracking-tighter mt-1">{p.measurementType?.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-bold tabular-nums text-white font-mono">{p.value?.toFixed(2)}</span>
                                        <div className={cn(
                                            "text-[7px] font-bold px-1 py-0.5 rounded-sm mt-1 uppercase font-mono",
                                            (p.value || 0) >= (p.prevValue || 0) 
                                                ? "text-grafana-accent-green bg-grafana-accent-green/5 border border-grafana-accent-green/10" 
                                                : "text-grafana-accent-red bg-grafana-accent-red/5 border border-grafana-accent-red/10"
                                        )}>
                                            {(p.value || 0) >= (p.prevValue || 0) ? 'ART' : 'AZL'} {Math.abs((p.value || 0) - (p.prevValue || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.3em] mb-4 px-1 font-mono">DÜĞÜM TANILAMA</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-4 bg-grafana-panel/30 rounded-sm border border-grafana-border flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">VERİMLİLİK ORANI</span>
                                        <Zap size={12} className="text-grafana-accent-blue" />
                                    </div>
                                    <span className="text-2xl font-black text-white font-mono tracking-tighter">94.2%</span>
                                    <div className="w-full bg-grafana-bg h-1 rounded-full overflow-hidden">
                                        <div className="bg-grafana-accent-blue h-full w-[94.2%]" />
                                    </div>
                                </div>
                                <div className="p-4 bg-grafana-panel/30 rounded-sm border border-grafana-border flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">ÇALIŞMA SÜRESİ</span>
                                        <Shield size={12} className="text-grafana-accent-green" />
                                    </div>
                                    <span className="text-2xl font-black text-white font-mono tracking-tighter">99.9%</span>
                                    <div className="w-full bg-grafana-bg h-1 rounded-full overflow-hidden">
                                        <div className="bg-grafana-accent-green h-full w-[99.9%]" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-grafana-accent-blue/10 border border-grafana-accent-blue/30 rounded-sm p-5 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Terminal size={64} />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-grafana-accent-blue font-mono">SİSTEM ANALİZLERİ</h4>
                                <p className="text-[11px] font-bold leading-relaxed mb-4 text-grafana-text-primary uppercase font-mono">Tüm protokoller çalışıyor. Aktif akışta spektral ihlal tespit edilmedi.</p>
                                <button className="w-full py-2 bg-grafana-accent-blue text-white rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-grafana-accent-blue/80 active:scale-95 font-mono">
                                    ARŞİV ÇEKİRDEĞİNİ AÇ
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </div>
            <style jsx>{`
                .custom-scroll::-webkit-scrollbar { width: 3px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
            `}</style>
        </motion.aside>
    );
}
