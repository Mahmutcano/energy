"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);
            // Redirect based on role
            if (user?.role === 'NORMAL_USER') {
                router.push('/customer');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Kimlik doğrulama başarısız. Lütfen bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-950 font-sans selection:bg-brand-green/20 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.05),transparent_40%)] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none"></div>
            <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none"></div>

            {/* Left: Branding & Visuals (Hidden on small screens) */}
            <div className="hidden lg:flex w-7/12 items-center justify-center p-24 relative">
                <div className="relative z-10 max-w-xl space-y-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-6"
                    >
                        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative group">
                            <div className="absolute inset-0 bg-brand-green/10 blur-2xl rounded-full group-hover:bg-brand-green/20 transition-all opacity-0 group-hover:opacity-100"></div>
                            <Activity size={56} className="text-brand-green relative z-10" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black text-white tracking-tighter  italic leading-none">ENERGY</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-tech-label text-brand-green tracking-[0.4em]">SCADA Platform</span>
                                <div className="h-px w-8 bg-slate-800"></div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-8"
                    >
                        <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight italic ">Elite Control for Global Energy Grids.</h2>
                        <p className="text-lg text-slate-500 leading-relaxed font-medium">Secure, high-precision SCADA infrastructure for monitoring complex telemetry and industrial operations in real-time. Engineered for 99.999% uptime.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 gap-8"
                    >
                        {[
                            { label: 'Network', val: 'AES-256 GCM', sub: 'High Security' },
                            { label: 'Uplink', val: 'Modbus TCP', sub: 'Low Latency' },
                        ].map((item, i) => (
                            <div key={i} className="card-base p-6 bg-slate-900/40 border-slate-800/60">
                                <p className="text-tech-label mb-2">{item.label}</p>
                                <p className="text-xl font-black text-white italic tracking-tight">{item.val}</p>
                                <p className="text-[10px] text-slate-600 font-bold  mt-2 tracking-widest">{item.sub}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <div className="card-base p-12 bg-slate-900/40 border-slate-800 shadow-2xl backdrop-blur-xl">
                        <div className="space-y-3 mb-12">
                            <h3 className="text-3xl font-black text-white  tracking-tighter italic">Access Node</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-tech-label text-slate-600 tracking-[0.2em]">Operator Identification Required</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-3 group">
                                    <label className="text-tech-label ml-1 group-focus-within:text-brand-green transition-colors">Endpoint Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-green transition-all" />
                                        <input
                                            type="text"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-2xl pl-14 pr-6 text-sm font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900 tracking-wide"
                                            placeholder="operator@system.io"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-tech-label ml-1 group-focus-within:text-brand-green transition-colors">Access Pin</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-green transition-all" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-2xl pl-14 pr-6 text-sm font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 bg-danger/5 border border-danger/20 text-danger rounded-2xl text-[11px] font-black  tracking-tight flex items-start gap-4"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                    <span className="flex-1 leading-relaxed">{error}</span>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-brand-green text-white rounded-2xl shadow-2xl shadow-brand-green/20 font-black  tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Initialize Auth
                                        <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col items-center gap-4">
                            <p className="text-xs font-black text-slate-600  tracking-widest">
                                New unit? <Link href="/register" className="text-brand-green hover:underline">Register Personnel</Link>
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="h-px w-8 bg-slate-800"></div>
                                <span className="text-[10px] font-mono text-slate-800  tracking-widest">Kernel Shell v1.4</span>
                                <div className="h-px w-8 bg-slate-800"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
