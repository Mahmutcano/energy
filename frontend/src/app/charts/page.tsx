"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    Activity, Cpu, Factory, Building2, Plus, X, Maximize2, Minimize2, TrendingUp,
    Clock, Signal, ChevronDown, BarChart3, Zap, AlertTriangle, Settings2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company { id: string; name: string; }
interface Plant { id: string; plantName: string; }
interface Device { id: string; deviceName: string; deviceType: string; protocolConfigId: string; datasheetProfileId: string; }
interface DataPoint { id: string; dataName: string; dataValue: string | null; registerAddress: number | null; scadaAddress: number | null; ioa1ObjectAddress: number | null; signalDescription: string | null; dataType: string | null; }

interface ChartPanel {
    id: string;
    deviceId: string;
    deviceName: string;
    pointId: string;
    pointName: string;
    protocolConfigId: string;
    unit: string;
    color: string;
    data: { time: string; value: number; ts: number }[];
    lastValue: number | null;
    minValue: number | null;
    maxValue: number | null;
    avgValue: number | null;
    expanded: boolean;
    // IOA matching fields
    scadaAddress: number | null;
    ioa1ObjectAddress: number | null;
    registerAddress: number | null;
}

const CHART_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const MAX_HISTORY = 100; // Optimal for 10Hz/5Hz view without compression

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

const IndustrialTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;
    return (
        <div className="bg-[#1e222d] border border-[#2a2e39] rounded px-3 py-2 shadow-2xl">
            <p className="text-[10px] text-[#787b86] font-mono tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-[#d1d4dc] tabular-nums leading-none">
                    {typeof payload[0].value === 'number' ? payload[0].value.toFixed(3) : payload[0].value}
                </span>
                <span className="text-[10px] font-bold text-[#787b86] uppercase leading-none">{payload[0].payload?.unit || ''}</span>
            </div>
        </div>
    );
};

// ─── Single Chart Panel (Live Oscilloscope Style) ───────────────────────────

