"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RealtimeCardProps {
    commProtocolId: string;
    label: string;
    unit: string;
}

export default function RealtimeCard({ commProtocolId, label, unit }: RealtimeCardProps) {
    const [value, setValue] = useState<number | null>(null);
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const topic = `telemetry:${commProtocolId}`;

        const handleData = (data: { value: number }) => {
            setValue(current => {
                setPrevValue(current);
                return data.value;
            });
            setIsLive(true);
        };

        socket.on(topic, handleData);
        socket.on('connect', () => setIsLive(true));
        socket.on('disconnect', () => setIsLive(false));
        setIsLive(socket.connected);

        return () => {
            socket.off(topic, handleData);
        };
    }, [commProtocolId]);

    const delta = (value !== null && prevValue !== null) ? value - prevValue : 0;
    const isUp = delta >= 0;

    return (
        <div className="card-base p-6 flex flex-col justify-between h-48 group dot-bg">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-green/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-brand-green/10 transition-colors" />

            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-950/50 text-slate-500 border border-slate-800/50 group-hover:text-brand-green group-hover:border-brand-green/30 transition-all">
                        <Zap size={14} />
                    </div>
                    <span className="text-tech-label">{label}</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/60 border border-slate-800/50">
                    <div className={`status-indicator ${isLive ? 'bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{isLive ? 'Live' : 'Offline'}</span>
                </div>
            </div>

            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-baseline gap-2"
                    >
                        <span className="text-tech-value text-4xl">
                            {value !== null ? value.toFixed(2) : '--.--'}
                        </span>
                        <span className="text-xs font-black text-brand-green/60 uppercase tracking-widest">{unit}</span>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40 relative z-10">
                <div className={`flex items-center gap-2 font-black text-[10px] tracking-widest ${isUp ? 'text-brand-green' : 'text-danger'}`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="tabular-nums">{(Math.abs(delta) || 0).toFixed(3)}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-950/60 text-[8px] font-mono font-bold text-slate-500 border border-slate-800/50 uppercase tracking-tighter truncate max-w-[100px]">
                    {commProtocolId.substring(0, 8)}
                </div>
            </div>
        </div>
    );
}
