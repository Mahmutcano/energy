"use client";

import { useState } from 'react';
import { Factory, Cpu, Plus, Settings2, Activity, Pencil, Trash2 } from 'lucide-react';

export default function CustomerAdminDashboard() {
    const [plants, setPlants] = useState([
        { id: 'pp-1', name: 'Güneş GES - 01', type: 'Solar', devices: 12, status: 'Active' },
        { id: 'pp-2', name: 'Rüzgar RES - 04', type: 'Wind', devices: 4, status: 'Maintenance' },
    ]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        Customer <span className="text-emerald-500 italic">Dashboard</span>
                    </h1>
                    <p className="text-slate-400">Manage your power plants, RTU devices, and field mappings.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold transition-all border border-slate-700">
                        <Settings2 size={20} />
                        Settings
                    </button>
                    <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
                        <Plus size={20} />
                        Add Power Plant
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Plants Management */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold italic text-white flex items-center gap-3">
                        <Factory className="text-emerald-500" />
                        Active <span className="text-slate-500">Plants</span>
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        {plants.map((plant) => (
                            <div key={plant.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${plant.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{plant.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium">{plant.type} • {plant.devices} Devices</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">
                                        <Pencil size={18} />
                                    </button>
                                    <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                    <button className="ml-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                                        View Maps
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Quick Device Stats */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold italic text-white flex items-center gap-3">
                        <Cpu className="text-blue-500" />
                        Device <span className="text-slate-500">Summary</span>
                    </h2>

                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden">
                        <Cpu className="absolute -bottom-4 -right-4 h-32 w-32 opacity-15" />
                        <p className="text-xs uppercase tracking-[0.2em] font-black opacity-60 mb-1">Total Connected Devices</p>
                        <h4 className="text-5xl font-black italic mb-6">16 / 18</h4>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/5">
                                <span>Modbus TCP</span>
                                <span className="text-emerald-300">Active</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/5">
                                <span>IEC 104</span>
                                <span className="text-emerald-300">Active</span>
                            </div>
                        </div>

                        <button className="w-full mt-8 py-4 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all">
                            Manage All Devices
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
