"use client";

import RealtimeCard from '@/components/RealtimeCard';
import {
  Activity,
  BarChart3,
  ShieldCheck,
  Zap,
  Database,
  Network,
  AlertCircle,
  Clock,
  ExternalLink,
  Terminal
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  return (
    <div className="space-y-10 pb-16 animate-in-up font-sans">
      {/* 1. Tactical Command Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Operations Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-tech-label text-brand-green/80 tracking-[0.4em]">Live Systems Grid</span>
            <div className="h-px w-12 bg-slate-800"></div>
            <span className="text-[10px] font-mono text-slate-600">BUILD 2026.4</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: 'Latency', val: '12ms', icon: Clock, color: 'text-brand-green' },
            { label: 'Uptime', val: '99.982%', icon: Activity, color: 'text-brand-green' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 bg-slate-950/40 border border-slate-800/60 rounded-xl backdrop-blur-md shadow-2xl">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">{stat.label}</span>
                <span className="text-sm font-black text-white tabular-nums">{stat.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Critical Parameter Mesh */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-1">
          <div className="p-2 rounded-lg bg-brand-green/10 border border-brand-green/20">
            <Database size={16} className="text-brand-green" />
          </div>
          <h3 className="text-tech-label">Grid Parameters L3</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RealtimeCard deviceId="rtu-energy-wan" ioa={2032003} label="Phase L1 Voltage" unit="V" />
          <RealtimeCard deviceId="rtu-energy-wan" ioa={2032004} label="Phase L2 Voltage" unit="V" />
          <RealtimeCard deviceId="rtu-energy-wan" ioa={2032005} label="Phase L3 Voltage" unit="V" />
          <RealtimeCard deviceId="rtu-energy-wan" ioa={2034439} label="Grid Frequency" unit="Hz" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* 3. Deep Analysis & Sub-Systems */}
        <div className="xl:col-span-8 space-y-8">
          <div className="card-base p-10 bg-slate-900/20 dot-bg">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl group/icon">
                  <BarChart3 size={24} className="text-brand-green group-hover/icon:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Analytical Core</h3>
                  <p className="text-tech-label mt-1 text-slate-600">Subsystem A - Vector 01</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                <span className="text-[10px] font-mono font-black text-slate-500">REALTIME DATA ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-10">
                {[
                  { label: 'System Integrity', val: 99.4, color: 'bg-brand-green' },
                  { label: 'Harmonic Content', val: 12.5, color: 'bg-warning' },
                  { label: 'Vector Stability', val: 88.2, color: 'bg-brand-green' },
                ].map((metric, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex justify-between items-end leading-none">
                      <span className="text-tech-label text-slate-600">{metric.label}</span>
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

              <div className="relative group">
                <div className="absolute inset-0 bg-brand-green/2 blur-[60px] rounded-full" />
                <div className="relative z-10 p-2 rounded-2xl bg-slate-950/40 border border-slate-800/40 scale-105">
                  <RealtimeCard deviceId="modbus-sim-device" ioa={1} label="Core Load Vector" unit="A" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-base p-8 bg-slate-900/20 dot-bg">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <Zap size={16} className="text-brand-green" />
                  </div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Efficiency Logs</h3>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Active Power', val: '1,240.2', unit: 'kW' },
                  { label: 'Reactive Flux', val: '124.8', unit: 'kVAR' },
                  { label: 'Correction PF', val: '0.983', unit: 'Φ' }
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-4 px-3 hover:bg-slate-800/30 rounded-xl transition-all border-b border-slate-800/30 last:border-none">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.label}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-white font-mono">{row.val}</span>
                      <span className="text-[9px] font-black text-slate-700">{row.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-8 bg-slate-900/20 dot-bg">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <ShieldCheck size={16} className="text-brand-green" />
                  </div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Hardware Map</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'RTU Primary', status: 'ONLINE', col: 'text-brand-green' },
                  { label: 'System Core', status: 'SECURED', col: 'text-brand-green' },
                  { label: 'WAN Bridge', status: 'ACTIVE', col: 'text-brand-green' },
                  { label: 'Data Gate', status: 'NOMINAL', col: 'text-brand-green' }
                ].map((hw, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 group hover:border-brand-green/30 transition-all">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 leading-none italic">{hw.label}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${hw.col === 'text-brand-green' ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                      <span className={`text-[10px] font-black ${hw.col} uppercase`}>{hw.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Security Terminal Module */}
        <div className="xl:col-span-4 h-full">
          <div className="card-base flex flex-col h-full bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent)] pointer-events-none" />

            <div className="p-7 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Terminal size={18} className="text-brand-green" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Tactical Bus</h3>
                  <p className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Event Sink Primary</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">System Time</span>
                <span className="text-[10px] font-mono font-black text-brand-green">14:24:55</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-7 space-y-6 max-h-[850px] scrollbar-hide relative z-10">
              {[
                { type: 'success', event: 'Uptime Stable', desc: 'Secure connection via VPN-02 Tunnel A', time: '14:24' },
                { type: 'warning', event: 'Threshold Reactive', desc: 'Phase 2 reactive threshold delta surpassed limit', time: '14:21' },
                { type: 'success', event: 'Log Archive', desc: 'Daily operational log rotation successful', time: '14:15' },
                { type: 'info', event: 'User Auth', desc: 'SUPER_ADMIN session established @ Console 01', time: '14:12' },
                { type: 'danger', event: 'Network Lag', desc: 'Critical round-trip latency detected > 300ms', time: '14:08' },
              ].map((log, i) => (
                <div key={i} className="group border-b border-slate-900 pb-6 last:border-none">
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-3 rounded-full ${log.type === 'danger' ? 'bg-red-500' : log.type === 'warning' ? 'bg-orange-500' : 'bg-brand-green'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.type === 'danger' ? 'text-red-500' : log.type === 'warning' ? 'text-orange-500' : 'text-brand-green'}`}>
                        {log.event}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-700 font-black">{log.time}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 group-hover:text-slate-200 transition-colors leading-relaxed pl-3">{log.desc}</p>
                </div>
              ))}
            </div>


            <div className="p-4 border-t border-white/5 mt-auto">
              <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                Export Full Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="pt-10 border-t border-border/40 flex flex-wrap items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-brand-green" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Postgres Online</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={12} className="text-warning" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">03 Alerts</span>
          </div>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">X-SCADA Core v1.0.4 r2026</p>
      </footer>
    </div>
  );
}
