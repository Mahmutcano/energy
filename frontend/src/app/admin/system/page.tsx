"use client";

import { useState } from 'react';
import { Building2, Users, Plus, LayoutGrid, ArrowRight } from 'lucide-react';

export default function SystemAdminDashboard() {
    const [customers, setCustomers] = useState([
        { id: 'c1', name: 'Enerji A.Ş.', description: 'Ege Bölgesi Santralleri', activePlants: 3, users: 5 },
        { id: 'c2', name: 'Güneş Gücü Ltd.', description: 'İç Anadolu Santralleri', activePlants: 2, users: 3 },
    ]);

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* 1. Administrative Nexus Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Administrator</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Global Governance Center</span>
                        <div className="h-px w-12 bg-slate-800"></div>
                        <span className="text-[10px] font-mono text-slate-600">CLIENT_CONTROL_v4.2</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-brand-green text-white rounded-xl text-xs font-black shadow-2xl shadow-brand-green/20 hover:scale-[1.02] transition-all uppercase tracking-widest group">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> New Customer
                    </button>
                    <div className="px-4 py-3 bg-slate-950/40 rounded-xl border border-slate-800/40 backdrop-blur-md hidden md:block">
                        <span className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">Status: Root Access</span>
                    </div>
                </div>
            </div>

            {/* 2. Global Fleet Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Total Customers', val: '24', icon: Building2, color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20' },
                    { label: 'Total Users', val: '142', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/5', border: 'border-blue-400/20' },
                    { label: 'Active Devices', val: '512', icon: LayoutGrid, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
                ].map((stat, i) => (
                    <div key={i} className={`card-base p-8 ${stat.bg} ${stat.border} relative overflow-hidden group`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <stat.icon size={48} />
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-tech-label ${stat.color}`}>{stat.label}</span>
                            <div className="px-2 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono border border-white/5 text-slate-500 uppercase">Live Metrics</div>
                        </div>
                        <h3 className={`text-5xl font-black italic tracking-tighter text-white tabular-nums`}>{stat.val}</h3>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-4 tracking-tight leading-none">Global system health nominal</p>
                    </div>
                ))}
            </div>

            {/* 3. Customer Registry Matrix */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Client Matrix</h2>
                    <div className="h-px flex-1 bg-slate-900"></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Authorized Entities Only</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {customers.map((customer) => (
                        <div key={customer.id} className="card-base p-8 bg-slate-950/40 dot-bg border-slate-800/60 hover:border-brand-green/30 hover:bg-slate-900/60 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group">
                            <div className="flex items-center gap-8">
                                <div className="h-20 w-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 group-hover:bg-brand-green/10 group-hover:text-brand-green group-hover:border-brand-green/30 transition-all">
                                    <Building2 size={36} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white group-hover:text-brand-green transition-colors leading-none tracking-tight">{customer.name}</h3>
                                    <p className="text-tech-label text-slate-500 normal-case tracking-normal text-[11px] font-medium">{customer.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-6 md:pt-0">
                                <div className="text-right flex-1 md:flex-none">
                                    <p className="text-tech-label mb-2">Plants</p>
                                    <p className="text-2xl font-black text-white italic tabular-nums">{customer.activePlants}</p>
                                </div>
                                <div className="text-right flex-1 md:flex-none">
                                    <p className="text-tech-label mb-2">Users</p>
                                    <p className="text-2xl font-black text-white italic tabular-nums">{customer.users}</p>
                                </div>
                                <button className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-700 hover:bg-brand-green hover:text-white hover:border-brand-green transition-all hover:translate-x-2 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <ArrowRight size={24} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Nexus Integrity Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-800 font-black tracking-[0.5em] pt-12 border-t border-slate-900 mt-12 uppercase italic">
                <span>Kernel Registry::Secure</span>
                <p>Node v1.0.4-ADMIN // BUILD_2026.02.12</p>
            </div>
        </div>
    );
}
