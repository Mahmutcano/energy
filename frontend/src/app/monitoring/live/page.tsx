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
    Terminal
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
    protocol_config_id: string;
    datasheet_profile_id: string;
}

interface DataPoint {
    id: string;
    dataName: string;
    dataValue: string | null;
    registerAddress: number | null;
    scadaAddress: number | null;
    ioa1ObjectAddress: number | null;
    signalDescription: string | null;
    isActive: boolean;
}

// Global Stream Terminal component
const GlobalStream = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const topics = [`telemetry:modbus-sim-device`, `telemetry:RTU_SIM`, `telemetry:iec104-sim-device`];

        const handleData = (data: any) => {
            setLogs(prev => [{
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                message: `[RECV] ID:${data.deviceId?.substring(0, 8) || 'SIM'} ADDR:${data.ioa} VAL:${typeof data.value === 'number' ? data.value.toFixed(2) : data.value}`,
                data
            }, ...prev].slice(0, 20));
        };

        topics.forEach(t => socket.on(t, handleData));
        return () => {
            topics.forEach(t => socket.off(t, handleData));
        };
    }, []);

    return (
        <div className="card-base bg-slate-950 border-slate-900 overflow-hidden flex flex-col h-[300px]">
            <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-brand-green tracking-widest uppercase flex items-center gap-2">
                    <Terminal size={12} /> Console_Output
                </span>
                <span className="text-[9px] font-mono text-slate-700">BAUD: 115200</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-1">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-800 animate-pulse">
                        AWAITING INCOMING DATA PACKETS...
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="text-slate-500 hover:text-brand-green transition-colors">
                            <span className="text-slate-800 mr-2">[{log.time}]</span>
                            {log.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Single Point Card Component
const PointCard = ({ deviceId, point, protocolType }: { deviceId: string, point: DataPoint, protocolType: string }) => {
    const [value, setValue] = useState<number | null>(null);
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        const primaryTopic = `telemetry:${deviceId}`;
        const fallbackTopics = [`telemetry:modbus-sim-device`, `telemetry:RTU_SIM`, `telemetry:iec104-sim-device`];

        const handleData = (data: any) => {
            const isMatch = protocolType === 'MODBUS'
                ? data.ioa === point.registerAddress
                : (data.ioa === point.scadaAddress || data.ioa === point.ioa1ObjectAddress);

            if (isMatch) {
                setValue(current => {
                    setPrevValue(current);
                    return data.value;
                });
                setLastUpdate(new Date());
                setIsLive(true);
            }
        };

        socket.on(primaryTopic, handleData);
        fallbackTopics.forEach(t => socket.on(t, handleData));
        setIsLive(socket.connected);

        return () => {
            socket.off(primaryTopic, handleData);
            fallbackTopics.forEach(t => socket.off(t, handleData));
        };
    }, [deviceId, point, protocolType]);

    const delta = (value !== null && prevValue !== null) ? value - prevValue : 0;
    const isUp = delta >= 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-5 bg-slate-900/30 border-slate-800/40 hover:border-brand-green/30 transition-all flex flex-col justify-between h-40 group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                <SignalHigh size={40} />
            </div>

            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">{point.dataName}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-600 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            ADDR: {protocolType === 'MODBUS' ? point.registerAddress : (point.scadaAddress || point.ioa1ObjectAddress)}
                        </span>
                    </div>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
            </div>

            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">
                    {value !== null ? value.toFixed(2) : '--.--'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 lowercase">{point.dataValue || ''}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/30">
                <div className={`flex items-center gap-1 text-[9px] font-bold ${delta === 0 ? 'text-slate-600' : isUp ? 'text-brand-green' : 'text-danger'}`}>
                    {delta !== 0 && (isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                    <span>{delta === 0 ? 'STABLE' : Math.abs(delta).toFixed(3)}</span>
                </div>
                {lastUpdate && (
                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-slate-600">
                        <Clock size={10} />
                        {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default function LiveMonitoringPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [points, setPoints] = useState<DataPoint[]>([]);

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [protocolType, setProtocolType] = useState<string>('MODBUS');

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConsole, setShowConsole] = useState(true);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await apiRequest('/api/companies');
                if (res.ok) setCompanies(await res.json());
            } catch (err) {
                console.error("Fetch companies error:", err);
            } finally {
                setLoading(false);
            }
        };
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
                    const allPlants = await res.json();
                    setPlants(allPlants.filter((p: any) => p.company_id === selectedCompany));
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
                    const allDevices = await res.json();
                    // Plant filter through protocol_config_id (usually devices belong to plant via protocol)
                    // Let's check how the API returns them
                    setDevices(allDevices.filter((d: any) => d.protocol?.plant?.id === selectedPlant));
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
                if (selectedDevice.protocol_config_id) {
                    const protoRes = await apiRequest('/api/comm-protocols');
                    if (protoRes.ok) {
                        const protos = await protoRes.json();
                        const proto = protos.find((p: any) => p.id === selectedDevice.protocol_config_id);
                        if (proto) setProtocolType(proto.protocolType);
                    }
                }

                if (selectedDevice.datasheet_profile_id) {
                    const res = await apiRequest(`/api/datasheets?profileId=${selectedDevice.datasheet_profile_id}`);
                    if (res.ok) setPoints(await res.json());
                }
            } catch (err) {
                console.error("Fetch points error:", err);
            }
        };
        fetchPoints();
    }, [selectedDevice]);

    const filteredPoints = points.filter(p =>
        p.dataName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-20 animate-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">LIVE COMMAND CENTER</h1>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 tracking-widest uppercase font-bold opacity-60">Real-time Telemetry Visualization & Testing</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowConsole(!showConsole)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${showConsole ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                    >
                        <Terminal size={14} /> {showConsole ? 'HIDE' : 'SHOW'} CONSOLE
                    </button>
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                        <SignalHigh size={16} className="text-brand-green animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 tracking-widest">GATEWAY: ONLINE</span>
                    </div>
                </div>
            </div>

            {/* Selection Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/10 p-6 rounded-2xl border border-slate-800/40">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase ml-1 flex items-center gap-2">
                        <Building2 size={12} /> 01_Company_Scope
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
                    <label className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase ml-1 flex items-center gap-2">
                        <Factory size={12} /> 02_Plant_Node
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
                    <label className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase ml-1 flex items-center gap-2">
                        <Cpu size={12} /> 03_Target_Hardware
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
                {/* Live Dashboard Area */}
                <div className="xl:col-span-3 space-y-6">
                    {selectedDevice ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 card-base p-4 bg-slate-900/20">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-600 tracking-widest uppercase">Active Device</span>
                                        <span className="text-sm font-black text-white">{selectedDevice.deviceName}</span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-800"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-600 tracking-widest uppercase">Protocol</span>
                                        <span className={`text-[10px] font-black ${protocolType === 'MODBUS' ? 'text-blue-400' : 'text-brand-green'}`}>{protocolType} TCP/IP</span>
                                    </div>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {filteredPoints.map((point) => (
                                            <PointCard
                                                key={point.id}
                                                deviceId={selectedDevice.protocol_config_id} // Typically we listen to protocol channel
                                                point={point}
                                                protocolType={protocolType}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 card-base border-dashed border-slate-800">
                                    <Database size={48} className="text-slate-800 mb-4" />
                                    <p className="text-sm font-bold text-slate-600">No data points mapped for this device.</p>
                                    <p className="text-[10px] text-slate-700 mt-1 uppercase tracking-widest">Connect a datasheet profile to see live telemetry.</p>
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
                </div>

                {/* Sidebar Console */}
                <div className={`xl:col-span-1 space-y-6 ${showConsole ? 'block' : 'hidden md:block opacity-20 pointer-events-none'}`}>
                    <div className="sticky top-8 space-y-6">
                        <GlobalStream />

                        <div className="card-base p-6 bg-slate-900/10 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 tracking-widest uppercase flex items-center gap-2">
                                <Zap size={12} className="text-brand-green" /> Simulation_Mode
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                The system is currently coupled with a virtual Modbus Slave on <span className="text-white">port 5020</span>.
                            </p>
                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-900">
                                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Protocol_Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