const ChartPanelComponent = ({ panel, onRemove, onToggleExpand, now }: {
    panel: ChartPanel;
    onRemove: (id: string) => void;
    onToggleExpand: (id: string) => void;
    now: number;
}) => {
    const delta = panel.data.length >= 2
        ? panel.data[panel.data.length - 1].value - panel.data[panel.data.length - 2].value
        : 0;
    const isUp = delta >= 0;
    const hasData = panel.data.length > 0;
    const range = (panel.maxValue ?? 0) - (panel.minValue ?? 0);
    const safeRange = range === 0 ? 1 : range;

    // Elapsed time since first sample
    const elapsed = hasData && panel.data.length >= 2
        ? Math.round((panel.data[panel.data.length - 1].ts - panel.data[0].ts) / 1000)
        : 0;
    const elapsedStr = elapsed > 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`card-base bg-slate-950/80 border-slate-800/60 overflow-hidden group relative backdrop-blur-sm
                ${panel.expanded ? 'col-span-full' : ''}`}
        >
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                style={{ background: `radial-gradient(ellipse at 80% 80%, ${panel.color}06, transparent 60%)` }} />

            {/* Header */}
            <div className="relative z-10 px-5 py-2.5 border-b border-slate-800/40 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: panel.color, boxShadow: `0 0 12px ${panel.color}` }} />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-30" style={{ backgroundColor: panel.color }} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[11px] font-black text-white tracking-tight truncate">{panel.pointName}</h3>
                        <p className="text-[9px] text-slate-600 font-mono truncate">{panel.deviceName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[8px] font-mono text-slate-700 mr-2 tracking-widest uppercase">
                        {hasData ? 'STREAMING' : 'IDLE'}
                    </span>
                    <button onClick={() => onToggleExpand(panel.id)} className="p-1.5 text-slate-600 hover:text-white rounded-md hover:bg-slate-800 transition-all">
                        {panel.expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                    <button onClick={() => onRemove(panel.id)} className="p-1.5 text-slate-600 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-all">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Stats Bar with smooth transitions */}
            <div className="relative z-10 px-5 py-2 flex items-center gap-4 border-b border-slate-800/20 bg-slate-900/20">
                <div className="flex items-baseline gap-1.5 transition-all duration-300">
                    <span className="text-2xl font-black tabular-nums tracking-tighter transition-colors duration-200"
                        style={{ color: hasData ? '#fff' : '#334155' }}>
                        {panel.lastValue !== null ? (Number.isInteger(panel.lastValue) ? panel.lastValue : panel.lastValue.toFixed(3)) : '--.---'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{panel.unit}</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className={`flex items-center gap-1 text-[10px] font-bold transition-colors duration-200 ${!hasData ? 'text-slate-700' : isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    <TrendingUp size={11} className={`transition-transform duration-200 ${isUp ? '' : 'rotate-180'}`} />
                    <span className="tabular-nums">{hasData ? Math.abs(delta).toFixed(3) : '---'}</span>
                </div>
                <div className="ml-auto flex items-center gap-4 text-[9px] font-mono text-slate-600">
                    <span>MIN: <span className="text-cyan-400 font-bold tabular-nums transition-all duration-300">{panel.minValue?.toFixed(1) ?? '---'}</span></span>
                    <span>AVG: <span className="text-amber-400 font-bold tabular-nums transition-all duration-300">{panel.avgValue?.toFixed(1) ?? '---'}</span></span>
                    <span>MAX: <span className="text-rose-400 font-bold tabular-nums transition-all duration-300">{panel.maxValue?.toFixed(1) ?? '---'}</span></span>
                </div>
            </div>

            {/* Chart Area — Live Streaming */}
            <div className="relative z-10 px-2 pt-2 pb-1" style={{ height: panel.expanded ? 400 : 220 }}>
                {!hasData ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800">
                        <Signal size={32} className="mb-2 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase">Awaiting Signal</span>
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={panel.data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`grad-${panel.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={panel.color} stopOpacity={0.25} />
                                        <stop offset="50%" stopColor={panel.color} stopOpacity={0.08} />
                                        <stop offset="100%" stopColor={panel.color} stopOpacity={0} />
                                    </linearGradient>
                                    <filter id={`glow-${panel.id}`}>
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.05)"
                                    vertical={true}
                                />
                                <XAxis
                                    dataKey="ts"
                                    type="number"
                                    domain={[now - 30000, now]}
                                    allowDataOverflow
                                    scale="time"
                                    hide={false}
                                    tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    tickFormatter={(ts: number) => {
                                        try {
                                            return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                        } catch {
                                            return '';
                                        }
                                    }}
                                />
                                <YAxis
                                    orientation="right"
                                    tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    domain={[
                                        (panel.minValue ?? 0) - safeRange * 0.15,
                                        (panel.maxValue ?? 0) + safeRange * 0.15
                                    ]}
                                    tickFormatter={(v: number) => v.toFixed(1)}
                                    width={50}
                                />
                                <Tooltip
                                    content={<IndustrialTooltip />}
                                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                {panel.avgValue !== null && (
                                    <ReferenceLine
                                        y={panel.avgValue}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 6"
                                        strokeOpacity={0.2}
                                    />
                                )}
                                <Area
                                    type="linear"
                                    dataKey="value"
                                    stroke={panel.color}
                                    strokeWidth={1.5}
                                    fill={`url(#grad-${panel.id})`}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#1e293b', stroke: panel.color, strokeWidth: 2 }}
                                    isAnimationActive={false}
                                    filter={`url(#glow-${panel.id})`}
                                    connectNulls
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Live scan-line edge glow */}
                        <div className="absolute right-3 top-0 bottom-0 w-px opacity-60 pointer-events-none"
                            style={{
                                background: `linear-gradient(to bottom, transparent 10%, ${panel.color}40 40%, ${panel.color} 50%, ${panel.color}40 60%, transparent 90%)`,
                                animation: 'pulse 2s ease-in-out infinite'
                            }} />
                    </>
                )}
            </div>

            {/* Footer — Live timer */}
            <div className="relative z-10 px-5 py-1.5 border-t border-slate-800/20 flex items-center justify-between text-[9px] text-slate-700 font-mono bg-slate-900/10">
                <div className="flex items-center gap-3">
                    <span>{panel.data.length} pts</span>
                    <span className="text-slate-800">•</span>
                    <span>{elapsedStr} elapsed</span>
                </div>
                <div className="flex items-center gap-2">
                    {hasData && <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: panel.color }} />}
                    <span>{hasData ? panel.data[panel.data.length - 1].time : '--:--:--'}</span>
                </div>
            </div>
        </motion.div>

    );
};

// ─── Add Panel Modal ────────────────────────────────────────────────────────

