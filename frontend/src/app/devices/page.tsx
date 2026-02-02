"use client";

import { Activity, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';

export default function Devices() {
    const devices = [
        { id: '1', name: 'RTU Transformers-01', ip: '192.168.1.10', status: 'ONLINE', mappings: 12 },
        { id: '2', name: 'Main Switchgear East', ip: '192.168.1.11', status: 'ONLINE', mappings: 8 },
        { id: '3', name: 'Generator Control B', ip: '192.168.1.15', status: 'OFFLINE', mappings: 5 },
    ];

    const mappings = [
        { ioa: 100, name: 'Active Power L1', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 101, name: 'Active Power L2', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 102, name: 'Active Power L3', unit: 'kW', scale: 1.0, type: 'Analog' },
        { ioa: 200, name: 'Breaker Status', unit: 'BOOL', scale: 1.0, type: 'Digital' },
        { ioa: 201, name: 'Fault Signal', unit: 'BOOL', scale: 1.0, type: 'Digital' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        Device <span className="text-blue-500 italic">Management</span>
                    </h1>
                    <p className="text-slate-400">Configure RTU devices and IOA protocol mappings</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all">
                    <Plus className="h-5 w-5" /> Add New device
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div className="space-y-3">
                        {devices.map((device) => (
                            <div key={device.id} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-200 italic group-hover:text-blue-400">{device.name}</h4>
                                    <div className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                                </div>
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    <span>{device.ip}</span>
                                    <span>{device.mappings} Mappings</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-slate-900/30 rounded-3xl border border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h3 className="font-bold italic text-slate-200">IOA Mapping: RTU Transformers-01</h3>
                            <button className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">
                                Bulk import
                            </button>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold border-b border-slate-800">
                                    <th className="px-6 py-4">IOA</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Unit</th>
                                    <th className="px-6 py-4">Scale</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {mappings.map((mapping) => (
                                    <tr key={mapping.ioa} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-400">{mapping.ioa}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-200">{mapping.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{mapping.unit}</td>
                                        <td className="px-6 py-4 text-slate-400">{mapping.scale.toFixed(1)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${mapping.type === 'Analog' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {mapping.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:text-white text-slate-500 transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
