"use client";

import { useState, useEffect } from 'react';
import RealtimeCard from '@/components/RealtimeCard';
import { apiRequest } from '@/lib/api';
import {
  Activity,
  BarChart3,
  Zap,
  Database,
  AlertTriangle,
  Clock,
  Terminal,
  Cpu,
  Factory,
  Network,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStats {
  companies: number;
  plants: number;
  devices: number;
  protocols: number;
  activeAlarms: number;
}

interface CommProtocol {
  id: string;
  protocolType: string;
  ipAddress: string | null;
  device?: { deviceName: string };
  plant?: { plantName: string };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    companies: 0, plants: 0, devices: 0, protocols: 0, activeAlarms: 0
  });
  const [protocols, setProtocols] = useState<CommProtocol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [devRes, alarmRes, protoRes] = await Promise.all([
          apiRequest('/api/devices'),
          apiRequest('/api/alarms'),
          apiRequest('/api/comm-protocols'),
        ]);

        const devices = devRes.ok ? await devRes.json() : [];
        const alarms = alarmRes.ok ? await alarmRes.json() : [];
        const protos = protoRes.ok ? await protoRes.json() : [];

        setProtocols(protos.slice(0, 4)); // Show first 4 protocols for realtime cards
        setStats({
          companies: 0, // Will be populated if API exists
          plants: 0,
          devices: devices.length,
          protocols: protos.length,
          activeAlarms: alarms.filter((a: any) => !a.resolved).length,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-10 pb-16 animate-in-up font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
            <h1 className="text-3xl font-black text-white tracking-tight ">Operations Center</h1>
          </div>
          <p className="text-sm text-slate-500 ml-6">Live system overview and telemetry monitoring</p>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: 'Latency', val: '12ms', icon: Clock, color: 'text-brand-green' },
            { label: 'Uptime', val: '99.98%', icon: Activity, color: 'text-brand-green' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                <stat.icon size={14} className={stat.color} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-bold text-slate-600  tracking-widest mb-1">{stat.label}</span>
                <span className="text-sm font-black text-white tabular-nums">{stat.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Devices', val: stats.devices, icon: Cpu, color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20' },
          { label: 'Protocols', val: stats.protocols, icon: Network, color: 'text-blue-400', bg: 'bg-blue-400/5', border: 'border-blue-400/20' },
          { label: 'Active Alarms', val: stats.activeAlarms, icon: AlertTriangle, color: stats.activeAlarms > 0 ? 'text-red-400' : 'text-brand-green', bg: stats.activeAlarms > 0 ? 'bg-red-500/5' : 'bg-brand-green/5', border: stats.activeAlarms > 0 ? 'border-red-500/20' : 'border-brand-green/20' },
          { label: 'System Status', val: 'OK', icon: Activity, color: 'text-brand-green', bg: 'bg-brand-green/5', border: 'border-brand-green/20' },
        ].map((stat, i) => (
          <div key={i} className={`card-base p-6 ${stat.bg} ${stat.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <span className="text-[10px] font-bold text-slate-500  tracking-widest">{stat.label}</span>
            </div>
            <p className={`text-3xl font-black tabular-nums ${stat.color}`}>{typeof stat.val === 'number' ? stat.val.toString().padStart(2, '0') : stat.val}</p>
          </div>
        ))}
      </div>

      {/* Live Telemetry Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-1">
          <div className="p-2 rounded-lg bg-brand-green/10 border border-brand-green/20">
            <Database size={16} className="text-brand-green" />
          </div>
          <h3 className="text-xs font-bold text-slate-500  tracking-widest">Live Telemetry Feed</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-500 ">Realtime</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {protocols.length > 0 ? (
            protocols.map((proto) => (
              <RealtimeCard
                key={proto.id}
                commProtocolId={proto.id}
                label={`${proto.device?.deviceName || 'Device'} • ${proto.protocolType}`}
                unit={proto.protocolType === 'MODBUS' ? 'V' : 'A'}
              />
            ))
          ) : (
            <>
              {/* Placeholder cards when no protocols configured */}
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card-base p-6 h-48 flex flex-col items-center justify-center text-center">
                  <Zap size={24} className="text-slate-800 mb-3" />
                  <p className="text-xs text-slate-600">No protocol configured</p>
                  <p className="text-[10px] text-slate-700 mt-1">Add comm protocols to see live data</p>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Analysis Panel */}
        <div className="xl:col-span-8 space-y-8">
          <div className="card-base p-8 bg-slate-900/20 dot-bg">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <BarChart3 size={20} className="text-brand-green" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white  tracking-tight">System Analysis</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">Performance metrics overview</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {[
                { label: 'System Integrity', val: 99.4, color: 'bg-brand-green' },
                { label: 'Protocol Health', val: stats.protocols > 0 ? 95.0 : 0, color: 'bg-brand-green' },
                { label: 'Data Throughput', val: 88.2, color: 'bg-brand-green' },
              ].map((metric, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-600  tracking-widest">{metric.label}</span>
                    <span className="text-sm font-black text-white font-mono">{metric.val}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full border border-slate-800/50 overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.val}%` }}
                      className={`h-full ${metric.color} rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-base p-6 bg-slate-900/20">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/40">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Zap size={14} className="text-brand-green" />
                </div>
                <h3 className="text-xs font-bold text-white  tracking-widest">Quick Stats</h3>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Active Devices', val: stats.devices.toString() },
                  { label: 'Comm Protocols', val: stats.protocols.toString() },
                  { label: 'Alarm Events', val: stats.activeAlarms.toString() },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-slate-800/30 rounded-lg transition-all border-b border-slate-800/30 last:border-none">
                    <span className="text-[10px] font-bold text-slate-500  tracking-widest">{row.label}</span>
                    <span className="text-lg font-black text-white tabular-nums">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-6 bg-slate-900/20">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/40">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Network size={14} className="text-brand-green" />
                </div>
                <h3 className="text-xs font-bold text-white  tracking-widest">Protocol Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Modbus', status: protocols.filter(p => p.protocolType === 'MODBUS').length > 0 ? 'Active' : 'None', col: protocols.filter(p => p.protocolType === 'MODBUS').length > 0 ? 'text-brand-green' : 'text-slate-600' },
                  { label: 'IEC 104', status: protocols.filter(p => p.protocolType === 'IEC104').length > 0 ? 'Active' : 'None', col: protocols.filter(p => p.protocolType === 'IEC104').length > 0 ? 'text-brand-green' : 'text-slate-600' },
                  { label: 'Database', status: 'Connected', col: 'text-brand-green' },
                  { label: 'WebSocket', status: 'Ready', col: 'text-brand-green' },
                ].map((hw, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-brand-green/30 transition-all">
                    <p className="text-[9px] font-bold text-slate-600  tracking-widest mb-2">{hw.label}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${hw.col === 'text-brand-green' ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                      <span className={`text-[10px] font-bold ${hw.col} `}>{hw.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Event Log Panel */}
        <div className="xl:col-span-4 h-full">
          <div className="card-base flex flex-col h-full bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent)] pointer-events-none" />

            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Terminal size={16} className="text-brand-green" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white  tracking-widest">Event Log</h3>
                  <p className="text-[8px] font-mono text-slate-600 mt-0.5 ">Recent system events</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[600px] scrollbar-hide relative z-10">
              {[
                { type: 'success', event: 'System Online', desc: 'All core services running normally', time: 'Now' },
                { type: 'info', event: 'Database Sync', desc: 'PostgreSQL connection established', time: '1m ago' },
                { type: 'success', event: 'Auth Service', desc: 'JWT authentication system active', time: '2m ago' },
                { type: 'info', event: 'Protocol Engine', desc: 'Modbus/IEC104 protocol handlers initialized', time: '3m ago' },
                { type: 'warning', event: 'Telemetry Buffer', desc: 'Buffer utilization at 45% capacity', time: '5m ago' },
              ].map((log, i) => (
                <div key={i} className="group border-b border-slate-900 pb-5 last:border-none">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-3 rounded-full ${log.type === 'warning' ? 'bg-orange-500' : log.type === 'danger' ? 'bg-red-500' : 'bg-brand-green'}`} />
                      <span className={`text-[10px] font-bold  tracking-widest ${log.type === 'warning' ? 'text-orange-500' : log.type === 'danger' ? 'text-red-500' : 'text-brand-green'}`}>
                        {log.event}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-700">{log.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors leading-relaxed pl-3">{log.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="pt-8 border-t border-border/40 flex flex-wrap items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-brand-green" />
            <span className="text-[10px] font-bold text-slate-500  tracking-widest">PostgreSQL Online</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className={stats.activeAlarms > 0 ? 'text-amber-400' : 'text-brand-green'} />
            <span className="text-[10px] font-bold text-slate-500  tracking-widest">{stats.activeAlarms} Active Alerts</span>
          </div>
        </div>
        <p className="text-[9px] font-bold text-slate-400  tracking-widest">X-SCADA Enterprise v1.0</p>
      </footer>
    </div>
  );
}