const AddPanelModal = ({ open, onClose, onAdd, existingPanelIds }: {
    open: boolean;
    onClose: () => void;
    onAdd: (device: Device, point: DataPoint, protocolConfigId: string) => void;
    existingPanelIds: Set<string>;
}) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);
    const [selCompany, setSelCompany] = useState('');
    const [selPlant, setSelPlant] = useState('');
    const [selDevice, setSelDevice] = useState<Device | null>(null);

    useEffect(() => {
        if (!open) return;
        apiRequest('/api/companies').then(r => r.ok ? r.json() : []).then(setCompanies);
    }, [open]);

    useEffect(() => {
        if (!selCompany) { setPlants([]); return; }
        apiRequest('/api/plants').then(r => r.ok ? r.json() : []).then((all: any[]) =>
            setPlants(all.filter(p => p.companyId === selCompany))
        );
        setSelPlant(''); setSelDevice(null); setPoints([]);
    }, [selCompany]);

    useEffect(() => {
        if (!selPlant) { setDevices([]); return; }
        apiRequest('/api/devices').then(r => r.ok ? r.json() : []).then((all: any[]) =>
            setDevices(all.filter(d => d.protocol?.plant?.id === selPlant))
        );
        setSelDevice(null); setPoints([]);
    }, [selPlant]);

    useEffect(() => {
        if (!selDevice?.datasheetProfileId) { setPoints([]); return; }
        apiRequest(`/api/datasheets?profileId=${selDevice.datasheetProfileId}`)
            .then(r => r.ok ? r.json() : []).then(setPoints);
    }, [selDevice]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-green/10 border border-brand-green/20">
                            <Plus size={16} className="text-brand-green" />
                        </div>
                        <h2 className="text-sm font-black text-white tracking-tight">Add Chart Panel</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5"><Building2 size={10} /> Company</label>
                            <select value={selCompany} onChange={e => setSelCompany(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all">
                                <option value="">Select...</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5"><Factory size={10} /> Plant</label>
                            <select value={selPlant} onChange={e => setSelPlant(e.target.value)} disabled={!selCompany} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20">
                                <option value="">Select...</option>
                                {plants.map(p => <option key={p.id} value={p.id}>{p.plantName}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5"><Cpu size={10} /> Device</label>
                            <select value={selDevice?.id || ''} onChange={e => setSelDevice(devices.find(d => d.id === e.target.value) || null)} disabled={!selPlant} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20">
                                <option value="">Select...</option>
                                {devices.map(d => <option key={d.id} value={d.id}>{d.deviceName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Points List */}
                    {points.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto space-y-1 scrollbar-hide border border-slate-800/50 rounded-xl p-2 bg-slate-900/30">
                            {points.map(pt => {
                                const key = `${selDevice?.id}:${pt.id}`;
                                const alreadyAdded = existingPanelIds.has(key);
                                return (
                                    <button
                                        key={pt.id}
                                        disabled={alreadyAdded}
                                        onClick={() => selDevice && onAdd(selDevice, pt, selDevice.protocolConfigId)}
                                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-lg transition-all ${alreadyAdded
                                            ? 'bg-brand-green/5 border border-brand-green/20 opacity-50 cursor-not-allowed'
                                            : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Activity size={12} className={alreadyAdded ? 'text-brand-green' : 'text-slate-600'} />
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-white truncate">{pt.dataName}</p>
                                                {pt.signalDescription && (
                                                    <p className="text-[9px] text-slate-600 truncate">{pt.signalDescription}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-[9px] font-mono text-slate-600">
                                                IOA: {pt.scadaAddress || pt.ioa1ObjectAddress || pt.registerAddress || '-'}
                                            </span>
                                            {alreadyAdded ? (
                                                <span className="text-[9px] font-bold text-brand-green tracking-widest">ADDED</span>
                                            ) : (
                                                <Plus size={14} className="text-slate-600" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selDevice && points.length === 0 && (
                        <div className="text-center py-8 text-slate-600 text-xs font-bold uppercase tracking-widest">
                            No data points configured for this device
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ChartsPage() {
    const [panels, setPanels] = useState<ChartPanel[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const panelsRef = useRef<ChartPanel[]>([]);

    // Keep ref in sync
    useEffect(() => { panelsRef.current = panels; }, [panels]);

    const handleAddPanel = useCallback((device: Device, point: DataPoint, protocolConfigId: string) => {
        const colorIdx = panelsRef.current.length % CHART_COLORS.length;
        const panelId = `${device.id}:${point.id}`;
        const newPanel: ChartPanel = {
            id: panelId,
            deviceId: device.id,
            deviceName: device.deviceName,
            pointId: point.id,
            pointName: point.dataName,
            protocolConfigId,
            unit: point.dataValue || point.dataType || '',
            color: CHART_COLORS[colorIdx],
            data: [],
            lastValue: null,
            minValue: null,
            maxValue: null,
            avgValue: null,
            expanded: false,
            scadaAddress: point.scadaAddress,
            ioa1ObjectAddress: point.ioa1ObjectAddress,
            registerAddress: point.registerAddress,
        };
        setPanels(prev => [...prev, newPanel]);

        // Immediately fetch historical data from DB to pre-populate the chart
        apiRequest(`/api/telemetry/history?deviceId=${device.id}&pointId=${point.id}&hours=1`)
            .then(r => r.ok ? r.json() : [])
            .then((history: any[]) => {
                if (!history || history.length === 0) {
                    console.log(`[CHART] No historical data for ${point.dataName}`);
                    return;
                }
                console.log(`[CHART] 📈 Loaded ${history.length} historical points for ${point.dataName}`);

                const historyData = history.map((h: any) => {
                    const t = new Date(h.time);
                    return {
                        time: t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        value: typeof h.value === 'number' ? h.value : parseFloat(h.value),
                        ts: t.getTime()
                    };
                }).filter((d: any) => !isNaN(d.value)).slice(-MAX_HISTORY);

                if (historyData.length === 0) return;

                const values = historyData.map((d: any) => d.value);
                const minV = values.length > 0 ? Math.min(...values) : null;
                const maxV = values.length > 0 ? Math.max(...values) : null;

                setPanels(prev => prev.map(p => {
                    if (p.id !== panelId) return p;
                    return {
                        ...p,
                        data: historyData,
                        lastValue: values.length > 0 ? values[values.length - 1] : null,
                        minValue: minV,
                        maxValue: maxV,
                        avgValue: values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null,
                    };
                }));
            })
            .catch(err => console.error('[CHART] History fetch error:', err));
    }, []);

    const handleRemovePanel = useCallback((id: string) => {
        setPanels(prev => prev.filter(p => p.id !== id));
    }, []);

    const handleToggleExpand = useCallback((id: string) => {
        setPanels(prev => prev.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
    }, []);

    // ─── Continuous streaming: chart ALWAYS moves right ────────────────────────
    const queueRef = useRef<Map<string, { value: number; ts: number }[]>>(new Map());

    // Tick counter: increments every 100ms, triggers useEffect reliably
    const [tick, setTick] = useState(0);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => {
            setNow(Date.now());
            setTick(t => t + 1);
        }, 100);
        return () => clearInterval(id);
    }, []);

    // Every tick: drain queue OR repeat last value — chart never stops
    useEffect(() => {
        setPanels(prev => {
            const queue = queueRef.current;
            const currentTime = Date.now();

            return prev.map(panel => {
                const queueItems = queue.get(panel.id);
                const hasQueueData = queueItems && queueItems.length > 0;

                // Even if no new data, we keep the last point updated to 'now'
                // so the line reaches the right-hand edge of the "advancing" chart.
                let targetValue = panel.lastValue;
                let targetTs = currentTime;

                if (hasQueueData) {
                    // CATCH-UP LOGIC: If queue is lagging, jump to newest
                    if (queueItems.length > 20) {
                        const latest = queueItems.pop()!;
                        queueItems.length = 0; // Clear queue
                        targetValue = latest.value;
                        targetTs = latest.ts;
                    } else {
                        const update = queueItems.shift()!;
                        targetValue = update.value;
                        targetTs = update.ts;
                    }
                }

                // Initial state: don't start until first data point
                if (targetValue === null) return panel;

                // Create a new data point
                const newPoint = {
                    time: new Date(targetTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    value: targetValue,
                    ts: targetTs
                };

                // Keep points within the visible window (30s) + a bit of buffer (5s) for history/late arrival
                const windowStart = currentTime - 35000;

                // Ensure we don't have duplicate timestamps in our dataset
                const filteredOldData = panel.data.filter(d => d.ts !== targetTs);

                const newData = [...filteredOldData, newPoint]
                    .filter(d => d.ts > windowStart)
                    .sort((a, b) => a.ts - b.ts);

                const values = newData.map(d => d.value);
                const minV = values.length > 0 ? Math.min(...values) : targetValue;
                const maxV = values.length > 0 ? Math.max(...values) : targetValue;

                return {
                    ...panel,
                    data: newData,
                    lastValue: targetValue,
                    minValue: minV,
                    maxValue: maxV,
                    avgValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : targetValue,
                };
            });
        });
    }, [tick]);

    // Socket listener: push into queue (no React re-renders here)
    const [debugEventCount, setDebugEventCount] = useState(0);
    const debugCountRef = useRef(0);

    useEffect(() => {
        const handleTelemetry = (data: any) => {
            const incoming = Array.isArray(data) ? data : [data];
            const currentPanels = panelsRef.current;

            incoming.forEach(pkt => {
                const dataIoa = pkt.ioa !== undefined && pkt.ioa !== null ? Number(pkt.ioa) : null;
                const value = typeof pkt.value === 'number' ? pkt.value : parseFloat(pkt.value);
                if (isNaN(value)) return;

                // Log every packet arrival for debugging
                console.log(`[CHARTS] Received telemetry: pointId=${pkt.pointId}, ioa=${dataIoa}, value=${value}`);

                currentPanels.forEach(panel => {
                    // Precise match logic (String coercion for safety)
                    let isMatch = pkt.pointId && String(panel.pointId) === String(pkt.pointId);

                    if (!isMatch && dataIoa !== null) {
                        isMatch = (panel.scadaAddress !== null && Number(panel.scadaAddress) === dataIoa) ||
                            (panel.ioa1ObjectAddress !== null && Number(panel.ioa1ObjectAddress) === dataIoa) ||
                            (panel.registerAddress !== null && Number(panel.registerAddress) === dataIoa);
                    }

                    if (isMatch) {
                        console.log(`[CHARTS] ✅ Match! Panel: ${panel.pointName}, Val: ${value}`);
                        if (!queueRef.current.has(panel.id)) {
                            queueRef.current.set(panel.id, []);
                        }
                        queueRef.current.get(panel.id)!.push({ value, ts: Date.now() });

                        // Increment debug counter
                        debugCountRef.current++;
                        setDebugEventCount(debugCountRef.current);
                    }
                });
            });
        };

        const topics = ['telemetry:all'];
        panels.forEach(p => {
            if (p.deviceId) topics.push(`telemetry:${p.deviceId}`);
            if (p.protocolConfigId) {
                topics.push(`telemetry:${p.protocolConfigId}`);
                topics.push(`telemetry:raw:${p.protocolConfigId}`);
            }
        });

        const activeTopics = [...new Set(topics)];
        console.log(`[CHARTS] Subscribing to:`, activeTopics);

        activeTopics.forEach(t => socket.on(t, handleTelemetry));
        return () => {
            activeTopics.forEach(t => socket.off(t, handleTelemetry));
        };
    }, [panels.length, panels.map(p => p.id).join(',')]);

    const existingPanelIds = new Set(panels.map(p => p.id));

    return (
        <div className="space-y-6 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-brand-green to-cyan-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                        <h1 className="text-2xl font-black text-white tracking-tight">Industrial Charts</h1>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 tracking-widest uppercase font-bold opacity-60">
                        Real-Time Telemetry Visualization • {panels.length} Active Panels
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">LIVE</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                        <Zap size={10} className="text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400 tabular-nums">{debugEventCount}</span>
                        <span className="text-[8px] text-slate-600 uppercase tracking-wider">events</span>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-xl text-[11px] font-black tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20"
                    >
                        <Plus size={14} />
                        Add Chart
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {panels.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 card-base border-dashed border-slate-800 bg-slate-950/20"
                >
                    <div className="relative mb-8">
                        <BarChart3 size={80} className="text-slate-900" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Plus size={28} className="text-slate-700" />
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-600 tracking-tight mb-2">No Charts Added</h3>
                    <p className="text-[11px] text-slate-700 uppercase tracking-[0.3em] font-bold mb-6">
                        Click "Add Chart" to start monitoring
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green/10 text-brand-green rounded-xl text-[11px] font-bold tracking-wider border border-brand-green/20 hover:bg-brand-green/20 transition-all"
                    >
                        <Plus size={14} />
                        Add Your First Chart
                    </button>
                </motion.div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {panels.map(panel => (
                        <ChartPanelComponent
                            key={panel.id}
                            panel={panel}
                            onRemove={handleRemovePanel}
                            onToggleExpand={handleToggleExpand}
                            now={now}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Add Panel Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddPanelModal
                        open={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onAdd={(device, point, proto) => {
                            handleAddPanel(device, point, proto);
                        }}
                        existingPanelIds={existingPanelIds}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
