"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Activity, Zap, Cpu, AlertTriangle, BarChart3, Clock, Database, ArrowUpRight, ArrowDownRight, Droplets, Waves, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

// Simulated Real-time Data
const generateMockData = () => {
    return Array.from({ length: 20 }, (_, i) => ({
        time: `${i}:00`,
        p1: 230 + Math.random() * 5,
        p2: 231 + Math.random() * 4,
        p3: 229 + Math.random() * 6,
        load: 400 + Math.random() * 50,
        power: 800 + Math.random() * 100,
        energy: 1200 + i * 5,
    }));
};

export default function KineticDashboard() {
    const { companyProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState(generateMockData());

    useEffect(() => {
        setTimeout(() => setLoading(false), 1200);
        const interval = setInterval(() => {
            setChartData(prev => [...prev.slice(1), {
                ...prev[prev.length-1],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                p1: 230 + Math.random() * 5,
                p2: 231 + Math.random() * 4,
                p3: 229 + Math.random() * 6,
                load: 400 + Math.random() * 50,
                power: 800 + Math.random() * 100,
            }]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-[#05080F] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-neon-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#00E5FF]" />
                <span className="text-[10px] font-black text-neon-blue tracking-[0.5em] animate-pulse uppercase">Initializing Kinetic Scan</span>
            </div>
        </div>;
    }

    return (
        <div className="space-y-10 pb-24 customer-theme">
            {/* VOLTAGE MONITORING SECTION */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Waves size={18} className="text-neon-blue" />
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase">Voltage Monitoring</h2>
                    <div className="h-px flex-1 bg-white/5" />
                    <div className="flex gap-4">
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-cyan"><span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_#00E5FF]" /> PHASE A</span>
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-lime"><span className="w-1.5 h-1.5 rounded-full bg-neon-lime shadow-[0_0_8px_#CCFF00]" /> PHASE B</span>
                         <span className="flex items-center gap-2 text-[9px] font-bold text-neon-orange"><span className="w-1.5 h-1.5 rounded-full bg-neon-orange shadow-[0_0_8px_#FF3300]" /> PHASE C</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="volt-card p-6 h-[320px] relative group overflow-hidden">
                        <div className="absolute top-4 left-6 z-10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Phase-to-Neutral (L-N)</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.1}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[220, 240]} hide />
                                <Tooltip contentStyle={{ background: '#0A0E17', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                                <Area type="monotone" dataKey="p1" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorA)" animationDuration={1000} />
                                <Area type="monotone" dataKey="p2" stroke="#CCFF00" strokeWidth={2} fill="transparent" animationDuration={1200} />
                                <Area type="monotone" dataKey="p3" stroke="#FF3300" strokeWidth={2} fill="transparent" animationDuration={1400} />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex justify-between mt-4 px-2">
                             {[
                                { l: 'L1:N', v: '230.4v', c: 'text-neon-cyan' },
                                { l: 'L2:N', v: '231.2v', c: 'text-neon-lime' },
                                { l: 'L3:N', v: '229.8v', c: 'text-white' },
                                { l: 'AVG', v: '230.2v', c: 'text-white/40' },
                             ].map((v, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-[8px] font-bold text-white/20 uppercase mb-1">{v.l}</div>
                                    <div className={`text-sm font-black italic tracking-tighter ${v.c}`}>{v.v}</div>
                                </div>
                             ))}
                        </div>
                    </div>

                    <div className="volt-card p-6 h-[320px] relative overflow-hidden">
                        <div className="absolute top-4 left-6 z-10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Phase-to-Phase (L-L)</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[390, 410]} hide />
                                <Tooltip contentStyle={{ background: '#0A0E17', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                                <Line type="stepAfter" dataKey="load" stroke="#00E5FF" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="p1" stroke="#FF3300" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="flex justify-between mt-4 px-2">
                             {[
                                { l: 'L1:L2', v: '399.1v', c: 'text-white' },
                                { l: 'L2:L3', v: '398.4v', c: 'text-white' },
                                { l: 'L3:L1', v: '400.2v', c: 'text-white' },
                                { l: 'AVG', v: '398.7v', c: 'text-neon-orange' },
                             ].map((v, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-[8px] font-bold text-white/20 uppercase mb-1">{v.l}</div>
                                    <div className={`text-sm font-black italic tracking-tighter ${v.c}`}>{v.v}</div>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CURRENT & AMERAGE */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Zap size={18} className="text-neon-lime" />
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase">Current Amperage</h2>
                    <div className="h-px flex-1 bg-white/5" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="volt-card p-6 flex flex-col justify-between h-44 border-l-2 border-l-neon-blue">
                         <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Total Current</span>
                         <div>
                            <div className="text-3xl font-black text-neon-blue tracking-tighter italic">1.24 <span className="text-sm">kA</span></div>
                            <div className="text-[8px] font-bold text-neon-lime mt-1 tracking-widest">+4.2% FROM LAST HOUR</div>
                         </div>
                    </div>
                    {[
                        { label: 'Phase A', val: '412', color: 'text-neon-orange' },
                        { label: 'Phase B', val: '418', color: 'text-neon-cyan' },
                        { label: 'Phase C', val: '410', color: 'text-neon-lime' },
                    ].map((p, i) => (
                        <div key={i} className="volt-card p-6 flex flex-col justify-between h-44">
                             <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{p.label}</span>
                             <div className="flex items-end gap-2">
                                <div className={`text-3xl font-black italic tracking-tighter ${p.color}`}>{p.val} <span className="text-xs text-white/20">A</span></div>
                                <div className="h-8 w-px bg-white/5 mx-2" />
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full w-4/5 ${p.color.replace('text-', 'bg-')}`} />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* POWER & ENERGY GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Active Power */}
                <div className="volt-card p-8 space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={14} className="text-neon-cyan" />
                                <h3 className="text-[11px] font-black tracking-widest uppercase">Active Power</h3>
                            </div>
                            <div className="text-4xl font-black text-white tracking-tighter italic">842.5 <span className="text-lg text-neon-cyan">kW</span></div>
                        </div>
                        <div className="text-right">
                             <div className="text-[9px] font-bold text-white/20 uppercase mb-2">Power Components</div>
                             <div className="space-y-1">
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-tight flex justify-between gap-8">Apparent <span className="text-white">855.2 kVA</span></div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-tight flex justify-between gap-8">Reactive <span className="text-neon-orange">142.3 kVAR</span></div>
                             </div>
                        </div>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <Bar dataKey="power" fill="#00E5FF" radius={[2, 2, 0, 0]} opacity={0.6} />
                                <Bar dataKey="load" fill="#FF3300" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Energy Accumulation */}
                <div className="volt-card p-8 flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 h-full flex flex-col justify-between text-right z-10 pointer-events-none">
                         <div className="bg-white/5 border border-white/5 px-3 py-1 rounded text-[8px] font-black text-white/40 uppercase tracking-widest">Daily Total: 12.42 MWh</div>
                         <div className="space-y-6">
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-md">
                                <span className="block text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Inductive</span>
                                <span className="text-xl font-black text-neon-lime italic">142.8 <span className="text-[8px] opacity-40">kVARh</span></span>
                            </div>
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-md">
                                <span className="block text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Capacitive</span>
                                <span className="text-xl font-black text-neon-orange italic">12.4 <span className="text-[8px] opacity-40">kVARh</span></span>
                            </div>
                         </div>
                     </div>

                     <div className="space-y-2">
                        <h3 className="text-[11px] font-black tracking-widest uppercase text-white/20 mb-6 italic">Energy Accumulation (kWh)</h3>
                        <div className="text-4xl font-black text-white tracking-tighter italic">1,240.2 <span className="text-lg text-neon-lime">kWh</span></div>
                        <div className="text-[8px] font-black text-white/40 tracking-[0.3em] uppercase mt-2 italic flex gap-4">
                            <span>Active Import: 1,240.2</span>
                            <span className="text-neon-orange">Active Export: 0.0</span>
                        </div>
                     </div>

                     <div className="h-40 mt-8">
                        <ResponsiveContainer width="70%" height="100%">
                            <AreaChart data={chartData}>
                                <Area type="monotone" dataKey="energy" stroke="#CCFF00" fill="#CCFF00" fillOpacity={0.05} strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                     </div>
                </div>
            </div>

            {/* LOWER STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Harmonic */}
                 <div className="volt-card p-6 space-y-6 h-64">
                    <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30">Harmonic Distortion (THD)</h4>
                    <div className="flex items-end justify-between gap-2 h-24 px-4">
                        {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                             <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative group overflow-hidden">
                                <motion.div 
                                    initial={{ height: 0 }} animate={{ height: `${h}%` }}
                                    className={`absolute bottom-0 w-full ${i > 4 ? 'bg-neon-orange' : 'bg-neon-cyan/40'}`} 
                                />
                             </div>
                        ))}
                    </div>
                    <div className="flex justify-between">
                         <div className="text-center">
                            <div className="text-lg font-black text-white italic">0.82%</div>
                            <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Voltage THD</div>
                         </div>
                         <div className="text-center">
                            <div className="text-lg font-black text-neon-orange italic">4.21%</div>
                            <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Current THD</div>
                         </div>
                    </div>
                 </div>

                 {/* Flicker */}
                 <div className="volt-card p-6 h-64 flex flex-col justify-between">
                    <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30">Flicker Indices</h4>
                    <div className="space-y-6">
                        <div>
                             <div className="flex justify-between text-[10px] font-black italic mb-2 uppercase"><span>Pst (Short Term)</span> <span className="text-neon-lime">Stable</span></div>
                             <div className="text-xl font-black text-white mb-2 italic">0.122</div>
                             <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full w-1/4 bg-neon-lime" /></div>
                        </div>
                        <div>
                             <div className="flex justify-between text-[10px] font-black italic mb-2 uppercase"><span>Plt (Long Term)</span> <span className="text-neon-cyan">Optimal</span></div>
                             <div className="text-xl font-black text-white mb-2 italic">0.084</div>
                             <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full w-1/5 bg-neon-cyan" /></div>
                        </div>
                    </div>
                 </div>

                 {/* Power Factor & Frequency */}
                 <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6 h-64">
                     <div className="volt-card p-6 bg-gradient-to-t from-neon-blue/5 to-transparent flex flex-col justify-between items-center text-center">
                         <span className="text-[10px] font-black text-white/20 tracking-[0.4em] uppercase italic">Power Factor</span>
                         <div className="relative w-24 h-24 flex items-center justify-center">
                             <div className="absolute inset-0 border-2 border-white/5 rounded-full border-t-neon-blue shadow-[0_0_20px_#00E5FF] animate-spin-slow rotate-[230deg]" />
                             <div className="text-3xl font-black italic text-white">0.98</div>
                         </div>
                         <span className="text-[8px] font-black text-neon-blue tracking-[0.5em] uppercase italic bg-neon-blue/10 px-4 py-1 rounded-full">Lagging</span>
                     </div>
                     <div className="volt-card p-6 flex flex-col justify-between items-center text-center">
                         <span className="text-[10px] font-black text-white/20 tracking-[0.4em] uppercase italic">Frequency</span>
                         <div className="text-4xl font-black italic text-white">50.02 <span className="text-xs text-neon-lime">Hz</span></div>
                         <div className="w-full text-center space-y-1">
                            <div className="text-[8px] font-black text-white/10 uppercase tracking-widest">Variance +0.004%</div>
                            <div className="h-0.5 bg-white/5 w-full rounded-full overflow-hidden">
                                <div className="h-full w-1/2 bg-neon-lime mx-auto shadow-[0_0_8px_#CCFF00]" />
                            </div>
                         </div>
                     </div>
                 </div>
            </div>

            <style jsx global>{`
                .customer-theme {
                    --neon-blue: #00E5FF;
                    --neon-orange: #FF3300;
                    --neon-lime: #CCFF00;
                }
                .volt-card {
                    background: rgba(10, 14, 23, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                    cursor: crosshair;
                }
                .volt-card:hover {
                    border-color: rgba(0, 229, 255, 0.2);
                    box-shadow: 0 0 30px rgba(0, 229, 255, 0.08);
                    transform: translateY(-2px);
                }
                .text-neon-cyan { color: #00E5FF; }
                .bg-neon-blue { background-color: #00E5FF; }
                .text-neon-lime { color: #CCFF00; }
                .bg-neon-lime { background-color: #CCFF00; }
                .bg-neon-orange { background-color: #FF3300; }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
