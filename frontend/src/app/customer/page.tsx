"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Activity, Zap, Cpu, AlertTriangle, BarChart3, Clock, Database, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerDashboard() {
    const { companyProfile } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate data loading
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) {
        return <div className="grid grid-cols-4 gap-6 animate-pulse mt-8">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
            ))}
        </div>;
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Top Metrics - Kinetic Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'System Voltage', val: '230.4v', status: 'Stable', color: 'text-neon-cyan', glow: 'shadow-[#00E5FF]/20' },
                  { label: 'Current Load', val: '1.24 kA', status: 'Optimal', color: 'text-neon-lime', glow: 'shadow-[#CCFF00]/20' },
                  { label: 'Active Power', val: '842.5 kW', status: 'Running', color: 'text-neon-cyan', glow: 'shadow-[#00E5FF]/20' },
                  { label: 'Energy Accum.', val: '1,240.2 kWh', status: 'Daily', color: 'text-neon-orange', glow: 'shadow-[#FF3300]/20' },
                ].map((stat, i) => (
                  <div key={i} className="volt-card p-6 flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/30">{stat.label}</span>
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stat.color.replace('text-', 'bg-'))} />
                    </div>
                    <div>
                        <div className={cn("text-4xl font-black tabular-nums tracking-tighter", stat.color)}>{stat.val}</div>
                        <div className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest flex items-center gap-2">
                             <span className={cn("w-1 h-1 rounded-full", stat.color.replace('text-', 'bg-'))} />
                             {stat.status}
                        </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Main Visuals Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Large Monitoring Card */}
                <div className="xl:col-span-2 volt-card p-8 min-h-[400px]">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
                                <Activity size={20} className="text-neon-cyan" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-widest uppercase">Voltage Monitoring</h3>
                                <p className="text-[9px] font-bold text-white/20 mt-1 uppercase">Real-time phase potential analysis</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 text-[8px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" /> PHASE A
                             </div>
                             <div className="flex items-center gap-1.5 text-[8px] font-bold px-3 border-l border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-lime" /> PHASE B
                             </div>
                        </div>
                    </div>

                    {/* Simulated Waveform Area */}
                    <div className="h-64 mt-4 relative">
                        <div className="absolute inset-0 bg-volt-grid opacity-10 rounded-xl" />
                        <div className="h-full w-full flex items-center justify-center">
                             {/* Content would be a Chart.js or Recharts component here */}
                             <div className="text-center">
                                 <BarChart3 size={40} className="text-white/5 mx-auto mb-4" />
                                 <p className="text-[10px] font-bold text-white/10 tracking-widest uppercase italic">Phase Data Stream Active</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-8">
                    <div className="volt-card p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <Zap size={14} className="text-neon-lime" />
                            <h4 className="text-[10px] font-black tracking-[0.2em] uppercase italic">System Integrity</h4>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Harmonic Distortion', val: '0.82%', color: 'bg-neon-cyan' },
                                { label: 'Flicker Index', val: '0.122', color: 'bg-neon-lime' },
                                { label: 'Power Factor', val: '0.98', color: 'bg-neon-orange' },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[9px] font-bold mb-2 uppercase opacity-40">
                                        <span>{m.label}</span>
                                        <span>{m.val}</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: '80%' }} 
                                            className={cn("h-full", m.color)} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="volt-card p-6 bg-gradient-to-br from-neon-blue/5 to-transparent">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black tracking-[0.2em] uppercase">Plant Status</h4>
                            <span className="text-[8px] font-black bg-neon-lime/10 text-neon-lime px-2 py-0.5 rounded border border-neon-lime/20">OPERATIONAL</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed font-bold tracking-tight">
                            System is operating in interactive mode. All controllers are currently at 100% capacity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
