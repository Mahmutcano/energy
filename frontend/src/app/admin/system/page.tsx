"use client";

import { useState } from 'react';
import { Building2, Users, Plus, LayoutGrid, ArrowRight } from 'lucide-react';

export default function SystemAdminDashboard() {
    const [customers, setCustomers] = useState([
        { id: 'c1', name: 'Enerji A.Ş.', description: 'Ege Bölgesi Santralleri', activePlants: 3, users: 5 },
        { id: 'c2', name: 'Güneş Gücü Ltd.', description: 'İç Anadolu Santralleri', activePlants: 2, users: 3 },
    ]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        System <span className="text-blue-500 italic">Administrator</span>
                    </h1>
                    <p className="text-slate-400">Manage clients, license tiers, and global system health.</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                    <Plus size={20} />
                    New Customer
                </button>
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Customers', val: '24', icon: Building2, color: 'blue' },
                    { label: 'Total Users', val: '142', icon: Users, color: 'emerald' },
                    { label: 'Active Devices', val: '512', icon: LayoutGrid, color: 'amber' },
                ].map((stat) => (
                    <div key={stat.label} className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center gap-6">
                        <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400`}>
                            <stat.icon size={32} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">{stat.label}</p>
                            <p className="text-3xl font-black text-white italic">{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Customer List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold italic text-white">Registered <span className="text-slate-500">Customers</span></h2>
                <div className="grid grid-cols-1 gap-4">
                    {customers.map((customer) => (
                        <div key={customer.id} className="group p-6 rounded-3xl bg-slate-900/30 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/50 transition-all duration-300 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{customer.name}</h3>
                                    <p className="text-slate-500 text-sm">{customer.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">Plants</p>
                                    <p className="text-xl font-black text-slate-300 italic">{customer.activePlants}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">Users</p>
                                    <p className="text-xl font-black text-slate-300 italic">{customer.users}</p>
                                </div>
                                <button className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-1">
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
