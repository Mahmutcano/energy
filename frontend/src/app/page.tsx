import RealtimeCard from '@/components/RealtimeCard';
import { Activity, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
          System <span className="text-blue-500 italic">Overview</span>
        </h1>
        <p className="text-slate-400">Monitoring real-time telemetry from RTU 001</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RealtimeCard deviceId="rtu-001" ioa={100} label="Active Power" unit="kW" color="blue" />
        <RealtimeCard deviceId="rtu-001" ioa={101} label="Voltage L1" unit="V" color="cyan" />
        <RealtimeCard deviceId="rtu-001" ioa={102} label="Current L1" unit="A" color="emerald" />
        <RealtimeCard deviceId="rtu-001" ioa={103} label="Frequency" unit="Hz" color="amber" />
      </div>

      {/* Industrial Layout Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 transition-transform group-hover:scale-125 duration-700">
              <Zap size={200} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                  <Activity className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold italic">Process Performance</h2>
              </div>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Efficiency</p>
                  <p className="text-3xl font-black text-white italic">94.2%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Load Factor</p>
                  <p className="text-3xl font-black text-white italic">0.82</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Uptime</p>
                  <p className="text-3xl font-black text-emerald-400 italic">99.98%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/30 rounded-3xl border border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2 italic">
                <Cpu className="h-5 w-5 text-slate-400" /> RTU Diagnostics
              </h3>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Connection Latency', val: '12ms', status: 'optimal' },
                { name: 'Packet Loss', val: '0.01%', status: 'optimal' },
                { name: 'Memory Usage', val: '24%', status: 'optimal' },
                { name: 'CPU Temp', val: '42°C', status: 'optimal' },
              ].map((stat) => (
                <div key={stat.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                  <span className="text-sm text-slate-400 font-medium">{stat.name}</span>
                  <span className="text-sm font-bold text-slate-200">{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <div className="p-1 rounded-3xl bg-gradient-to-b from-rose-500/20 to-transparent">
            <div className="bg-slate-950 rounded-[22px] p-6 border border-rose-500/30">
              <h3 className="text-rose-400 font-bold flex items-center gap-2 mb-4 italic">
                <ShieldAlert className="h-5 w-5" /> Recent Alarms
              </h3>
              <div className="space-y-4">
                {[
                  { id: 1, msg: 'Phase Unbalance RTU-01', time: '2m ago', severity: 'HIGH' },
                  { id: 2, msg: 'Frequency Drop Detected', time: '15m ago', severity: 'WARN' },
                  { id: 3, msg: 'Manual Override Triggered', time: '1h ago', severity: 'INFO' },
                ].map((alarm) => (
                  <div key={alarm.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-1">
                    <p className="text-sm font-bold text-slate-200">{alarm.msg}</p>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{alarm.severity}</span>
                      <span>{alarm.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                View All History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
