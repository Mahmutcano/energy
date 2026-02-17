"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Clock, CheckCircle, Search, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface AlarmLog {
    id: string;
    commProtocolId: string;
    value: number;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    timestamp: string;
    resolved: boolean;
}

export default function AlarmsPage() {
    const [alarms, setAlarms] = useState<AlarmLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

    useEffect(() => {
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
        fetchAlarms();
    }, []);

    const filteredAlarms = alarms.filter(a => {
        if (filter === 'ACTIVE') return !a.resolved;
        if (filter === 'RESOLVED') return a.resolved;
        return true;
    });

    const activeCount = alarms.filter(a => !a.resolved).length;
    const criticalCount = alarms.filter(a => a.severity === 'CRITICAL' && !a.resolved).length;

    const handleResolve = async (id: string) => {
        try {
            const res = await apiRequest(`/api/alarms/${id}/resolve`, { method: 'PATCH' });
            if (res.ok) {
                setAlarms(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
            }
        } catch (err) {
            console.error('Failed to resolve alarm:', err);
        }
    };

    const severityConfig = {
        CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
        WARNING: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
        INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
    };

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Alarm Logs</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Monitor and manage alarm events from communication protocols</p>
                </div>

                {activeCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 rounded-xl border border-red-500/20">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest">{activeCount} Active Alarms</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Critical', val: criticalCount.toString(), icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
                    { label: 'Unresolved', val: activeCount.toString(), icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
                    { label: 'Total Events', val: alarms.length.toString(), icon: Clock, color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20' },
                ].map((stat, i) => (
                    <div key={i} className={`card-base p-6 ${stat.bg} ${stat.border} flex items-center gap-4`}>
                        <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-3xl font-black tabular-nums ${stat.color}`}>{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alarm Table */}
            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-slate-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-red-400">
                            <AlertTriangle size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase">Event Log</h3>
                    </div>
                    <div className="flex gap-2">
                        {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === f
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
                            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Value</th>
                                <th className="px-6 py-4">Protocol ID</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading alarm logs...</td></tr>
                            ) : filteredAlarms.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">No alarm events found</td></tr>
                            ) : filteredAlarms.map((alarm) => {
                                const sev = severityConfig[alarm.severity];
                                return (
                                    <tr key={alarm.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${alarm.resolved ? 'bg-brand-green' : `${sev.dot} animate-pulse`}`} />
                                                <span className={`text-[10px] font-bold uppercase ${alarm.resolved ? 'text-brand-green' : 'text-slate-400'}`}>
                                                    {alarm.resolved ? 'Resolved' : 'Active'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${sev.bg} ${sev.color} ${sev.border}`}>
                                                {alarm.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-300 max-w-sm">{alarm.message}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-white tabular-nums">{alarm.value.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-mono text-slate-600">{alarm.commProtocolId.substring(0, 8)}...</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-600 tabular-nums">
                                            {new Date(alarm.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!alarm.resolved && (
                                                <button
                                                    onClick={() => handleResolve(alarm.id)}
                                                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-500 rounded hover:text-brand-green hover:border-brand-green/30 transition-all uppercase opacity-0 group-hover:opacity-100"
                                                >
                                                    Resolve
                                                </button>
                                            )}
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
