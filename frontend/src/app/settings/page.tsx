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
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themes = [
        {
            id: 'light-pure',
            name: 'PURE WHITE TECH',
            color: '#f8fafc',
            desc: 'Ultra-clean energy monitoring laboratory aesthetic'
        },
        {
            id: 'industrial-emerald',
            name: 'INDUSTRIAL EMERALD',
            color: '#10b981',
            desc: 'New corporate protocol identity (Active: 0x01)'
        },
        {
            id: 'classic-grid',
            name: 'CLASSIC GRID',
            color: '#38bdf8',
            desc: 'Legacy system aesthetic for core grid control'
        },
        {
            id: 'warning-hazard',
            name: 'WARNING HAZARD',
            color: '#f59e0b',
            desc: 'High visibility mode for critical environments'
        },
        {
            id: 'ghost-white',
            name: 'GHOST INTERFACE',
            color: '#64748b',
            desc: 'Ultra-clear monochrome mapping interface'
        },
        {
            id: 'cyber-neon',
            name: 'CYBER NEON V1',
            color: '#ff00ff',
            desc: 'Night-shift optimized synthetic aesthetics'
        },
        {
            id: 'midnight-oil',
            name: 'MIDNIGHT OIL',
            color: '#64ffda',
            desc: 'Deep-sea operations console environment'
        },
        {
            id: 'oceanic-depth',
            name: 'OCEANIC DEPTH',
            color: '#00b4d8',
            desc: 'Hydro-thermal plant monitoring interface'
        },
        {
            id: 'solar-flare',
            name: 'SOLAR FLARE',
            color: '#ff6b00',
            desc: 'High-energy fusion reactor telemetry'
        },
        {
            id: 'toxic-waste',
            name: 'TOXIC WASTE',
            color: '#d4ff00',
            desc: 'Bio-chemical containment unit monitor'
        },
        {
            id: 'monokai-pro',
            name: 'MONOKAI TECH',
            color: '#ffd866',
            desc: 'System engineer diagnostic environment'
        },
        {
            id: 'matrix-overload',
            name: 'MATRIX RELOADED',
            color: '#00ff41',
            desc: 'Kernal-level direct memory visualization'
        },
        {
            id: 'frost-bit',
            name: 'FROST CRYOGENIC',
            color: '#1992d4',
            desc: 'Sub-zero storage facility SCADA node'
        }
    ];

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            <PageHeader 
                title="SİSTEM" 
                highlightedTitle="AYARLARI"
                subtitle="Çekirdek yapılandırma ve arayüz özelleştirme matrisi"
                icon={SettingsIcon}
            >
                <div className="flex items-center gap-4 text-[10px] font-black text-grafana-text-secondary tracking-widest px-6 py-3 bg-grafana-bg border border-grafana-border rounded-sm font-mono">
                    <span>HOST: SCADA KERNEL V1.0.4</span>
                    <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_10px_rgba(115,191,105,0.5)]"></div>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* 2. Visual & Master Controls */}
                <div className="xl:col-span-8 space-y-8">
                    <section className="card-base bg-slate-900/20 dot-bg border-slate-800/60 overflow-hidden">
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-grafana-accent-blue">
                                    <Palette size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white  tracking-tight">GÖRÜNÜM TEMASI SİSTEMİ</h3>
                            </div>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={`relative p-6 text-left border-2 rounded-2xl transition-all group overflow-hidden ${theme === t.id
                                        ? 'bg-slate-900/60 border-grafana-accent-blue shadow-xl'
                                        : 'bg-slate-950/20 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full border border-white/10 shadow-lg"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span className={`text-xs font-black tracking-widest  ${theme === t.id ? 'text-white' : 'text-slate-500'}`}>
                                                {t.name.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        {theme === t.id && (
                                            <div className="w-5 h-5 bg-grafana-accent-blue rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold  tracking-tight leading-relaxed">
                                        {t.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="card-base bg-slate-900/20 dot-bg border-slate-800/60 overflow-hidden">
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-grafana-accent-blue">
                                    <Zap size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white  tracking-tight">SİSTEM DAĞITIM MERKEZİ</h3>
                            </div>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-tech-label">Gateway IP Override</label>
                                    <input type="text" placeholder="192.168.1.1" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-xs font-black text-grafana-accent-blue focus:border-grafana-accent-blue outline-none transition-all placeholder:text-slate-900 font-mono" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-tech-label">Master Node ID</label>
                                    <input type="text" placeholder="SCADA NODE 01" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-xs font-black text-white focus:border-grafana-accent-blue outline-none transition-all placeholder:text-slate-900 font-mono" />
                                </div>
                            </div>
                            <div className="space-y-6 border-l border-slate-800/40 pl-10">
                                <div className="p-5 bg-grafana-accent-blue/5 border border-grafana-accent-blue/10 rounded-2xl">
                                    <p className="text-[10px] font-black text-grafana-accent-blue mb-2  tracking-widest">Discovery Status</p>
                                    <p className="text-base font-black text-white italic tracking-tighter">Listening on Port 2404</p>
                                    <div className="mt-4 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-grafana-accent-green w-1/3 animate-pulse shadow-[0_0_8px_rgba(115,191,105,0.5)]"></div>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-grafana-accent-blue text-white rounded-xl text-xs font-black shadow-2xl shadow-grafana-accent-blue/20 hover:scale-[1.01] transition-all  tracking-[0.2em]">
                                    SİSTEM AYARLARINI KAYDET
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
                                <Shield size={18} className="text-grafana-accent-blue" />
                            </div>
                            <span className="text-tech-label">GÜVENLİK KAPSAMI</span>
                        </div>
                        <div className="space-y-4">
                            <div className="p-5 border border-slate-800 bg-slate-900/20 rounded-xl">
                                <p className="text-[9px] text-slate-600 font-black mb-2  tracking-widest leading-none">Uplink Cipher</p>
                                <p className="text-xs text-white font-black italic  tracking-tight">AES-256 GCM [Verified]</p>
                            </div>
                            <div className="p-5 border border-slate-800 bg-slate-900/20 rounded-xl">
                                <p className="text-[9px] text-slate-600 font-black mb-2  tracking-widest leading-none">Identity Token</p>
                                <p className="text-[10px] text-slate-400 font-mono italic truncate">SCADA SESSION EYJ0...</p>
                            </div>
                        </div>
                    </section>

                    <section className="card-base bg-slate-950 p-8 border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
                                <HardDrive size={18} />
                            </div>
                            <span className="text-tech-label">DEPOLAMA DÜĞÜMLERİ</span>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Prisma DB', state: 'CONNECTED', util: '14%', color: 'text-grafana-accent-green' },
                                { label: 'Redis Cache', state: 'SYNCED', util: '2%', color: 'text-grafana-accent-green' },
                                { label: 'System FS', state: 'STABLE', util: '82%', color: 'text-warning' },
                            ].map((s) => (
                                <div key={s.label} className="flex justify-between items-center border-b border-slate-800/40 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="text-xs font-black text-white  tracking-tight">{s.label}</p>
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
