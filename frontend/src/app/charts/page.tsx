"use client";

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    Activity, Plus, X, Maximize2, Search, Camera, Settings,
    MousePointer2, Pencil, Ruler, Square, Clock, Eye,
    MoreVertical, ChevronDown, TrendingUp, BarChart3, Terminal, Database, Shield, Zap, RefreshCw, Layers
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_HISTORY = 50; 
const UPDATE_INTERVAL = 100;

// ─── Essential Types ────────────────────────────────────────────────────────

interface ChartDataPoint {
    time: string;
    value: number;
    ts: number;
}

interface ChartPanel {
    id: string;
    deviceId: string;
    deviceName: string;
    pointId: string;
    pointName: string;
    unit: string;
    color: string;
    data: ChartDataPoint[];
    lastValue: number | null;
    minValue: number | null;
    maxValue: number | null;
    expanded: boolean;
    scadaAddress: number | null;
}

// ─── Visual Components ──────────────────────────────────────────────────────

const TechnicalTooltip = memo(({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-grafana-bg border border-grafana-border rounded-sm shadow-2xl px-4 py-3 z-50 min-w-[140px] backdrop-blur-md bg-opacity-90">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-grafana-border/50">
                <Clock size={10} className="text-grafana-accent-blue" />
                <p className="text-[10px] text-grafana-text-secondary font-mono uppercase tracking-widest">
                    {new Date(data.ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-tighter mb-0.5">OKUNAN DEĞER</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white tabular-nums leading-none">
                        {typeof data.value === 'number' ? data.value.toFixed(3) : data.value}
                    </span>
                    <span className="text-[9px] font-mono text-grafana-accent-blue font-bold uppercase">VAL</span>
                </div>
            </div>
        </div>
    );
});
TechnicalTooltip.displayName = 'TechnicalTooltip';

const PriceLabel = (props: any) => {
    const { viewBox, value, color } = props;
    if (!viewBox) return null;
    const { y, width } = viewBox;
    return (
        <g>
            <rect x={width - 70} y={y - 12} width={70} height={24} fill="#141619" stroke="#262626" rx={2} />
            <text x={width - 35} y={y + 5} textAnchor="middle" fill="#5794f2" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {typeof value === 'number' ? value.toFixed(2) : '0.00'}
            </text>
        </g>
    );
};

// ─── Main TradingView Terminal ──────────────────────────────────────────────

export default function ChartsPage() {
    const [panels, setPanels] = useState<ChartPanel[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
    const [masterNow, setMasterNow] = useState(() => Date.now());

    const panelsRef = useRef<ChartPanel[]>([]);
    const queueRef = useRef<Map<string, ChartDataPoint[]>>(new Map());

    useEffect(() => { panelsRef.current = panels; }, [panels]);

    const handleAddSignalByName = useCallback((name: string) => {
        const panelId = `chart_${Math.random().toString(36).substr(2, 5)}`;
        const newPanel: ChartPanel = {
            id: panelId,
            deviceId: 'dev_primary',
            deviceName: 'SCADA_UPLINK',
            pointId: 'pt_' + Math.random().toString(36).substr(2, 3),
            pointName: name.toUpperCase(),
            unit: name.includes('VOLT') ? 'kV' : name.includes('CURR') ? 'A' : name.includes('FREQ') ? 'Hz' : 'kW',
            color: '#5794f2',
            data: [],
            lastValue: 0,
            minValue: 0,
            maxValue: 0,
            expanded: true,
            scadaAddress: 100 + panels.length
        };
        setPanels(prev => [...prev, newPanel]);
        setSelectedSignalId(panelId);
        setShowSearch(false);
        toast.success(`SIGNAL_ATTACHED: ${name}`);
    }, [panels.length]);

    // Data Processor (setInterval sync)
    useEffect(() => {
        const itv = setInterval(() => {
            const now = Date.now();
            setMasterNow(now);

            setPanels(prev => {
                if (prev.length === 0) return prev;
                let hasUpdates = false;
                const next = prev.map(panel => {
                    const queue = queueRef.current.get(panel.id) || [];
                    if (queue.length === 0) return panel;

                    hasUpdates = true;
                    const updates = [...queue];
                    queueRef.current.set(panel.id, []);

                    const newData = [...panel.data, ...updates].sort((a, b) => a.ts - b.ts).slice(-MAX_HISTORY);
                    const values = newData.map(d => d.value);
                    return {
                        ...panel,
                        data: newData,
                        lastValue: values[values.length - 1],
                        minValue: Math.min(...values),
                        maxValue: Math.max(...values)
                    };
                });
                return hasUpdates ? next : prev;
            });
        }, 100);
        return () => clearInterval(itv);
    }, []);

    // Socket Gateway
    useEffect(() => {
        const handle = (data: any) => {
            const incoming = Array.isArray(data) ? data : [data];
            const currentPanels = panelsRef.current;
            if (currentPanels.length === 0) return;

            incoming.forEach(pkt => {
                currentPanels.forEach(p => {
                    const pktIoa = pkt.ioa !== undefined ? Number(pkt.ioa) : null;
                    const matched = (pkt.pointId === p.pointId) || (pktIoa !== null && pktIoa === p.scadaAddress);

                    if (matched) {
                        if (!queueRef.current.has(p.id)) queueRef.current.set(p.id, []);
                        queueRef.current.get(p.id)!.push({
                            value: Number(pkt.value) || 0,
                            ts: Date.now(),
                            time: new Date().toLocaleTimeString()
                        });
                    }
                });
            });
        };
        socket.on('telemetry:update', handle);
        return () => { socket.off('telemetry:update', handle); };
    }, []);

    const activePanel = useMemo(() => panels.find(p => p.id === selectedSignalId) || panels[0], [panels, selectedSignalId]);

    return (
        <div className="fixed inset-0 bg-grafana-bg flex flex-col font-sans overflow-hidden select-none text-grafana-text-primary antialiased">

            {/* Terminal Header */}
            <header className="h-[48px] border-b border-grafana-border flex items-center px-4 flex-shrink-0 bg-grafana-panel/50 z-40">
                <div className="flex items-center gap-1 h-full">
                    <button onClick={() => setShowSearch(true)} className="h-8 px-4 flex items-center gap-3 bg-grafana-bg border border-grafana-border hover:border-grafana-accent-blue/50 rounded-sm transition-all text-grafana-accent-blue group">
                        <Search size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold uppercase tracking-widest font-mono">SİNYAL SORGULA</span>
                    </button>
                    <div className="h-5 w-px bg-grafana-border mx-2" />
                    <div className="flex gap-1">
                        {['CANLI VERİ', 'T+1S', 'T+24S', 'ARŞİV'].map((t, idx) => (
                            <button key={t} className={cn(
                                "h-8 px-3 text-[10px] font-bold rounded-sm transition-all font-mono",
                                idx === 0 ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border border-grafana-accent-blue/20" : "text-grafana-text-secondary hover:bg-grafana-panel hover:text-white"
                            )}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-3 mr-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-tighter">SUNUCU BAĞLANTISI</span>
                            <span className="text-[10px] font-mono text-grafana-accent-green">AKTİF</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green animate-pulse shadow-[0_0_8px_rgba(115,191,105,0.4)]" />
                    </div>
                    <button className="h-8 px-4 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(87,148,242,0.15)] font-mono">
                        <Camera size={14} /> GÖRÜNÜMÜ KAYDET
                    </button>
                    <div className="h-5 w-px bg-grafana-border mx-1" />
                    <button className="p-2 text-grafana-text-secondary hover:text-white transition-colors"><Settings size={18} /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* Technical Sidebar */}
                <aside className="w-[48px] border-r border-grafana-border bg-grafana-panel/20 flex flex-col items-center py-4 gap-4 z-30">
                    <button className="p-2.5 text-grafana-accent-blue bg-grafana-accent-blue/10 border border-grafana-accent-blue/20 rounded-sm"><MousePointer2 size={18} /></button>
                    <button className="p-2.5 text-grafana-text-secondary hover:text-white hover:bg-grafana-panel rounded-sm transition-colors"><Pencil size={18} /></button>
                    <button className="p-2.5 text-grafana-text-secondary hover:text-white hover:bg-grafana-panel rounded-sm transition-colors"><Ruler size={18} /></button>
                    <button className="p-2.5 text-grafana-text-secondary hover:text-white hover:bg-grafana-panel rounded-sm transition-colors"><Layers size={18} /></button>
                    <div className="mt-auto flex flex-col gap-4 mb-2">
                        <button className="p-2.5 text-grafana-text-secondary hover:text-grafana-accent-red transition-colors"><Shield size={18} /></button>
                        <button className="p-2.5 text-grafana-text-secondary hover:text-grafana-accent-blue transition-colors"><Database size={18} /></button>
                    </div>
                </aside>

                <main className="flex-1 bg-grafana-bg relative flex flex-col overflow-hidden">
                    <div className="flex-1 relative">
                        {activePanel ? (
                            <div className="absolute inset-0 flex flex-col">
                                {/* Technical Overlay */}
                                <div className="absolute top-6 left-6 pointer-events-none z-10 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-5 bg-grafana-accent-blue rounded-full" />
                                            <span className="text-sm font-bold text-white uppercase tracking-[0.2em] font-mono">{activePanel.pointName}</span>
                                            <span className="text-[9px] font-bold text-grafana-accent-green bg-grafana-accent-green/10 border border-grafana-accent-green/20 px-2 py-0.5 rounded-sm font-mono tracking-widest uppercase">AKTARILIYOR</span>
                                        </div>
                                        <div className="flex items-baseline gap-3 ml-4">
                                            <span className="text-6xl font-black tracking-tighter text-white tabular-nums leading-none">
                                                {activePanel.lastValue !== null ? activePanel.lastValue.toFixed(3) : '0.000'}
                                            </span>
                                            <span className="text-sm font-bold text-grafana-text-secondary font-mono tracking-widest">{activePanel.unit}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 ml-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">PİK MAKS</span>
                                            <span className="text-xs font-bold text-grafana-accent-blue tabular-nums font-mono">{activePanel.maxValue?.toFixed(3)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">DEĞER MİN</span>
                                            <span className="text-xs font-bold text-grafana-text-primary tabular-nums font-mono">{activePanel.minValue?.toFixed(3)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 relative mt-16">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={activePanel.data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="scada_gradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#5794f2" stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor="#5794f2" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="4 4" stroke="#262626" vertical={true} />
                                            <XAxis dataKey="ts" hide domain={['auto', 'auto']} />
                                            <YAxis
                                                orientation="right"
                                                domain={['auto', 'auto']}
                                                tick={{ fontSize: 10, fill: '#787b86', fontWeight: 600, fontFamily: 'monospace' }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={70}
                                            />
                                            <Tooltip content={<TechnicalTooltip />} cursor={{ stroke: '#5794f2', strokeDasharray: '4 4' }} />

                                            {activePanel.lastValue !== null && (
                                                <ReferenceLine
                                                    y={activePanel.lastValue}
                                                    stroke="#5794f2"
                                                    strokeDasharray="4 4"
                                                    label={<PriceLabel color="#5794f2" value={activePanel.lastValue} />}
                                                />
                                            )}

                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#5794f2"
                                                strokeWidth={2.5}
                                                fill="url(#scada_gradient)"
                                                dot={false}
                                                isAnimationActive={false}
                                                connectNulls
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-grafana-text-secondary/20">
                                <Activity size={120} strokeWidth={0.5} className="animate-pulse" />
                                <span className="text-[12px] font-bold uppercase tracking-[0.5em] mt-8 font-mono">TERMİNAL BEKLEMEDE</span>
                                <p className="text-[10px] uppercase font-mono mt-2 tracking-widest">SİNYAL BAĞLANTISI BEKLENİYOR</p>
                            </div>
                        )}
                    </div>

                    <footer className="h-[36px] bg-grafana-panel/30 border-t border-grafana-border flex items-center justify-between px-6 text-[10px] font-bold text-grafana-text-secondary font-mono">
                        <div className="flex h-full gap-6 items-center uppercase tracking-widest">
                            <button className="h-full border-t-2 border-grafana-accent-blue text-white px-3 flex items-center gap-2">
                                <Terminal size={12} /> KONSOL
                            </button>
                            <button className="h-full hover:text-white px-3 transition-colors">BETİKLER</button>
                            <button className="h-full hover:text-white px-3 transition-colors">VERİ PROFİLİ</button>
                        </div>
                        <div className="tabular-nums flex items-center gap-4">
                            <span className="text-grafana-accent-blue/50">ÖRNEKLEME HIZI: 100MS</span>
                            <div className="w-px h-3 bg-grafana-border" />
                            <span>UTC: {new Date(masterNow).toLocaleTimeString()}</span>
                        </div>
                    </footer>
                </main>

                {/* Right: Signal Matrix */}
                <aside className="w-[320px] border-l border-grafana-border bg-grafana-panel/10 flex flex-col hidden xl:flex">
                    <div className="p-5 flex justify-between items-center border-b border-grafana-border bg-grafana-bg/50">
                        <div className="flex items-center gap-3">
                            <Zap size={14} className="text-grafana-accent-blue" />
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-grafana-text-primary font-mono">Sinyal Matrisi</h3>
                        </div>
                        <Plus className="text-grafana-accent-blue cursor-pointer hover:scale-110 transition-transform" size={16} onClick={() => setShowSearch(true)} />
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                        <table className="scada-table">
                            <thead>
                                <tr className="border-b border-grafana-border">
                                    <th className="text-[10px] font-mono tracking-tighter">KİMLİK</th>
                                    <th className="text-right text-[10px] font-mono tracking-tighter">DEĞER</th>
                                    <th className="text-right text-[10px] font-mono tracking-tighter">Δ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {panels.map(p => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => setSelectedSignalId(p.id)} 
                                        className={cn(
                                            "hover:bg-grafana-accent-blue/5 cursor-pointer transition-colors group",
                                            selectedSignalId === p.id && "bg-grafana-accent-blue/10 border-l-2 border-grafana-accent-blue"
                                        )}
                                    >
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-grafana-text-primary group-hover:text-white transition-colors">{p.pointName}</span>
                                                <span className="text-[9px] text-grafana-text-secondary font-mono tracking-tighter uppercase">ADR: {p.scadaAddress}</span>
                                            </div>
                                        </td>
                                        <td className="text-right py-4 tabular-nums font-mono text-grafana-text-primary font-bold">
                                            {p.lastValue?.toFixed(2)}
                                        </td>
                                        <td className="text-right py-4 tabular-nums font-mono text-grafana-accent-green">
                                            +0.05%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {activePanel && (
                        <div className="bg-grafana-panel/50 border-t border-grafana-border p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">Birim Telemetrisi</h4>
                                <Maximize2 size={12} className="text-grafana-text-secondary" />
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <span className="text-4xl font-black text-white tabular-nums leading-none tracking-tighter">
                                    {activePanel.lastValue?.toFixed(3)}
                                </span>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] font-bold text-grafana-accent-green font-mono uppercase">+0.15 (+0.42%)</span>
                                    <span className="text-[10px] font-bold text-grafana-text-secondary font-mono uppercase">{activePanel.unit}</span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-grafana-border/50">
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                    <span className="text-grafana-text-secondary uppercase">ÖRNEK ARALIĞI</span>
                                    <span className="text-white font-bold">{activePanel.minValue?.toFixed(1)} — {activePanel.maxValue?.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                    <span className="text-grafana-text-secondary uppercase">VERİ AKIŞI</span>
                                    <span className="text-grafana-accent-blue font-bold">STABİL</span>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* SIGNAL_SEARCH SCREEN */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-grafana-bg flex flex-col font-mono"
                    >
                        <div className="h-[64px] border-b border-grafana-border flex items-center px-8 gap-6 bg-grafana-panel/50">
                            <Search className="text-grafana-accent-blue" size={20} />
                            <input autoFocus placeholder="SİNYAL SORGULA..."
                                onKeyDown={e => e.key === 'Enter' && handleAddSignalByName((e.target as any).value)}
                                className="flex-1 bg-transparent outline-none text-lg font-bold text-white placeholder:text-grafana-text-secondary/30 uppercase tracking-widest"
                            />
                            <button onClick={() => setShowSearch(false)} className="text-[11px] font-bold text-grafana-text-secondary hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                                <X size={16} /> İPTAL ET
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-12 bg-grafana-bg">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="flex items-center gap-4 text-grafana-text-secondary">
                                    <div className="h-px flex-1 bg-grafana-border" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Sık Kullanılanlar</span>
                                    <div className="h-px flex-1 bg-grafana-border" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['GERİLİM_L1', 'AKIM_A', 'FREKANS_HZ', 'GÜÇ_KW', 'ŞEBEKE_DURUMU', 'İÇ_SICAKLIK'].map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => handleAddSignalByName(s)} 
                                            className="flex items-center justify-between p-6 bg-grafana-panel/30 border border-grafana-border rounded-sm hover:border-grafana-accent-blue hover:bg-grafana-accent-blue/[0.02] transition-all group"
                                        >
                                            <div className="text-left space-y-1">
                                                <p className="text-sm font-bold text-white group-hover:text-grafana-accent-blue transition-colors uppercase tracking-widest">{s}</p>
                                                <p className="text-[10px] text-grafana-text-secondary uppercase">KAYNAK: UPLINK DÜĞÜMÜ 01 // TİP: TELEMETRİ</p>
                                            </div>
                                            <Plus className="text-grafana-text-secondary group-hover:text-grafana-accent-blue group-hover:scale-125 transition-all" size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

