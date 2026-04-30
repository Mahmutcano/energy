"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { ArrowUpRight, ArrowDownRight, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RealtimeCardProps {
    commProtocolId: string;
    label: string;
    unit: string;
}

export default function RealtimeCard({ commProtocolId, label, unit }: RealtimeCardProps) {
    const [value, setValue] = useState<number | null>(null);
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [isLive, setIsLive] = useState(socket.connected);

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

        return () => {
            socket.off(topic, handleData);
        };
    }, [commProtocolId]);

    const delta = (value !== null && prevValue !== null) ? value - prevValue : 0;
    const isUp = delta >= 0;

    return (
        <div className="card-base p-4 flex flex-col justify-between h-40 group relative overflow-hidden bg-grafana-panel border-grafana-border">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-grafana-accent-blue/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-grafana-accent-blue/10 transition-all duration-700" />

            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-0.5">
                    <span className="text-tech-label font-mono text-grafana-text-secondary leading-none">
                        {label}
                    </span>
                    <span className="text-[10px] font-bold text-grafana-text-secondary/40 uppercase tracking-[0.2em] font-mono">
                        ID: {commProtocolId.substring(0, 8)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "status-indicator",
                        isLive ? "bg-grafana-accent-green shadow-[0_0_8px_#73bf69] animate-pulse" : "bg-grafana-text-secondary/30"
                    )} />
                </div>
            </div>

            {/* Value Section */}
            <div className="relative z-10 mt-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-baseline gap-2"
                    >
                        <span className="text-3xl font-bold tracking-tighter text-grafana-text-primary tabular-nums font-mono">
                            {value !== null ? value.toFixed(2) : '--.--'}
                        </span>
                        <span className="text-sm font-bold text-grafana-accent-blue/80 tracking-widest font-mono">
                            {unit}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / Trend */}
            <div className="flex items-center justify-between pt-3 border-t border-grafana-border/50 relative z-10">
                <div className={cn(
                    "flex items-center gap-1.5 font-bold text-[10px] tracking-widest font-mono",
                    isUp ? "text-grafana-accent-green" : "text-grafana-accent-red"
                )}>
                    {isUp ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                    <span className="tabular-nums">{(Math.abs(delta) || 0).toFixed(4)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-grafana-text-secondary/50 group-hover:text-grafana-accent-blue transition-colors">
                    <Activity size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Live</span>
                </div>
            </div>

            {/* Bottom Progress Bar (Technical aesthetic) */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-grafana-border/50">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isLive ? '100%' : '0%' }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="h-full bg-grafana-accent-blue/30 shadow-[0_0_5px_#5794f2]"
                />
            </div>
        </div>
    );
}

