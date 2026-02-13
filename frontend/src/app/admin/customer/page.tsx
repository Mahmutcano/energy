"use client";

import { useState } from 'react';
import { Factory, Cpu, Plus, Settings2, Activity, Pencil, Trash2 } from 'lucide-react';

export default function CustomerAdminDashboard() {
    const [plants, setPlants] = useState([
        { id: 'pp-1', name: 'Güneş GES - 01', type: 'Solar', devices: 12, status: 'Active' },
        { id: 'pp-2', name: 'Rüzgar RES - 04', type: 'Wind', devices: 4, status: 'Maintenance' },
    ]);

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* 1. Fleet Operations Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Customer Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Asset Management Shell</span>
                        <div className="h-px w-12 bg-slate-800"></div>
                        <span className="text-[10px] font-mono text-slate-600">CLIENT_ID: OPERATOR_SECURE</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-black text-slate-400 hover:text-white hover:border-slate-700 transition-all uppercase tracking-widest group">
                        <Settings2 size={18} /> Settings
                    </button>
                    <button className="flex items-center gap-3 px-8 py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest group">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Add Power Plant
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* 2. Plant Registry Column */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Active Plants</h2>
                        <div className="h-px flex-1 bg-slate-900"></div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Authorized Access Only</span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {plants.map((plant) => (
                            <div key={plant.id} className="card-base p-8 bg-slate-950/40 dot-bg border-slate-800/60 hover:border-brand-green/30 hover:bg-slate-900/60 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group">
                                <div className="flex items-center gap-8">
                                    <div className={`h-20 w-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center transition-all ${plant.status === 'Active' ? 'text-brand-green group-hover:bg-brand-green/10' : 'text-warning group-hover:bg-warning/10'}`}>
                                        <Activity size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white group-hover:text-brand-green transition-colors leading-none tracking-tight uppercase">{plant.name}</h3>
                                        <p className="text-tech-label text-slate-500 normal-case tracking-normal text-[11px] font-medium">{plant.type} Platform • {plant.devices} Technical Units</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-6 md:pt-0">
                                    <button className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-white hover:border-slate-700 transition-all">
                                        <Pencil size={18} />
                                    </button>
                                    <button className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-danger hover:border-danger/30 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                    <button className="ml-4 px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-green hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                                        View Maps
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Operational Quick Stats */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="flex items-center gap-3 px-2">
                        <Cpu className="text-slate-700" size={18} />
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Device Summary</h2>
                    </div>

                    <div className="card-base p-10 bg-slate-900 dot-bg border-slate-800/80 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.05] group-hover:-translate-x-2 group-hover:-translate-y-2 transition-all">
                            <Cpu size={240} />
                        </div>

                        <p className="text-tech-label mb-2">Total Field Units</p>
                        <div className="flex items-baseline gap-2 mb-10">
                            <h4 className="text-6xl font-black text-white italic tracking-tighter">16</h4>
                            <span className="text-2xl font-black text-slate-800 italic">/ 18</span>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {[
                                { protocol: 'Modbus TCP', state: 'Active Hub', color: 'text-brand-green' },
                                { protocol: 'IEC 104 Socket', state: 'Syncing', color: 'text-brand-green' },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800/40">
                                    <span className="text-[11px] font-black text-white uppercase tracking-widest">{item.protocol}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${item.color}`}>{item.state}</span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-10 py-5 bg-brand-green text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10">
                            Manage All Devices
                        </button>
                    </div>

                    {/* Secondary Status Section */}
                    <section className="card-base bg-slate-950 p-8 border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-tech-label">System Integrity</span>
                            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                        </div>
                        <div className="space-y-4">
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="w-[88%] h-full bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-700">
                                <span>Core Stability</span>
                                <span>88.4% Nominal</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* 4. Nexus Integrity Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-800 font-black tracking-[0.5em] pt-12 border-t border-slate-900 mt-12 uppercase italic">
                <span>Asset Shell Alpha::Online</span>
                <p>Build 2026.02.12 // Terminal v1.4</p>
            </div>
        </div>
    );
}
