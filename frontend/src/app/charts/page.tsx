"use client";

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    Activity, Plus, X, Maximize2, Search, Camera, Settings,
    MousePointer2, Pencil, Ruler, Square, Clock, Eye,
    MoreVertical, ChevronDown, TrendingUp, BarChart3
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_HISTORY = 50; 
const UPDATE_INTERVAL = 100;

// ─── Essential Types ────────────────────────────────────────────────────────

interface Company { id: string; name: string; }
interface Plant { id: string; plantName: string; }
interface Device { id: string; deviceName: string; deviceType: string; protocolConfigId: string; datasheetProfileId: string; }
interface DataPoint { id: string; dataName: string; dataValue: string | null; registerAddress: number | null; scadaAddress: number | null; ioa1ObjectAddress: number | null; signalDescription: string | null; dataType: string | null; }

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

const TradingViewTooltip = memo(({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-[#1e222d] border border-[#363a45] rounded shadow-2xl px-3 py-2 z-50">
            <p className="text-[10px] text-[#787b86] font-mono leading-none mb-1.5">
                {new Date(data.ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tabular-nums leading-none">
                    {typeof data.value === 'number' ? data.value.toFixed(3) : data.value}
                </span>
                <span className="text-[10px] text-[#787b86] uppercase leading-none">VAL</span>
            </div>
        </div>
    );
});
TradingViewTooltip.displayName = 'TradingViewTooltip';

const PriceLabel = (props: any) => {
    const { viewBox, value, color } = props;
    if (!viewBox) return null;
    const { y, width } = viewBox;
    return (
        <g>
            <rect x={width - 55} y={y - 10} width={55} height={20} fill="#131722" rx={2} />
            <text x={width - 27.5} y={y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
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

    // NEW: masterNow state to solve impure render issues
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
            unit: 'kV',
            color: '#26a69a',
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
        toast.success(`${name} Terminale Eklendi`);
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
                    // CRITICAL FIX: Removed intentional pass '|| true' and fixed ioa logic
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
        <div className="fixed inset-0 bg-white flex flex-col font-sans overflow-hidden select-none text-[#131722] antialiased">

            {/* Header: TradingView Shell */}
            <header className="h-[48px] border-b border-[#e0e3eb] flex items-center px-2 flex-shrink-0 bg-white z-40">
                <div className="flex items-center gap-1 h-full">
                    <button onClick={() => setShowSearch(true)} className="h-8 px-3 flex items-center gap-2 hover:bg-[#f0f3fa] rounded transition-colors text-[#2962ff]">
                        <Search size={16} />
                        <span className="text-[13px] font-bold uppercase tracking-tighter">Sembol Ara</span>
                    </button>
                    <div className="h-5 w-px bg-[#e0e3eb] mx-1" />
                    <div className="flex gap-0.5">
                        {['1D', '5D', '1A', '3A'].map(t => (
                            <button key={t} className="h-8 px-2.5 text-[11px] font-bold text-[#787b86] hover:bg-[#f0f3fa] hover:text-[#131722] rounded transition-all">{t}</button>
                        ))}
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button className="h-8 px-4 text-[#2962ff] hover:bg-[#2962ff]/10 rounded font-bold text-[11px] border border-[#2962ff]/20 flex items-center gap-2">
                        <Camera size={14} /> Yayınla
                    </button>
                    <div className="h-5 w-px bg-[#e0e3eb] mx-1" />
                    <button className="p-1.5 text-[#787b86] hover:bg-[#f0f3fa] rounded"><Settings size={18} /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* Left Drawer */}
                <aside className="w-[48px] border-r border-[#e0e3eb] bg-white flex flex-col items-center py-2 gap-2 z-30">
                    <button className="p-2 text-[#2962ff] bg-[#f0f3fa] rounded"><MousePointer2 size={18} /></button>
                    <button className="p-2 text-[#787b86] hover:bg-[#f0f3fa] rounded"><Pencil size={18} /></button>
                    <button className="p-2 text-[#787b86] hover:bg-[#f0f3fa] rounded"><Square size={18} /></button>
                    <button className="p-2 text-[#787b86] hover:bg-[#f0f3fa] rounded"><Ruler size={18} /></button>
                </aside>

                <main className="flex-1 bg-white relative flex flex-col overflow-hidden">
                    <div className="flex-1 relative">
                        {activePanel ? (
                            <div className="absolute inset-0 flex flex-col">
                                <div className="p-5 flex justify-between items-start pointer-events-none z-10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#131722] uppercase tracking-tighter">{activePanel.pointName}</span>
                                            <span className="text-[10px] font-bold text-[#089981] bg-[#089981]/10 px-1 rounded">CANLI</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black tracking-tighter text-[#131722] tabular-nums leading-none">
                                                {activePanel.lastValue !== null ? activePanel.lastValue.toFixed(3) : '0.000'}
                                            </span>
                                            <span className="text-xs font-bold text-[#787b86]">{activePanel.unit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={activePanel.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="trading_gradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#26a69a" stopOpacity={0.15} />
                                                    <stop offset="100%" stopColor="#26a69a" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f3fa" vertical={true} />
                                            <XAxis dataKey="ts" hide domain={['auto', 'auto']} />
                                            <YAxis
                                                orientation="right"
                                                domain={['auto', 'auto']}
                                                tick={{ fontSize: 10, fill: '#787b86', fontWeight: 600 }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={60}
                                            />
                                            <Tooltip content={<TradingViewTooltip />} cursor={{ stroke: '#787b86', strokeDasharray: '3 3' }} />

                                            {activePanel.lastValue !== null && (
                                                <ReferenceLine
                                                    y={activePanel.lastValue}
                                                    stroke="#26a69a"
                                                    strokeDasharray="3 3"
                                                    label={<PriceLabel color="#131722" value={activePanel.lastValue} />}
                                                />
                                            )}

                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#26a69a"
                                                strokeWidth={2}
                                                fill="url(#trading_gradient)"
                                                dot={false}
                                                isAnimationActive={false}
                                                connectNulls
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[#787b86] opacity-30">
                                <TrendingUp size={64} strokeWidth={1} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.4em] mt-4">TERMINAL BEKLEMEDE</span>
                            </div>
                        )}
                    </div>

                    <footer className="h-[36px] bg-white border-t border-[#e0e3eb] flex items-center justify-between px-4 text-[11px] font-bold text-[#787b86]">
                        <div className="flex h-full gap-4 items-center">
                            <button className="h-full border-t-2 border-[#2962ff] text-[#131722] px-3">Hisse Tarayıcısı</button>
                            <button className="h-full hover:text-[#131722] px-3">Hisse Senedi Takibi</button>
                        </div>
                        <div className="tabular-nums">Market Open · {new Date(masterNow).toLocaleTimeString()}</div>
                    </footer>
                </main>

                {/* Right: Watchlist */}
                <aside className="w-[300px] border-l border-[#e0e3eb] bg-white flex flex-col hidden xl:flex">
                    <div className="p-4 flex justify-between items-center border-b border-[#f0f3fa]">
                        <h3 className="text-[13px] font-bold uppercase tracking-tighter text-[#131722]">İzleme Listesi</h3>
                        <Plus className="text-[#2962ff] cursor-pointer" size={16} onClick={() => setShowSearch(true)} />
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead className="text-[10px] text-[#787b86] font-bold uppercase border-b border-[#f0f3fa]">
                                <tr>
                                    <th className="px-4 py-2 text-left">Sembol</th>
                                    <th className="px-4 py-2 text-right">Son</th>
                                    <th className="px-4 py-2 text-right">Değ.</th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px] font-bold">
                                {panels.map(p => (
                                    <tr key={p.id} onClick={() => setSelectedSignalId(p.id)} className={`hover:bg-[#f0f3fa] cursor-pointer transition-colors ${selectedSignalId === p.id ? 'bg-[#f0f3fa]' : ''}`}>
                                        <td className="px-4 py-3">{p.pointName}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{p.lastValue?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-[#089981]">+0.05%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {activePanel && (
                        <div className="h-[220px] bg-[#f8f9fd] border-t border-[#e0e3eb] p-5">
                            <h4 className="text-[11px] font-bold text-[#787b86] uppercase mb-4 tracking-widest">Ayrıntılar</h4>
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-4xl font-black text-[#131722] tabular-nums leading-none">
                                    {activePanel.lastValue?.toFixed(3)}
                                </span>
                                <span className="text-[10px] font-bold text-[#089981]">+0.15 (+0.42%)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-[10px] font-bold text-[#787b86] uppercase italic">
                                <div>GÜNLÜK ARALIK</div>
                                <div className="text-right text-[#131722]">4.1 — 5.2</div>
                                <div>SES (VOL)</div>
                                <div className="text-right text-[#131722]">1.2M</div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* SEARCH SCREEN */}
            {showSearch && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-150">
                    <div className="h-[48px] border-b border-[#e0e3eb] flex items-center px-4 gap-4">
                        <Search className="text-[#2962ff]" size={20} />
                        <input autoFocus placeholder="Sembol Ara..."
                            onKeyDown={e => e.key === 'Enter' && handleAddSignalByName((e.target as any).value)}
                            className="flex-1 bg-transparent outline-none text-sm font-bold"
                        />
                        <button onClick={() => setShowSearch(false)} className="text-[12px] font-bold text-[#2962ff] uppercase">İptal</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#f8f9fd] p-10">
                        <div className="max-w-2xl mx-auto grid grid-cols-1 gap-3">
                            {['VOLTAGE_L1', 'CURRENT_A', 'FREQ_HZ', 'POWER_KW'].map(s => (
                                <button key={s} onClick={() => handleAddSignalByName(s)} className="flex items-center justify-between p-6 bg-white border border-[#e0e3eb] rounded hover:border-[#2962ff] transition-all">
                                    <div className="text-left">
                                        <p className="text-sm font-black text-[#131722]">{s}</p>
                                        <p className="text-[10px] text-[#787b86]">Uplink Node 01</p>
                                    </div>
                                    <Plus className="text-[#787b86]" size={18} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
