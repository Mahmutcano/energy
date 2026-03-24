"use client";

import React, { useState, useEffect } from 'react';
import {
    Database,
    Link as LinkIcon,
    ArrowRight,
    Activity,
    ShieldCheck,
    Building2,
    Factory,
    Network,
    Cpu,
    FileText,
    Hash,
    RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion } from 'framer-motion';

interface SchemaNode {
    id: string;
    name: string;
    count: number;
    icon: string;
    color: string;
    relations: string[];
}

const ICON_MAP: Record<string, any> = {
    ShieldCheck,
    Building2,
    Factory,
    Network,
    Cpu,
    FileText,
    Hash,
    Activity
};

export default function DatabasePage() {
    const [schema, setSchema] = useState<SchemaNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSchema = async () => {
        setRefreshing(true);
        try {
            const res = await apiRequest('/api/system/schema-stats');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                setSchema(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch schema:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSchema();
        // Auto refresh every 30 seconds
        const interval = setInterval(fetchSchema, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-10 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight ">Database Explorer</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-6">Live visual mapping of system relations and data architecture</p>
                </div>

                <button
                    onClick={fetchSchema}
                    disabled={refreshing}
                    className="flex items-center gap-3 px-6 py-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Manual Refresh'}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {schema.map((node, i) => {
                        const IconComp = ICON_MAP[node.icon] || Database;
                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="card-base p-6 bg-slate-900/40 relative group"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-xl"
                                            style={{ color: node.color }}
                                        >
                                            <IconComp size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white tracking-tight">{node.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase">{node.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black tabular-nums text-white" style={{ textShadow: `0 0 20px ${node.color}40` }}>
                                            {node.count.toLocaleString()}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Records</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <LinkIcon size={12} className="text-slate-600" />
                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Outbound Connections</span>
                                    </div>
                                    {node.relations.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {node.relations.map(rel => (
                                                <div
                                                    key={rel}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950/50 border border-slate-800/60 rounded-lg text-[10px] font-bold text-slate-400 group-hover:border-slate-700 transition-colors"
                                                >
                                                    <ArrowRight size={10} className="text-brand-green/60" />
                                                    {rel}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-700 italic">No downstream relations</p>
                                    )}
                                </div>

                                {/* Flow Decorator */}
                                <div className="absolute -bottom-px left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Visual Connections Diagram Section */}
            <div className="mt-16 card-base p-8 bg-slate-900/20 dot-bg">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <Activity size={20} className="text-brand-green" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight underline decoration-brand-green/30 decoration-2 underline-offset-4">System Map Architecture</h3>
                        <p className="text-[10px] text-slate-600 mt-0.5">Hierarchical flow of data within X-SCADA</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-8 py-10">
                    {/* Simplified Visual Logic */}
                    <div className="flex gap-20 items-center justify-center flex-wrap">
                        <SchemaMiniNode icon={Building2} label="Company" color="#f59e0b" />
                        <ArrowConnector />
                        <SchemaMiniNode icon={Factory} label="Plant" color="#3b82f6" />
                        <ArrowConnector />
                        <SchemaMiniNode icon={Network} label="Protocol" color="#8b5cf6" />
                        <ArrowConnector />
                        <SchemaMiniNode icon={Cpu} label="Device" color="#10b981" />
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="flex gap-20 items-center justify-center flex-wrap">
                        <div className="w-[120px]" />
                        <SchemaMiniNode icon={FileText} label="Profile" color="#ec4899" />
                        <ArrowConnector />
                        <SchemaMiniNode icon={Hash} label="Data Point" color="#6366f1" />
                        <ArrowConnector />
                        <SchemaMiniNode icon={Activity} label="Telemetry" color="#ef4444" />
                    </div>
                </div>
            </div>

            <footer className="pt-8 border-t border-border/40 text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">X-SCADA Logic Core Engine v1.0 • Live Architecture Sync Active</p>
            </footer>
        </div>
    );
}

function SchemaMiniNode({ icon: Icon, label, color }: any) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl relative group overflow-hidden"
                style={{ color }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <Icon size={24} />
                <div className="absolute bottom-0 left-0 w-full h-[2px] opacity-20" style={{ backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
    );
}

function ArrowConnector() {
    return (
        <div className="flex items-center text-slate-800">
            <div className="w-10 h-px bg-slate-800" />
            <ArrowRight size={10} />
            <div className="w-10 h-px bg-slate-800" />
        </div>
    );
}
