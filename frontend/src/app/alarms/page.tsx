"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Clock, CheckCircle, Search, ShieldAlert, Cpu, WifiOff } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface Device {
    id: string;
    deviceName: string;
}

interface CommunicationAlarm {
    id: string;
    deviceId: string;
    status: 'ACTIVE' | 'RESOLVED';
    startTime: string;
    endTime: string | null;
    lastSeenAt: string | null;
    message: string;
    device?: Device;
}

export default function AlarmsPage() {
    const [alarms, setAlarms] = useState<CommunicationAlarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

    const fetchAlarms = async () => {
        try {
            const res = await apiRequest('/api/alarms');
            if (res.ok) {
                const data = await res.json();
                setAlarms(data);
            }
        } catch (err) {
            console.error('Failed to fetch alarms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlarms();
        // Refresh every 30s
        const interval = setInterval(fetchAlarms, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredAlarms = alarms.filter(a => {
        if (filter === 'ACTIVE') return a.status === 'ACTIVE';
        if (filter === 'RESOLVED') return a.status === 'RESOLVED';
        return true;
    });

    const activeCount = alarms.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">Communication Monitoring</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Monitor real-time device connectivity and data flow interruptions</p>
                </div>

                {activeCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]"></div>
                        <span className="text-xs font-bold text-amber-400  tracking-widest">{activeCount} Communication Losses</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Loss', val: activeCount.toString(), icon: WifiOff, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
                    { label: 'Total Events', val: alarms.length.toString(), icon: Clock, color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20' },
                    { label: 'System Status', val: activeCount > 0 ? 'WARNING' : 'HEALTHY', icon: ShieldAlert, color: activeCount > 0 ? 'text-amber-400' : 'text-brand-green', bg: activeCount > 0 ? 'bg-amber-500/5' : 'bg-brand-green/5', border: activeCount > 0 ? 'border-amber-500/20' : 'border-brand-green/20' },
                ].map((stat, i) => (
                    <div key={i} className={`card-base p-6 ${stat.bg} ${stat.border} flex items-center gap-4`}>
                        <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500  tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black tabular-nums ${stat.color}`}>{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alarm Table */}
            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-slate-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
                            <AlertTriangle size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-white ">Connectivity Logs</h3>
                    </div>
                    <div className="flex gap-2">
                        {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold  tracking-widest border transition-all ${filter === f
                                    ? 'border-brand-green/30 bg-brand-green/10 text-brand-green'
                                    : 'border-slate-800 bg-slate-900/60 text-slate-600 hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500  tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Device</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Failure Start</th>
                                <th className="px-6 py-4">Resolution End</th>
                                <th className="px-6 py-4">Last Seen Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Checking communication logs...</td></tr>
                            ) : filteredAlarms.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No communication events found</td></tr>
                            ) : filteredAlarms.map((alarm) => {
                                return (
                                    <tr key={alarm.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${alarm.status === 'RESOLVED' ? 'bg-brand-green' : `bg-amber-500 animate-pulse`}`} />
                                                <span className={`text-[10px] font-bold  ${alarm.status === 'RESOLVED' ? 'text-brand-green' : 'text-amber-400'}`}>
                                                    {alarm.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Cpu size={12} className="text-slate-500" />
                                                <span className="text-xs font-bold text-white">{alarm.device?.deviceName || 'Unknown Device'}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-600 font-mono block">{alarm.deviceId}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">{alarm.message}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-400 tabular-nums">
                                            {new Date(alarm.startTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-400 tabular-nums">
                                            {alarm.endTime ? new Date(alarm.endTime).toLocaleString() : <span className="text-amber-500/50">Ongoing...</span>}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500 tabular-nums">
                                            {alarm.lastSeenAt ? new Date(alarm.lastSeenAt).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
