import RealtimeCard from '@/components/RealtimeCard';
import { Activity, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
          System <span className="text-blue-500 italic">Overview</span>
        </h1>
        <p className="text-slate-400">Monitoring real-time telemetry from WAN RTU (178.242.103.255)</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RealtimeCard deviceId="rtu-energy-wan" ioa={2032003} label="Voltage Phase A (Van)" unit="V" color="blue" />
        <RealtimeCard deviceId="rtu-energy-wan" ioa={2032004} label="Voltage Phase B (Vbn)" unit="V" color="cyan" />
        <RealtimeCard deviceId="rtu-energy-wan" ioa={2032005} label="Voltage Phase C (Vcn)" unit="V" color="emerald" />
        <RealtimeCard deviceId="rtu-energy-wan" ioa={2034439} label="System Frequency" unit="Hz" color="amber" />
      </div>

      {/* Modbus TCP Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-xl font-bold text-white italic">Modbus TCP Feed <span className="text-slate-500 text-sm font-normal ml-2 tracking-widest uppercase">Live Simulator</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RealtimeCard deviceId="modbus-sim-device" ioa={0} label="Modbus Voltage" unit="V" color="amber" />
          <RealtimeCard deviceId="modbus-sim-device" ioa={1} label="Modbus Current" unit="A" color="orange" />
          <RealtimeCard deviceId="modbus-sim-device" ioa={2} label="Modbus Power" unit="kW" color="yellow" />
        </div>
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
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Grid Stability</p>
                  <p className="text-3xl font-black text-white italic">98.2%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Power Factor</p>
                  <p className="text-3xl font-black text-white italic">0.96</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Supply Uptime</p>
                  <p className="text-3xl font-black text-emerald-400 italic">99.99%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/30 rounded-3xl border border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2 italic">
                <Cpu className="h-5 w-5 text-slate-400" /> WAN Connectivity Diagnostics
              </h3>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Gateway Latency', val: '45ms', status: 'optimal' },
                { name: 'WAN IP Status', val: 'Active', status: 'optimal' },
                { name: 'Protocol', val: 'IEC 60870-5-104', status: 'optimal' },
                { name: 'Remote Port', val: '2404', status: 'optimal' },
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
                  { id: 1, msg: 'WAN Connection Established', time: 'Just now', severity: 'INFO' },
                  { id: 2, msg: 'Scanning IOA: 2034433-35', time: '1m ago', severity: 'INFO' },
                  { id: 3, msg: 'Initial Sync Completed', time: '2m ago', severity: 'INFO' },
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

