"use client";

import { AlertTriangle, Bell, Clock, CheckCircle, Search, Filter } from 'lucide-react';

const alarms = [
    { id: 1, device: 'RTU Transformers-01', ioa: 100, msg: 'Active Power exceeded High-Threshold (294.2 kW)', severity: 'CRITICAL', time: '2024-02-02 21:05:12', status: 'ACTIVE' },
    { id: 2, device: 'RTU Transformers-01', ioa: 101, msg: 'Phase A Voltage outside normal range', severity: 'WARNING', time: '2024-02-02 20:45:00', status: 'ACKNOWLEDGED' },
    { id: 3, device: 'Main Switchgear East', ioa: 502, msg: 'Breaker Trip - Overcurrent Protection', severity: 'CRITICAL', time: '2024-02-02 19:12:33', status: 'RESOLVED' },
    { id: 4, device: 'Generator Control B', ioa: 200, msg: 'Communication Timeout with RTU', severity: 'WARNING', time: '2024-02-02 18:30:15', status: 'ACTIVE' },
];

export default function Alarms() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                        Alarm <span className="text-rose-500 italic">Engine</span>
                    </h1>
                    <p className="text-slate-400">Manage real-time alerts and threshold violations</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 hover:text-white transition-all">
                        <CheckCircle className="h-5 w-5" /> Acknowledge All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-1">Active Alarms</p>
                    <h3 className="text-4xl font-black text-white italic">02</h3>
                </div>
                <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">Unacknowledged</p>
                    <h3 className="text-4xl font-black text-white italic">05</h3>
                </div>
                <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">MTTR (Avg Repair)</p>
                    <h3 className="text-4xl font-black text-white italic">14m</h3>
                </div>
            </div>

            <div className="bg-slate-900/30 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold italic text-slate-200">System Logs</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 cursor-pointer hover:bg-slate-700">ALL</span>
                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400 cursor-pointer">CRITICAL</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input type="text" placeholder="Filter..." className="pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold border-b border-slate-800">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Device</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {alarms.map((alarm) => (
                                <tr key={alarm.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${alarm.status === 'ACTIVE' ? 'bg-rose-500 animate-pulse' : alarm.status === 'ACKNOWLEDGED' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{alarm.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${alarm.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {alarm.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-200 italic">{alarm.device}</td>
                                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{alarm.msg}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{alarm.time}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest invisible group-hover:visible transition-all">
                                            Acknowledge
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
