"use client";

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface RealtimeCardProps {
    deviceId: string;
    ioa: number;
    label: string;
    unit: string;
    color?: string;
}

export default function RealtimeCard({ deviceId, ioa, label, unit, color = "blue" }: RealtimeCardProps) {
    const [value, setValue] = useState<number | null>(null);
    const [prevValue, setPrevValue] = useState<number | null>(null);

    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on(`telemetry:${deviceId}:${ioa}`, (data: { value: number }) => {
            setValue(prevValue => {
                setPrevValue(prevValue);
                return data.value;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [deviceId, ioa]);

    const diff = (value && prevValue) ? value - prevValue : 0;
    const colorClasses: Record<string, string> = {
        blue: "text-blue-400 border-blue-500/30 bg-blue-500/5",
        emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
        amber: "text-amber-400 border-amber-500/30 bg-amber-500/5",
        cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
        orange: "text-orange-400 border-orange-500/30 bg-orange-500/5",
        yellow: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    };

    const colorClass = colorClasses[color] || colorClasses.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl border backdrop-blur-sm ${colorClass}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-400">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold tracking-tight text-white italic">
                            {value !== null ? value.toFixed(2) : '--.--'}
                        </h3>
                        <span className="text-lg font-medium text-slate-500">{unit}</span>
                    </div>
                </div>
                <div className={`p-2 rounded-lg bg-slate-900/50`}>
                    <Activity className={`h-5 w-5 ${colorClass.split(' ')[0]}`} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                {diff >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                )}
                <span className={`text-xs font-semibold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {Math.abs(diff).toFixed(3)}
                </span>
                <span className="text-xs text-slate-600 font-medium">Since last update</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <span>IOA: {ioa}</span>
                <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LIVE
                </span>
            </div>
        </motion.div>
    );
}
