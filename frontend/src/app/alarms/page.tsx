"use client";

import { AlertTriangle, Bell, Clock, CheckCircle, Search, Filter, ShieldAlert, Activity, Cpu } from 'lucide-react';

const alarms = [
    { id: 1, device: 'RTU_TRANSFORMER_01', ioa: 100, msg: 'Active Power exceeded High-Threshold (294.2 kW)', severity: 'CRITICAL', time: '2024-02-12 21:05:12', status: 'ACTIVE' },
    { id: 2, device: 'RTU_TRANSFORMER_01', ioa: 101, msg: 'Phase A Voltage outside normal range', severity: 'WARNING', time: '2024-02-12 20:45:00', status: 'ACKNOWLEDGED' },
    { id: 3, device: 'MAIN_SWITCHGEAR_EAST', ioa: 502, msg: 'Breaker Trip - Overcurrent Protection', severity: 'CRITICAL', time: '2024-02-12 19:12:33', status: 'RESOLVED' },
    { id: 4, device: 'GENERATOR_CONTROL_B', ioa: 200, msg: 'Communication Timeout with RTU', severity: 'WARNING', time: '2024-02-12 18:30:15', status: 'ACTIVE' },
];

export default function Alarms() {
    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* 1. Alarm Intelligence Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-danger rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Alarm Management</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-tech-label text-danger/80 tracking-[0.4em]">Critical Event Log</span>
                        <div className="h-px w-12 bg-slate-800"></div>
                        <span className="text-[10px] font-mono text-slate-600">WATCHDOG MONITORING ACTIVE</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-black text-white hover:border-danger/30 transition-all uppercase tracking-widest group">
                        <CheckCircle size={18} className="text-slate-500 group-hover:text-brand-green" /> Acknowledge All
                    </button>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/40 rounded-xl border border-slate-800/40 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]"></div>
                        <span className="text-[10px] font-black text-danger tracking-[0.2em] uppercase">System Alert</span>
                    </div>
                </div>
            </div>

            {/* 2. Tactical Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Active Critical', val: '02', sub: 'High priority alerts', color: 'text-danger', bg: 'bg-danger/5', border: 'border-danger/20', icon: ShieldAlert },
                    { label: 'Unacknowledged', val: '05', sub: 'Pending operator review', color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', icon: Bell },
                    { label: 'Avg Resolution Time', val: '14:04', unit: 'Min', sub: 'Mean time to clear', color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20', icon: Clock },
                ].map((stat, i) => (
                    <div key={i} className={`card-base p-8 ${stat.bg} ${stat.border} relative overflow-hidden group`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <stat.icon size={48} />
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-tech-label ${stat.color}`}>{stat.label}</span>
                            <div className="px-2 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono border border-white/5 text-slate-500 uppercase">Live Sensor</div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className={`text-5xl font-black italic tracking-tighter ${stat.color}`}>{stat.val}</h3>
                            {stat.unit && <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.unit}</span>}
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-4 tracking-tight leading-none">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* 3. Event Matrix Console */}
            <section className="card-base bg-slate-950/40 flex flex-col h-full min-h-[600px] dot-bg border-slate-800 overflow-hidden shadow-2xl">
                <div className="bg-slate-900/40 px-8 py-5 border-b border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                                <Search size={16} className="text-slate-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filter records..."
                                className="bg-transparent border-none text-xs font-bold text-white focus:outline-none uppercase tracking-widest w-48 placeholder:text-slate-800"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 border border-brand-green/30 bg-brand-green/10 text-[9px] font-black text-brand-green rounded-lg uppercase tracking-widest">All Units</button>
                            <button className="px-4 py-2 border border-slate-800 bg-slate-900/60 text-[9px] font-black text-slate-600 rounded-lg hover:text-white transition-all uppercase tracking-widest">Critical Only</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-8 py-5">System State</th>
                                <th className="px-8 py-5">Source Node</th>
                                <th className="px-8 py-5">Payload Descriptor</th>
                                <th className="px-8 py-5">Log Identity</th>
                                <th className="px-8 py-5">Timestamp</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alarms.map((alarm) => (
                                <tr key={alarm.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${alarm.status === 'ACTIVE' ? 'bg-danger animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : alarm.status === 'ACKNOWLEDGED' ? 'bg-warning' : 'bg-brand-green'}`} />
                                            <span className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">{alarm.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white italic uppercase tracking-tighter tabular-nums">{alarm.device}</span>
                                            <span className="text-[8px] font-mono text-slate-600 uppercase mt-1">Bus::IOA_{alarm.ioa}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[11px] text-slate-400 max-w-sm font-bold leading-relaxed uppercase tracking-tight">{alarm.msg}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border tracking-widest ${alarm.severity === 'CRITICAL' ? 'border-danger/30 text-danger bg-danger/5' : 'border-warning/30 text-warning bg-warning/5'
                                            }`}>
                                            {alarm.severity}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-black text-slate-600 font-mono tabular-nums">{alarm.time}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-[9px] font-black text-slate-500 rounded hover:text-white hover:border-brand-green/30 transition-all uppercase opacity-0 group-hover:opacity-100">
                                            Ack Unit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Tactical Console Footer */}
                <div className="px-8 py-4 bg-slate-900/60 border-t border-slate-800/60 flex justify-between items-center bg-slate-900/40">
                    <span className="text-[10px] font-black text-slate-700 tracking-[0.4em] uppercase italic">Secure Stream Finalized</span>
                    <div className="flex gap-10">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Cache: 1.2MB/10MB</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
                            <span className="text-[9px] font-black text-brand-green uppercase tracking-widest">Uplink Stable</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
