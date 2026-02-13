"use client";

import { useTheme } from '@/context/ThemeContext';
import {
    Settings as SettingsIcon,
    Palette,
    Monitor,
    Shield,
    Zap,
    Check,
    Cpu,
    Database,
    HardDrive
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themes = [
        {
            id: 'industrial-blue',
            name: 'INDUSTRIAL_EMERALD',
            color: '#00754A',
            desc: 'New corporate protocol identity (Active: 0x01)'
        },
        {
            id: 'classic-green',
            name: 'CLASSIC_SCADA_BRIGHT',
            color: '#10b981',
            desc: 'Legacy system aesthetic for core grid control'
        },
        {
            id: 'warning-amber',
            name: 'CAUTION_AMBER',
            color: '#f59e0b',
            desc: 'High visibility mode for critical environments'
        },
        {
            id: 'high-contrast-ghost',
            name: 'GHOST_HEADS_UP',
            color: '#e2e8f0',
            desc: 'Ultra-clear monochrome mapping interface'
        }
    ];

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* 1. Configuration Directive Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Settings</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Core Configuration</span>
                        <div className="h-px w-12 bg-slate-800"></div>
                        <span className="text-[10px] font-mono text-slate-600">STABILITY: NOMINAL</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <span>Host: SCADA Kernel v1.0.4</span>
                    <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* 2. Visual & Master Controls */}
                <div className="xl:col-span-8 space-y-8">
                    <section className="card-base bg-slate-900/20 dot-bg border-slate-800/60 overflow-hidden">
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-brand-green">
                                    <Palette size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">UI Theme Subsystem</h3>
                            </div>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={`relative p-6 text-left border-2 rounded-2xl transition-all group overflow-hidden ${theme === t.id
                                        ? 'bg-slate-900/60 border-brand-green shadow-xl'
                                        : 'bg-slate-950/20 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full border border-white/10 shadow-lg"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span className={`text-xs font-black tracking-widest uppercase ${theme === t.id ? 'text-white' : 'text-slate-500'}`}>
                                                {t.name.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        {theme === t.id && (
                                            <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
                                        {t.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="card-base bg-slate-900/20 dot-bg border-slate-800/60 overflow-hidden">
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-brand-green">
                                    <Zap size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">System Deployment Core</h3>
                            </div>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-tech-label">Gateway IP Override</label>
                                    <input type="text" placeholder="192.168.1.1" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-xs font-black text-brand-green focus:border-brand-green outline-none transition-all placeholder:text-slate-900 font-mono" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-tech-label">Master Node ID</label>
                                    <input type="text" placeholder="SCADA_NODE_01" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-xs font-black text-white focus:border-brand-green outline-none transition-all placeholder:text-slate-900 font-mono" />
                                </div>
                            </div>
                            <div className="space-y-6 border-l border-slate-800/40 pl-10">
                                <div className="p-5 bg-brand-green/5 border border-brand-green/10 rounded-2xl">
                                    <p className="text-[10px] font-black text-brand-green mb-2 uppercase tracking-widest">Discovery Status</p>
                                    <p className="text-base font-black text-white italic tracking-tighter">Listening on Port 2404</p>
                                    <div className="mt-4 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-green w-1/3 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.01] transition-all uppercase tracking-[0.2em]">
                                    Save System Overrides
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                {/* 3. Status & Identity Context */}
                <div className="xl:col-span-4 space-y-8">
                    <section className="card-base bg-slate-950 p-8 border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                                <Shield size={18} className="text-brand-green" />
                            </div>
                            <span className="text-tech-label">Security Context</span>
                        </div>
                        <div className="space-y-4">
                            <div className="p-5 border border-slate-800 bg-slate-900/20 rounded-xl">
                                <p className="text-[9px] text-slate-600 font-black mb-2 uppercase tracking-widest leading-none">Uplink Cipher</p>
                                <p className="text-xs text-white font-black italic uppercase tracking-tight">AES-256 GCM [Verified]</p>
                            </div>
                            <div className="p-5 border border-slate-800 bg-slate-900/20 rounded-xl">
                                <p className="text-[9px] text-slate-600 font-black mb-2 uppercase tracking-widest leading-none">Identity Token</p>
                                <p className="text-[10px] text-slate-400 font-mono italic truncate">SCADA_SESSION_EYJ0...</p>
                            </div>
                        </div>
                    </section>

                    <section className="card-base bg-slate-950 p-8 border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
                                <HardDrive size={18} />
                            </div>
                            <span className="text-tech-label">Storage Nodes</span>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Prisma DB', state: 'CONNECTED', util: '14%', color: 'text-brand-green' },
                                { label: 'Redis Cache', state: 'SYNCED', util: '2%', color: 'text-brand-green' },
                                { label: 'System FS', state: 'STABLE', util: '82%', color: 'text-warning' },
                            ].map((s) => (
                                <div key={s.label} className="flex justify-between items-center border-b border-slate-800/40 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-tight">{s.label}</p>
                                        <p className={`text-[9px] font-black tracking-widest mt-1 opacity-80 ${s.color}`}>{s.state}</p>
                                    </div>
                                    <span className="text-xs font-black italic text-slate-600 tabular-nums">{s.util}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* 4. Integrity Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-700 font-black tracking-[0.4em] pt-8 px-2 border-t border-slate-900 mt-10">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <Database size={14} className="text-slate-800" />
                        Storage Local OK
                    </span>
                    <span className="flex items-center gap-2">
                        <Cpu size={14} className="text-slate-800" />
                        Node Verified
                    </span>
                </div>
                <p>Build 2026.02.12 // Terminal Shell v1.4</p>
            </div>
        </div>
    );
}
