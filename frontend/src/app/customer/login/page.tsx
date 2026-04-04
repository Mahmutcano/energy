"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Zap, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function CustomerLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push('/customer');
        }
    }, [isAuthenticated, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(email, password);
            toast.success('Access Granted');
            router.push('/customer');
        } catch (err: any) {
            toast.error(err.message || 'Verification Failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-neon-blue/30 selection:text-white">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 bg-volt-grid opacity-10 pointer-events-none" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-orange/10 blur-[120px] rounded-full pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Brand Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-blue/50 p-0.5 shadow-[0_0_30px_rgba(0,229,255,0.3)] mb-6"
                    >
                        <div className="w-full h-full bg-[#05080F] rounded-[14px] flex items-center justify-center text-neon-blue">
                             <Activity size={32} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                    </motion.div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">VoltMetric <span className="text-neon-blue">PRO</span></h1>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Corporate Energy Portal</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#0A0E17]/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                     {/* Decorative lines */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-right from-transparent via-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-right from-transparent via-white/10 to-transparent" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Authentication Key (Email)</label>
                            <div className="relative group/input">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-neon-blue transition-colors" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="corporate@voltmetric.com"
                                    className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-white/10 outline-none focus:border-neon-blue/30 focus:bg-white/[0.05] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Access Protocol (Password)</label>
                            <div className="relative group/input">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-neon-blue transition-colors" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-white/10 outline-none focus:border-neon-blue/30 focus:bg-white/[0.05] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="hidden" />
                                <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-blue/30 transition-all">
                                     <div className="w-1.5 h-1.5 rounded-full bg-neon-blue opacity-0 group-hover:opacity-40 transition-all" />
                                </div>
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Remember Me</span>
                            </label>
                            <a href="#" className="text-[10px] font-bold text-neon-blue/60 hover:text-neon-blue transition-all uppercase tracking-widest">System Recovery?</a>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-neon-blue text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isLoading ? 'Verifying...' : 'Initialize Access'}
                            <ArrowRight size={16} strokeWidth={3} />
                        </button>
                    </form>
                </div>

                {/* Status Footer */}
                <div className="mt-10 flex items-center justify-center gap-8 opacity-20">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-neon-lime" />
                        <span className="text-[8px] font-bold text-white uppercase tracking-widest">SSL Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-neon-orange" />
                        <span className="text-[8px] font-bold text-white uppercase tracking-widest">Enterprise OS</span>
                    </div>
                </div>
            </motion.div>

            {/* Global Styles for separate project look */}
            <style jsx global>{`
                .bg-volt-grid {
                    background-image: 
                      linear-gradient(to right, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                .text-neon-blue { color: #00E5FF; }
                .bg-neon-blue { background-color: #00E5FF; }
                .text-neon-orange { color: #FF3300; }
                .text-neon-lime { color: #CCFF00; }
            `}</style>
        </div>
    );
}
