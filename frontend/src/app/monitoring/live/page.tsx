"use client";

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Box,
    Building2,
    Cpu,
    Factory,
    Zap,
    Search,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Signal,
    SignalHigh,
    Database,
    Layers,
    Terminal,
    Network,
    RefreshCw,
    Play,
    Trash2,
    List,
    AlertCircle,
    AlertTriangle,
    Table as TableIcon
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Company {
    id: string;
    name: string;
}

interface Plant {
    id: string;
    plantName: string;
    plantType: string;
}

interface Device {
    id: string;
    deviceName: string;
    deviceType: string;
    protocolConfigId: string;
    datasheetProfileId: string;
}

interface DataPoint {
    id: string;
    dataName: string;
    dataValue: string | null;
    registerAddress: number | null;
    scadaAddress: number | null;
    ioa1ObjectAddress: number | null;
    address: number | null;
    signalDescription: string | null;
    dataType: string | null;
    isActive: boolean;
}

// Global Stream Terminal component
const GlobalStream = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        socket.emit('join:protocol', { protocolId: 'admin:telemetry' }); // Joint global admin room
        
        const handleData = (data: any) => {
            setLogs(prev => [{
                id: `${Date.now()}-${Math.random()}`,
                time: new Date().toLocaleTimeString(),
                message: `[RECV] CH:${data.protocolId?.substring(0, 4) || '??'} DEV:${data.deviceId?.substring(0, 4) || '??'} ADDR:${data.ioa} VAL:${typeof data.value === 'number' ? data.value.toFixed(1) : data.value}`,
                data
            }, ...prev].slice(0, 20));
        };

        socket.on('telemetry:raw', handleData);
        return () => {
            socket.off('telemetry:raw', handleData);
        };
    }, []);

    return (
        <div className="card-base bg-slate-950 border-slate-900 overflow-hidden flex flex-col h-[450px]">
            <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-brand-green tracking-widest uppercase flex items-center gap-2">
                    <Terminal size={12} /> Console Output
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
                    <span className="text-[9px] font-mono text-slate-700 uppercase">Live Stream</span>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-800 animate-pulse text-center">
                        AWAITING INCOMING TELEMETRY<br />ON PUBLIC BUS...
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="text-slate-500 hover:text-brand-green transition-colors border-l-2 border-transparent hover:border-brand-green/30 pl-2">
                            <span className="text-slate-800 mr-2">[{log.time}]</span>
                            {log.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// IEC 104 Diagnostic Area
const IECDiagnosticPanel = ({ protocolId, asduAddr, deviceName, deviceId, devicePoints }: { protocolId: string, asduAddr: number, deviceName: string, deviceId: string, devicePoints: DataPoint[] }) => {
    const [rawLogs, setRawLogs] = useState<any[]>([]);
    const [points, setPoints] = useState<Map<number, any>>(new Map());
    const [lastUpdateMap, setLastUpdateMap] = useState<Map<number, number>>(new Map());
    const [isTriggering, setIsTriggering] = useState(false);

    useEffect(() => {
        const handleRawData = (rawData: any) => {
            const data = Array.isArray(rawData) ? rawData : [rawData];
            const now = Date.now();
            setLastUpdateMap(prev => {
                const newMap = new Map(prev);
                data.forEach(p => {
                    const ioaKey = Number(p.ioa);
                    if (!isNaN(ioaKey)) newMap.set(ioaKey, now);
                });
                return newMap;
            });

            setPoints(prev => {
                const newMap = new Map(prev);
                data.forEach(p => {
                    const ioaKey = Number(p.ioa);
                    if (!isNaN(ioaKey)) newMap.set(ioaKey, p);
                });
                return newMap;
            });

            const timestamp = new Date().toLocaleTimeString();
            const matchedNames = data.filter(p => p.name).map(p => p.name).slice(0, 3).join(', ');
            const suffix = data.length > 3 ? '...' : '';

            setRawLogs(prev => [
                {
                    id: `${Date.now()}-${Math.random()}`,
                    time: timestamp,
                    message: `RX ${data.length} PDUs ${matchedNames ? `(${matchedNames}${suffix})` : ''}`,
                    type: matchedNames ? 'info' : 'data'
                },
                ...prev
            ].slice(0, 50));
        };

        socket.on('telemetry:update', handleRawData);
        return () => {
            socket.off('telemetry:update', handleRawData);
        };
    }, [protocolId]);

    const handleTriggerGI = async () => {
        try {
            setIsTriggering(true);
            const res = await apiRequest('/api/admin/iec104-gi', {
                method: 'POST',
                body: JSON.stringify({ protocolId, asduAddr })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('GI Command Sent');
                setRawLogs(prev => [
                    { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), message: 'SENT GENERAL INTERROGATION (GI) COMMAND', type: 'info' },
                    ...prev
                ]);
            } else {
                toast.error(data.message || 'Failed to send GI');
            }
        } catch (err) {
            toast.error('Network Error');
        } finally {
            setIsTriggering(false);
        }
    };

    return (
        <div className="space-y-6 animate-in-up">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-green tracking-[0.2em] uppercase flex items-center gap-2">
                    <Network size={14} /> {deviceName} — Diagnostic Uplink
                </h3>
                <button
                    onClick={handleTriggerGI}
                    disabled={isTriggering}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg text-[10px] font-bold tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50"
                >
                    {isTriggering ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} fill="white" />}
                    Manual Scan
                </button>
            </div>

            <div className="flex flex-col gap-8">
                <div className="card-base bg-slate-950/60 border-slate-900/80 p-8 overflow-y-auto h-[600px] scrollbar-hide shadow-2xl backdrop-blur-xl relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.03),transparent_50%)]"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6 relative z-10">
                        {devicePoints.map((dp) => {
                            const liveData = (dp.scadaAddress !== null && points.get(Number(dp.scadaAddress))) ||
                                (dp.ioa1ObjectAddress !== null && points.get(Number(dp.ioa1ObjectAddress)));

                            const lastUpdate = liveData ? (lastUpdateMap.get(Number(liveData.ioa)) || 0) : 0;
                            const isUpdating = (Date.now() - lastUpdate) < 1000;
                            const hasData = liveData !== null && liveData !== undefined;

                            const displayIoa = hasData ? liveData.ioa : (dp.scadaAddress || dp.ioa1ObjectAddress || 'N/A');

                            return (
                                <motion.div
                                    key={dp.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        borderColor: isUpdating ? 'rgba(16,185,129,0.5)' : (hasData ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.2)'),
                                        backgroundColor: isUpdating ? 'rgba(16,185,129,0.08)' : (hasData ? 'rgba(15, 23, 42, 0.3)' : 'rgba(15, 23, 42, 0.1)')
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="border p-5 rounded-2xl flex flex-col justify-between min-h-[145px] hover:border-brand-green/40 hover:bg-slate-900/40 transition-all shadow-md group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' : (hasData ? 'bg-slate-500' : 'bg-slate-800')}`}></div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IOA: {displayIoa}</span>
                                        </div>
                                        {hasData && (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[8px] text-brand-green/80 font-bold bg-brand-green/10 px-2 py-0.5 rounded border border-brand-green/20 uppercase tracking-tighter">TYP: {liveData.typeId}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center py-2">
                                        <div className="text-[10px] text-brand-green font-black uppercase tracking-widest mb-0.5 truncate leading-none" title={dp.dataName}>
                                            {dp.dataName}
                                        </div>
                                        {dp.signalDescription && (
                                            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-tight mb-2 truncate leading-none opacity-80" title={dp.signalDescription}>
                                                {dp.signalDescription}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <div className="text-3xl font-bold text-white tabular-nums tracking-tighter break-words leading-none">
                                                {hasData ? (
                                                    typeof liveData.value === 'number' ?
                                                        (Number.isInteger(liveData.value) ? liveData.value : liveData.value.toFixed(3))
                                                        : liveData.value
                                                ) : (
                                                    <span className="text-slate-800 animate-pulse">--.---</span>
                                                )}
                                            </div>
                                            {(liveData?.unit || dp.dataType) && (
                                                <span className="text-[10px] font-bold text-slate-600 lowercase">{liveData?.unit || dp.dataType}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-slate-600 uppercase tracking-widest font-bold">Uplink Status</span>
                                            <span className={`text-[9px] font-mono ${hasData ? 'text-slate-500' : 'text-slate-800'}`}>
                                                {hasData ? `QDS: ${liveData.qds || '0'}` : 'AWAITING DATA'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] text-brand-green/40 uppercase tracking-widest font-bold font-mono">Sync</span>
                                            <div className="text-[9px] text-slate-500 font-mono">
                                                {hasData ? new Date(liveData.timestamp).toLocaleTimeString([], { hour12: false }) : '--:--:--'}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {points.size === 0 && (
                            <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 py-32 border-2 border-dashed border-slate-900 rounded-3xl">
                                <Network size={80} className="mb-6" />
                                <p className="text-xl font-black uppercase tracking-[0.8em]">Awaiting Data Stream</p>
                            </div>
                        )}
                    </div>

                    {/* Unmatched IOA Section in Diagnostic Panel */}
                    {(Array.from(points.keys()).filter(ioa => !devicePoints.some(dp => Number(dp.scadaAddress) === ioa || Number(dp.ioa1ObjectAddress) === ioa))).length > 0 && (
                        <div className="mt-12 space-y-6 pt-12 border-t border-slate-900/40 relative z-10">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-orange-500 tracking-[0.4em] uppercase flex items-center gap-2">
                                    <AlertCircle size={14} /> Unmapped Hardware IOAs
                                </h4>
                                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                                    Captured but not in datasheet
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {Array.from(points.values())
                                    .filter(p => !devicePoints.some(dp => Number(dp.scadaAddress) === Number(p.ioa) || Number(dp.ioa1ObjectAddress) === Number(p.ioa)))
                                    .map(p => {
                                        const lastUpdate = lastUpdateMap.get(Number(p.ioa)) || 0;
                                        const isUpdating = (Date.now() - lastUpdate) < 1000;
                                        return (
                                            <div key={p.ioa} className={`card-base p-4 border border-orange-500/10 bg-slate-950/40 flex flex-col gap-2 group hover:border-orange-500/30 transition-all ${isUpdating ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-mono text-slate-500 font-bold">IOA: {p.ioa}</span>
                                                    <div className={`w-1 h-1 rounded-full ${isUpdating ? 'bg-orange-500 animate-ping' : 'bg-slate-800'}`}></div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white tabular-nums">
                                                        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-mono uppercase tracking-tighter">TI: {p.typeId || '?'} | QDS: {p.qds || '0'}</span>
                                                </div>
                                                <span className="text-[8px] text-slate-700 font-mono uppercase mt-1">
                                                    {new Date(p.timestamp).toLocaleTimeString([], { hour12: false })}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="card-base bg-slate-950 border-slate-900 overflow-hidden flex flex-col h-[300px] shadow-2xl border-t-4 border-t-brand-green/20">
                    <div className="px-6 py-3 border-b border-slate-900 bg-slate-900/40 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Terminal size={14} className="text-brand-green" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Hardware Uplink Traffic</span>
                        </div>
                        <button onClick={() => setRawLogs([])} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-700 hover:text-danger transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto font-mono text-[10px] space-y-2 scrollbar-hide bg-[linear-gradient(to_bottom,rgba(15,23,42,0)_0%,rgba(15,23,42,0.5)_100%)]">
                        {rawLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-800 italic uppercase tracking-[0.5em] text-xs font-black animate-pulse">
                                [ SYSTEM LISTENING ACTIVE ]
                            </div>
                        ) : (
                            rawLogs.map(log => (
                                <div key={log.id} className={`flex gap-4 border-l-2 pl-4 py-0.5 transition-colors ${log.type === 'info' ? 'text-blue-400 border-blue-500/30' : 'text-slate-500 border-slate-800'}`}>
                                    <span className="opacity-20 flex-shrink-0">[{log.time}]</span>
                                    <span className="font-bold tracking-wider">{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Single Point Card Component
const PointCard = ({ point, liveData }: { point: DataPoint, liveData?: any }) => {
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const value = liveData?.value ?? null;
    const lastUpdate = liveData?.timestamp ? new Date(liveData.timestamp) : null;
    const hasData = !!liveData;
    const isUpdating = hasData && lastUpdate && (Date.now() - lastUpdate.getTime() < 1000);

    useEffect(() => {
        if (value !== null) {
            setPrevValue(value);
        }
    }, [value]);

    const delta = (value !== null && prevValue !== null) ? value - prevValue : 0;
    const isUp = delta >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: 1,
                y: 0,
                borderColor: isUpdating ? 'rgba(16,185,129,0.5)' : (hasData ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.2)'),
                backgroundColor: isUpdating ? 'rgba(16,185,129,0.08)' : (hasData ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.1)')
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`card-base p-6 transition-all flex flex-col justify-between min-h-[170px] group relative overflow-hidden backdrop-blur-sm border ${isUpdating ? 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                <SignalHigh size={44} />
            </div>

            <div className="flex justify-between items-start">
                <div className="space-y-1.5 overflow-hidden">
                    <span className={`text-[10px] font-bold tracking-widest uppercase block truncate ${hasData ? 'text-brand-green' : 'text-slate-600'}`} title={liveData?.name || point.signalDescription || point.dataName}>
                        {liveData?.name || point.signalDescription || point.dataName}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${hasData ? 'text-slate-400 bg-slate-950/80 border-slate-800' : 'text-slate-700 bg-slate-950/20 border-slate-900'}`}>
                            IOA: {point.scadaAddress || point.ioa1ObjectAddress || point.registerAddress || 'N/A'}
                        </span>
                    </div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${isUpdating ? 'bg-brand-green shadow-[0_0_12px_rgba(16,185,129,0.8)]' : (hasData ? 'bg-slate-500' : 'bg-slate-800')}`} />
            </div>

            <div className="flex items-baseline gap-2 mt-4 flex-wrap">
                <span className={`text-3xl lg:text-4xl font-bold tabular-nums tracking-tighter break-all transition-colors ${hasData ? 'text-white' : 'text-slate-800'}`}>
                    {hasData ? (Number.isInteger(value) ? value : value.toFixed(2)) : '--.--'}
                </span>
                <span className="text-xs font-bold text-slate-500 lowercase opacity-80">{liveData?.unit || point.dataType || ''}</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] mt-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${!hasData ? 'text-slate-800' : delta === 0 ? 'text-slate-600' : isUp ? 'text-brand-green/90' : 'text-danger/90'}`}>
                    {hasData && delta !== 0 && (isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
                    <span className="tracking-tight">{!hasData ? 'WAITING' : delta === 0 ? 'STABLE' : Math.abs(delta).toFixed(3)}</span>
                </div>
                {lastUpdate && (
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-600">
                        <Clock size={10} className="opacity-50" />
                        {lastUpdate.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Single Point Row Component for Table View
const PointRow = ({ point, liveData }: { point: DataPoint, liveData?: any }) => {
    const isUpdating = liveData && (Date.now() - new Date(liveData.timestamp).getTime() < 1000);
    const value = liveData?.value ?? null;
    const lastUpdate = liveData?.timestamp ? new Date(liveData.timestamp) : null;

    return (
        <tr className={`border-b border-white/[0.03] transition-colors ${isUpdating ? 'bg-brand-green/10' : 'hover:bg-white/[0.02]'}`}>
            <td className="py-3 px-4 text-[10px] font-mono text-slate-500 uppercase truncate max-w-[200px]" title={liveData?.name || point.signalDescription || point.dataName}>
                {liveData?.name || point.signalDescription || point.dataName}
            </td>
            <td className="py-3 px-4 text-[10px] font-mono text-slate-500">
                {point.scadaAddress || point.ioa1ObjectAddress || point.registerAddress || '-'}
            </td>
            <td className="py-3 px-4">
                <span className={`text-xs font-bold tabular-nums ${isUpdating ? 'text-brand-green' : 'text-white'}`}>
                    {value !== null ? (Number.isInteger(value) ? value : value.toFixed(3)) : '---'}
                </span>
            </td>
            <td className="py-3 px-4 text-[9px] text-slate-600 uppercase">{liveData?.unit || point.dataType || '-'}</td>
            <td className="py-3 px-4 text-[9px] text-slate-600 font-mono">
                {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour12: false }) : '-'}
            </td>
        </tr>
    );
};

// Datasheet Table Component
const DatasheetLiveTable = ({ points, liveValues, protocolType }: { points: DataPoint[], liveValues: Map<string, any>, protocolType: string }) => {
    return (
        <div className="card-base bg-slate-950/40 border-slate-800/50 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                        <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Point Name / Description</th>
                        <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Address / IOA</th>
                        <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Live Value</th>
                        <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Unit</th>
                        <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Last Sync</th>
                    </tr>
                </thead>
                <tbody>
                    {points.map(p => (
                        <PointRow key={p.id} point={p} liveData={liveValues.get(p.id)} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Main Page Component
export default function LiveMonitoringPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);
    const [liveValues, setLiveValues] = useState<Map<string, any>>(new Map());
    const [unmatchedValues, setUnmatchedValues] = useState<Map<number, any>>(new Map());
    const [pointLastUpdates, setPointLastUpdates] = useState<Record<string, number>>({});

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [protocolType, setProtocolType] = useState<string>('MODBUS');
    const [asduAddr, setAsduAddr] = useState<number>(1);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConsole, setShowConsole] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [socketConnected, setSocketConnected] = useState(false);

    const [protocolStatuses, setProtocolStatuses] = useState<Record<string, string>>({});
    const [isFlushing, setIsFlushing] = useState(false);

    useEffect(() => {
        setSocketConnected(socket.connected);
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        const onStatusChange = (data: { protocolId: string, status: string }) => {
            setProtocolStatuses(prev => ({ ...prev, [data.protocolId]: data.status }));
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('protocol:status', onStatusChange);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('protocol:status', onStatusChange);
        };
    }, []);

    const fetchInitial = async () => {
        try {
            setLoading(true);
            const [compRes, statusRes] = await Promise.all([
                apiRequest('/api/companies'),
                apiRequest('/api/system/protocol-statuses')
            ]);
            if (compRes.ok) {
                const result = await compRes.json();
                setCompanies((result && result.success) ? result.data : (Array.isArray(result) ? result : []));
            }
            if (statusRes.ok) {
                const result = await statusRes.json();
                setProtocolStatuses((result && result.success) ? result.data : result);
            }
        } catch (err) {
            console.error("Fetch initial error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFlushQueue = async () => {
        try {
            setIsFlushing(true);
            const res = await apiRequest('/api/system/flush-telemetry', { method: 'POST' });
            if (res.ok) {
                toast.success('Telemetry Queue Cleared');
                setLiveValues(new Map()); // Clear current view
                setUnmatchedValues(new Map()); // Clear unmatched
            }
        } catch (err) {
            toast.error('Failed to clear queue');
        } finally {
            setIsFlushing(false);
        }
    };

    useEffect(() => {
        fetchInitial();
    }, []);

    useEffect(() => {
        if (!selectedCompany) {
            setPlants([]);
            return;
        }
        const fetchPlants = async () => {
            try {
                const res = await apiRequest('/api/plants');
                if (res.ok) {
                    const result = await res.json();
                    const allPlants = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                    setPlants(Array.isArray(allPlants) ? allPlants.filter((p: any) => p.companyId === selectedCompany) : []);
                }
            } catch (err) {
                console.error("Fetch plants error:", err);
            }
        };
        fetchPlants();
        setSelectedPlant('');
        setSelectedDevice(null);
    }, [selectedCompany]);

    useEffect(() => {
        if (!selectedPlant) {
            setDevices([]);
            return;
        }
        const fetchDevices = async () => {
            try {
                const res = await apiRequest('/api/devices');
                if (res.ok) {
                    const result = await res.json();
                    const allDevices = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                    setDevices(Array.isArray(allDevices) ? allDevices.filter((d: any) => d.protocol?.plant?.id === selectedPlant) : []);
                }
            } catch (err) {
                console.error("Fetch devices error:", err);
            }
        };
        fetchDevices();
        setSelectedDevice(null);
    }, [selectedPlant]);

    useEffect(() => {
        if (!selectedDevice) {
            setPoints([]);
            return;
        }
        const fetchPoints = async () => {
            try {
                if (selectedDevice.protocolConfigId) {
                    const protoRes = await apiRequest('/api/comm-protocols');
                    if (protoRes.ok) {
                        const result = await protoRes.json();
                        const protos = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                        const proto = Array.isArray(protos) ? protos.find((p: any) => p.id === selectedDevice.protocolConfigId) : null;
                        if (proto) {
                            setProtocolType(proto.protocolType);
                            if (proto.iec104Config) setAsduAddr(proto.iec104Config.asduAddr);
                        }
                    }
                }
                if (selectedDevice.datasheetProfileId) {
                    const res = await apiRequest(`/api/datasheets?profileId=${selectedDevice.datasheetProfileId}`);
                    if (res.ok) {
                        const result = await res.json();
                        setPoints((result && result.success) ? result.data : (Array.isArray(result) ? result : []));
                    }
                }
            } catch (err) {
                console.error("Fetch points error:", err);
            }
        };
        fetchPoints();
    }, [selectedDevice]);

    // Active status tracker for sorting & Systematic Live Values
    useEffect(() => {
        if (!selectedDevice) {
            setLiveValues(new Map());
            return;
        }

        const handlePacket = (data: any) => {
            if (!data || !selectedDevice) return;
            const incoming = Array.isArray(data) ? data : [data];

            incoming.forEach(pkt => {
                const dataIoa = pkt.ioa !== undefined && pkt.ioa !== null ? Number(pkt.ioa) : null;
                
                // Find all matching points in our datasheet
                const matches = points.filter(p => {
                    // 1. Direct Point ID Match
                    if (pkt.pointId && p.id && String(pkt.pointId) === String(p.id)) return true;

                    // 2. IOA / Address Match
                    if (dataIoa === null || isNaN(dataIoa)) return false;
                    const pointAddrs = [p.address, p.scadaAddress, p.registerAddress, p.ioa1ObjectAddress];
                    return pointAddrs.some(addr => addr !== null && Number(addr) === dataIoa);
                });

                if (matches.length > 0) {
                    setLiveValues(prev => {
                        const next = new Map(prev);
                        matches.forEach(match => {
                            next.set(match.id, {
                                ...pkt,
                                timestamp: pkt.timestamp || new Date().toISOString()
                            });
                        });
                        return next;
                    });
                } else if (dataIoa !== null && !isNaN(dataIoa)) {
                    setUnmatchedValues(prev => {
                        const next = new Map(prev);
                        next.set(dataIoa, {
                            ...pkt,
                            timestamp: pkt.timestamp || new Date().toISOString()
                        });
                        return next;
                    });
                }
            });
        };

        socket.emit('join:protocol', { protocolId: selectedDevice.protocolConfigId });
        socket.on('telemetry:update', handlePacket);
        
        return () => {
            socket.off('telemetry:update', handlePacket);
        };
    }, [selectedDevice, points]);

    const filteredPoints = points
        .filter(p =>
            p.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.signalDescription && p.signalDescription.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            const addrA = a.scadaAddress ?? a.ioa1ObjectAddress ?? a.registerAddress ?? Infinity;
            const addrB = b.scadaAddress ?? b.ioa1ObjectAddress ?? b.registerAddress ?? Infinity;
            return addrA - addrB;
        });

    return (
        <div className="space-y-8 pb-20 animate-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Monitoring Dashboard</h1>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 tracking-widest uppercase font-bold opacity-60">Real-time Telemetry Visualization & Testing</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleFlushQueue}
                        disabled={isFlushing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20 transition-all disabled:opacity-20"
                        title="Clear ghost data from Redis queue"
                    >
                        <Trash2 size={14} /> {isFlushing ? 'CLEARING...' : 'CLEAR QUEUE'}
                    </button>
                    <button
                        onClick={() => setShowConsole(!showConsole)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${showConsole ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                    >
                        <Terminal size={14} /> {showConsole ? 'HIDE' : 'SHOW'} CONSOLE
                    </button>
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                        <SignalHigh size={16} className={`${socketConnected ? 'text-brand-green animate-pulse' : 'text-red-500'}`} />
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                            HUB: {socketConnected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Selection Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/10 p-6 rounded-2xl border border-slate-800/40">
                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Building2 size={12} /> Company Selection
                    </label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all"
                    >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Factory size={12} /> Plant Selection
                    </label>
                    <select
                        value={selectedPlant}
                        onChange={(e) => setSelectedPlant(e.target.value)}
                        disabled={!selectedCompany}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20"
                    >
                        <option value="">Select Plant</option>
                        {plants.map(p => <option key={p.id} value={p.id}>{p.plantName}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                        <Cpu size={12} /> Device Selection
                    </label>
                    <select
                        value={selectedDevice?.id || ''}
                        onChange={(e) => setSelectedDevice(devices.find(d => d.id === e.target.value) || null)}
                        disabled={!selectedPlant}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-green/30 transition-all disabled:opacity-20"
                    >
                        <option value="">Select Device</option>
                        {devices.map(d => <option key={d.id} value={d.id}>{d.deviceName} ({d.deviceType})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-6">
                    {selectedDevice ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 card-base p-4 bg-slate-900/20">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">Active Device</span>
                                        <span className="text-sm font-bold text-white">{selectedDevice.deviceName}</span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-800"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">Protocol Status</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${protocolStatuses[selectedDevice.protocolConfigId] === 'CONNECTED' ? 'bg-brand-green animate-pulse' :
                                                protocolStatuses[selectedDevice.protocolConfigId] === 'ERROR' ? 'bg-red-500' : 'bg-slate-700'
                                                }`}></div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${protocolStatuses[selectedDevice.protocolConfigId] === 'CONNECTED' ? 'text-brand-green' :
                                                protocolStatuses[selectedDevice.protocolConfigId] === 'ERROR' ? 'text-red-500' : 'text-slate-500'
                                                }`}>
                                                {protocolStatuses[selectedDevice.protocolConfigId] || 'OFFLINE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-brand-green/20 text-brand-green' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Layers size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-brand-green/20 text-brand-green' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <TableIcon size={14} />
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search Data Points..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-brand-green/30 w-64 uppercase font-bold text-[10px] tracking-widest"
                                    />
                                </div>
                            </div>

                            {points.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {filteredPoints.map((point) => (
                                                <PointCard
                                                    key={point.id}
                                                    point={point}
                                                    liveData={liveValues.get(point.id)}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <DatasheetLiveTable
                                        points={filteredPoints}
                                        liveValues={liveValues}
                                        protocolType={protocolType}
                                    />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 card-base border-dashed border-slate-800">
                                    <Database size={48} className="text-slate-800 mb-4" />
                                    <p className="text-sm font-bold text-slate-600">No data points mapped for this device.</p>
                                    <p className="text-[10px] text-slate-700 mt-1 uppercase tracking-widest">Connect a datasheet profile to see live telemetry.</p>
                                </div>
                            )}

                            {unmatchedValues.size > 0 && (
                                <div className="space-y-4 pt-8 mt-8 border-t border-slate-900/50">
                                    <h3 className="text-[10px] font-black text-orange-500 tracking-[0.3em] uppercase flex items-center gap-2">
                                        <AlertTriangle size={14} /> Unmatched Signals ({unmatchedValues.size})
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {Array.from(unmatchedValues.entries()).map(([ioa, data]) => (
                                            <div key={ioa} className="bg-slate-950 border border-orange-500/20 rounded-xl p-3 flex flex-col gap-1 hover:border-orange-500/40 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">IOA: {ioa}</span>
                                                    <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse"></div>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-bold text-white tabular-nums">
                                                        {typeof data.value === 'number' ? data.value.toFixed(2) : data.value}
                                                    </span>
                                                    <span className="text-[9px] text-slate-600 font-mono">{data.typeId || ''}</span>
                                                </div>
                                                <span className="text-[8px] text-slate-700 font-mono uppercase mt-1">
                                                    {new Date(data.timestamp).toLocaleTimeString([], { hour12: false })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 card-base bg-slate-950/20 border-dashed border-slate-800">
                            <div className="relative mb-8">
                                <Activity size={80} className="text-slate-900 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Layers size={32} className="text-slate-800" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-black text-slate-700 italic tracking-tight uppercase">Awaiting Target Selection</h3>
                                <p className="text-[10px] text-slate-800 uppercase tracking-[0.5em] font-bold">Initialize uplink protocol to begin monitoring</p>
                            </div>
                        </div>
                    )}

                    {selectedDevice && protocolType === 'IEC104' && (
                        <div className="mt-12 pt-12 border-t border-slate-900">
                            <IECDiagnosticPanel
                                key={selectedDevice.id}
                                protocolId={selectedDevice.protocolConfigId}
                                asduAddr={asduAddr}
                                deviceName={selectedDevice.deviceName}
                                deviceId={selectedDevice.id}
                                devicePoints={points}
                            />
                        </div>
                    )}
                </div>

                <div className={`xl:col-span-1 space-y-6 ${showConsole ? 'block' : 'hidden md:block opacity-20 pointer-events-none'}`}>
                    <div className="sticky top-8 space-y-6">
                        <GlobalStream />
                        <div className="card-base p-6 bg-slate-900/10 space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-2">
                                <Zap size={12} className="text-brand-green" /> Simulation Mode
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                The system is currently generating adaptive telemetry for all active plant nodes to simulate real world behavior.
                            </p>
                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-900">
                                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Simulation Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
