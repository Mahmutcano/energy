"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Info, Activity } from 'lucide-react';

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
            className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-[#dfe2e7] border-r-0 rounded-l-lg flex items-center justify-center text-[#787b86] hover:text-[#2962ff] shadow-md z-30"
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
            className="border-l border-[#dfe2e7] bg-[#f8f9fb] flex flex-col shrink-0 z-20 shadow-[-1px_0_10px_rgba(0,0,0,0.03)] relative"
        >
            <div className="h-12 flex items-center justify-between px-4 border-b border-[#dfe2e7] bg-white shrink-0">
                <div className="flex bg-[#f2f3f5] p-0.5 rounded-lg border border-[#dfe2e7] relative z-30">
                    <button 
                        onClick={() => setPage('signals')}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${page === 'signals' ? 'bg-white text-[#2962ff] shadow-sm' : 'text-[#787b86] hover:text-[#131722]'}`}
                    >
                        Sinyaller
                    </button>
                    <button 
                        onClick={() => setPage('health')}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${page === 'health' ? 'bg-white text-[#2962ff] shadow-sm' : 'text-[#787b86] hover:text-[#131722]'}`}
                    >
                        Durum
                    </button>
                </div>
                <button onClick={() => setOpen(false)} className="text-[#787b86] hover:text-[#131722] p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer relative z-30">
                    <ChevronRight size={14} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                {page === 'signals' ? (
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1 text-[9px] font-black text-[#787b86] uppercase tracking-widest">
                            <span>AKTİF SEMBOLLER</span>
                            <Activity size={10} className="text-[#2962ff]" />
                        </div>
                        <div className="space-y-1">
                            {livePoints.slice(0, 50).map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#dfe2e7] hover:border-[#2962ff44] transition-all group cursor-pointer active:scale-[0.98]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-[#131722] truncate w-32">{p.name || 'DEĞER'}</span>
                                        <span className="text-[8px] text-[#787b86] font-bold uppercase">{p.measurementType?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black tabular-nums text-[#131722]">{p.value?.toFixed(2)}</span>
                                        <div className={`text-[7px] font-black px-1 rounded ${p.value! >= (p.prevValue || 0) ? 'text-[#089981] bg-emerald-50' : 'text-[#f23645] bg-rose-50'}`}>
                                            {p.value! >= (p.prevValue || 0) ? '▲' : '▼'} {Math.abs((p.value || 0) - (p.prevValue || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <div className="space-y-4">
                        <section>
                            <h3 className="text-[9px] font-black text-[#787b86] uppercase tracking-widest mb-3 px-1">DÜĞÜM DURUMU</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-white rounded-xl border border-[#dfe2e7] flex flex-col items-center justify-center gap-1">
                                    <span className="text-[8px] font-bold text-[#787b86] uppercase">Verimlilik</span>
                                    <span className="text-[12px] font-black text-[#2962ff]">94.2%</span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-[#dfe2e7] flex flex-col items-center justify-center gap-1">
                                    <span className="text-[8px] font-bold text-[#787b86] uppercase">Up-Time</span>
                                    <span className="text-[12px] font-black text-[#089981]">99.9%</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#2962ff] rounded-xl p-4 text-white shadow-lg shadow-blue-50 relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-80">Sistem Öngörüsü</h4>
                                <p className="text-[10px] font-bold leading-normal mb-3">Tüm sistemler çalışır durumda. Kritik eşik ihlali yok.</p>
                                <button className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-sm transition-all focus:outline-none">
                                    ARŞİVİ AÇ
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #dfe2e7; border-radius: 10px; }
            `}</style>
        </motion.aside>
    );
}
