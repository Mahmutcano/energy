"use client";

import { useState, useEffect } from 'react';
import RealtimeCard from '@/components/RealtimeCard';
import { apiRequest } from '@/lib/api';
import {
  Activity,
  Zap,
  Database,
  AlertTriangle,
  Terminal,
  Cpu,
  Network,
  ChevronRight,
  RefreshCcw,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { motion } from 'framer-motion';
import { socket, socketService } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

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
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    companies: 0, plants: 0, devices: 0, protocols: 0, activeAlarms: 0
  });
  const [protocols, setProtocols] = useState<CommProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const handleReconnect = () => {
    socketService.reconnect();
    toast.success('Sistem senkronizasyonu başlatıldı');
  };

  useEffect(() => {
    if (!user || user.role === 'NORMAL_USER') {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [devRes, alarmRes, protoRes, compRes, plantRes] = await Promise.all([
          apiRequest('/api/devices'),
          apiRequest('/api/alarms'),
          apiRequest('/api/comm-protocols'),
          apiRequest('/api/companies'),
          apiRequest('/api/plants'),
        ]);

        const extractData = async (res: Response) => {
          if (!res.ok) return [];
          const result = await res.json();
          return (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
        };

        const [devices, alarms, protos, companies, plants] = await Promise.all([
          extractData(devRes),
          extractData(alarmRes),
          extractData(protoRes),
          extractData(compRes),
          extractData(plantRes),
        ]);

        setProtocols(Array.isArray(protos) ? protos.slice(0, 4) : []);
        setStats({
          companies: companies.length,
          plants: plants.length,
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
  }, [user]);

  return (
    <div className="space-y-8 pb-20 font-sans">
      <PageHeader 
        title="OPERASYON" 
        highlightedTitle="PANELİ"
        subtitle={`${stats.companies} kurumda ${stats.plants} aktif saha izleniyor`}
        icon={LayoutGrid}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 px-4 py-2 bg-grafana-bg border border-grafana-border rounded-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Sistem Yükü</span>
              <span className="text-sm font-bold text-grafana-accent-green font-mono">Düşük (4.2%)</span>
            </div>
            <div className="w-[1px] h-6 bg-grafana-border" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Protokol Trafiği</span>
              <span className="text-sm font-bold text-grafana-accent-blue font-mono">1.2k req/s</span>
            </div>
          </div>

          <button
            onClick={handleReconnect}
            className={cn(
              "flex items-center gap-3 px-5 py-2.5 rounded-sm border transition-all group font-mono",
              isSocketConnected 
                ? "bg-grafana-bg border-grafana-accent-green/20 text-grafana-accent-green hover:bg-grafana-accent-green/10" 
                : "bg-grafana-accent-red/10 border-grafana-accent-red/30 text-grafana-accent-red animate-pulse"
            )}
          >
            <RefreshCcw size={14} className={cn("transition-transform duration-700", isSocketConnected && "group-hover:rotate-180")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isSocketConnected ? 'Senkronize Et' : 'Bağlan'}
            </span>
          </button>
        </div>
      </PageHeader>

      {/* High-Density Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Ağ Varlıkları', val: stats.devices, icon: Cpu, color: 'text-grafana-accent-blue', sub: 'Aktif düğümler' },
          { label: 'İletişim Kanalları', val: stats.protocols, icon: Network, color: 'text-grafana-accent-blue', sub: 'Protokol örnekleri' },
          { label: 'Kritik Alarmlar', val: stats.activeAlarms, icon: AlertTriangle, color: stats.activeAlarms > 0 ? 'text-grafana-accent-red' : 'text-grafana-accent-green', sub: 'Müdahale gerekli' },
          { label: 'Operasyonel Sağlık', val: 'Optimal', icon: Activity, color: 'text-grafana-accent-green', sub: 'Sistem durumu' },
        ].map((stat, i) => (
          <div key={i} className="card-base p-5 bg-grafana-panel/50 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">{stat.label}</span>
                <p className={cn("text-2xl font-bold font-mono tracking-tighter", stat.color)}>
                  {typeof stat.val === 'number' ? stat.val.toString().padStart(2, '0') : stat.val}
                </p>
              </div>
              <div className={cn("p-2 rounded-sm bg-grafana-bg border border-grafana-border", stat.color)}>
                <stat.icon size={16} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-grafana-text-secondary/50 uppercase tracking-widest font-mono">
              <ChevronRight size={10} />
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Telemetry Visualization Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Realtime Stream */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-sm bg-grafana-accent-blue/10 text-grafana-accent-blue border border-grafana-accent-blue/20">
                <Zap size={14} />
              </div>
              <h3 className="text-xs font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-sans">Gerçek Zamanlı Telemetri</h3>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-blue" /> Modbus</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green" /> IEC104</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {protocols.length > 0 ? (
              protocols.map((proto) => (
                <RealtimeCard
                  key={proto.id}
                  commProtocolId={proto.id}
                  label={`${proto.device?.deviceName || 'Remote Unit'} / ${proto.protocolType}`}
                  unit={proto.protocolType === 'MODBUS' ? 'V (RMS)' : 'A (Line)'}
                />
              ))
            ) : (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="card-base h-40 flex flex-col items-center justify-center border-dashed border-grafana-border opacity-50">
                  <Cpu size={24} className="text-grafana-text-secondary/30 mb-2" />
                  <span className="text-[10px] font-bold text-grafana-text-secondary/50 uppercase tracking-widest font-mono">Protokol Verisi Yok</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Terminal / Events */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-1.5 rounded-sm bg-grafana-text-secondary/10 text-grafana-text-secondary border border-grafana-border">
              <Terminal size={14} />
            </div>
            <h3 className="text-xs font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-sans">Sistem Olayları</h3>
          </div>

          <div className="card-base flex flex-col h-[336px] bg-grafana-bg/80 border-grafana-border relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar font-mono">
              {[
                { type: 'info', event: 'BAŞLATMA', desc: 'SCADA Motoru v1.0.4 Başlatıldı', time: '10:00:01' },
                { type: 'success', event: 'SENKRON', desc: 'Telemetri köprüsü WebSocket üzerinden kuruldu', time: '10:00:05' },
                { type: 'info', event: 'VERİTABANI', desc: 'PostgreSQL bağlantı havuzu hazır (10/50)', time: '10:02:12' },
                { type: 'warning', event: 'GECİKME', desc: 'IEC104 protokol gecikmesi 50ms üzerine çıktı', time: '10:15:33' },
                { type: 'success', event: 'YETKİ', desc: 'Yönetici oturumu doğrulandı: SİSTEM', time: '10:20:45' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3 text-[10px] leading-relaxed group border-l-2 border-transparent hover:border-grafana-accent-blue pl-2 transition-all">
                  <span className="text-grafana-text-secondary/50 shrink-0">[{log.time}]</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={cn(
                      "font-bold uppercase tracking-widest",
                      log.type === 'warning' ? 'text-grafana-accent-orange' : log.type === 'success' ? 'text-grafana-accent-green' : 'text-grafana-accent-blue'
                    )}>
                      {log.event}
                    </span>
                    <span className="text-grafana-text-secondary group-hover:text-grafana-text-primary transition-colors italic">{log.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-grafana-border bg-grafana-panel/50 flex items-center justify-between">
              <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono animate-pulse flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-grafana-accent-green" /> Olaylar dinleniyor...
              </span>
              <button className="text-[9px] font-bold text-grafana-accent-blue hover:underline uppercase font-mono tracking-widest">Logları Temizle</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Connectivity Bar */}
      <footer className="pt-8 border-t border-grafana-border flex flex-col sm:flex-row items-center justify-between gap-4 opacity-70">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-grafana-accent-green" />
            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">VT: Çevrimiçi</span>
          </div>
          <div className="flex items-center gap-2">
            <Network size={12} className="text-grafana-accent-blue" />
            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">REDIS: Aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-grafana-text-secondary" />
            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Yerel: 24.04.2024</span>
          </div>
        </div>
        <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.4em] font-mono">
          X-SCADA Enterprise <span className="text-grafana-accent-blue">v2.0.4-LTS</span>
        </p>
      </footer>
    </div>
  );
}

