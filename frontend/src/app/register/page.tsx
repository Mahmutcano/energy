"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Mail, Lock, User, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(name, email, password);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Kayıt işlemi başarısız. Lütfen bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-950 font-sans selection:bg-brand-green/20 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.05),transparent_40%)] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none"></div>
            <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none"></div>

            {/* Left Branding (Compact for Register) */}
            <div className="hidden lg:flex w-5/12 flex-col p-24 justify-between relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                        <Activity size={32} className="text-brand-green" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter  leading-none">ENERGY</h1>
                        <span className="text-[10px] font-black text-slate-700 tracking-[0.4em]  mt-1 block">SCADA Platform</span>
                    </div>
                </motion.div>

                <div className="space-y-12">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white tracking-tight leading-[1.1] italic "
                    >
                        Join the <br /> <span className="text-brand-green">Industrial Grid.</span>
                    </motion.h2>
                    <div className="space-y-8">
                        {[
                            { title: 'Global Authentication', desc: 'Secure SSO ready authorization for critical nodes.', icon: ShieldCheck },
                            { title: 'Role Mapping', desc: 'Precise authorization for various operator levels.', icon: User },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="flex gap-6 items-start"
                            >
                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-brand-green">
                                    <item.icon size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-white  tracking-widest leading-none">{item.title}</p>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[280px]">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="text-[10px] font-black text-slate-800  tracking-[0.5em] italic">
                    Personnel Management Shell v1.4
                </div>
            </div>

            {/* Right: Registration Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-xl"
                >
                    <div className="card-base p-14 bg-slate-900/40 border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                            <PlusCircle size={320} />
                        </div>

                        <div className="space-y-3 mb-12 relative z-10">
                            <h3 className="text-4xl font-black text-white  tracking-tighter italic">Onboard Personnel</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-tech-label text-slate-600 tracking-[0.2em]">Initialize Authorized Operator Profile</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3 group md:col-span-2">
                                    <label className="text-tech-label ml-1 group-focus-within:text-brand-green transition-colors">Personnel Name</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-green transition-all" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-2xl pl-14 pr-6 text-sm font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900 tracking-wide"
                                            placeholder="Operator Full Identity"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 group md:col-span-2">
                                    <label className="text-tech-label ml-1 group-focus-within:text-brand-green transition-colors">Credential Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-green transition-all" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-2xl pl-14 pr-6 text-sm font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900 tracking-wide"
                                            placeholder="operator@system.io"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 group md:col-span-2">
                                    <label className="text-tech-label ml-1 group-focus-within:text-brand-green transition-colors">Security Password</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-green transition-all" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-2xl pl-14 pr-6 text-sm font-black text-white outline-none focus:border-brand-green/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all placeholder:text-slate-900"
                                            placeholder="Minimum 8 Alpha-Numeric Units"
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
                                    <span className="flex-1">{error}</span>
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
                                        Initialize Registry
                                        <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col items-center gap-4 relative z-10">
                            <p className="text-xs font-black text-slate-600  tracking-widest">
                                Already registered? <Link href="/login" className="text-brand-green hover:underline">Access Authorized Portal</Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
