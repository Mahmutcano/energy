"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Mail, Lock, User, ArrowRight, ShieldCheck, Database, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
            setError(err.message || 'Registration failed. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-grafana-bg font-sans selection:bg-grafana-accent-blue/20 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(115,191,105,0.03),transparent_40%)] pointer-events-none"></div>
            <div className="absolute inset-0 dot-bg opacity-20 pointer-events-none"></div>

            {/* Left Branding */}
            <div className="hidden lg:flex w-5/12 flex-col p-24 justify-between relative z-10 border-r border-grafana-border bg-grafana-panel/10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="p-4 bg-grafana-panel border border-grafana-border rounded-sm shadow-xl">
                        <Activity size={32} className="text-grafana-accent-green" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-grafana-text-primary tracking-tighter uppercase font-sans leading-none">
                            X-SCADA
                        </h1>
                        <span className="text-[10px] font-bold text-grafana-accent-green uppercase tracking-[0.4em] mt-1 block font-mono">Registry Node</span>
                    </div>
                </motion.div>

                <div className="space-y-12">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-bold text-grafana-text-primary tracking-tight leading-tight uppercase font-sans"
                    >
                        Initialize Your <br /> <span className="text-grafana-accent-green">Operator Profile.</span>
                    </motion.h2>
                    <div className="space-y-6">
                        {[
                            { title: 'Secure Onboarding', desc: 'Enterprise-grade encryption for personnel credentials.', icon: ShieldCheck },
                            { title: 'Role Distribution', desc: 'Granular access control based on operational duty.', icon: User },
                            { title: 'Global Sync', desc: 'Instant propagation across all monitoring nodes.', icon: Server },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="flex gap-4 items-start"
                            >
                                <div className="p-3 bg-grafana-panel border border-grafana-border rounded-sm text-grafana-accent-green">
                                    <item.icon size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-widest font-mono leading-none">{item.title}</p>
                                    <p className="text-[11px] text-grafana-text-secondary font-mono leading-relaxed max-w-[280px]">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="text-[9px] font-bold text-grafana-text-secondary/40 uppercase tracking-[0.5em] font-mono">
                    System Registry v2.0.4
                </div>
            </div>

            {/* Right: Registration Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-8 relative z-10 bg-grafana-panel/20 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg"
                >
                    <div className="bg-grafana-panel border border-grafana-border p-12 rounded-sm shadow-2xl relative overflow-hidden">
                         {/* Technical corner accents */}
                        <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-grafana-accent-green/30 m-2" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b border-l border-grafana-accent-green/30 m-2" />

                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-grafana-text-primary uppercase tracking-[0.2em] mb-2 font-sans">Personnel Enrollment</h3>
                            <div className="h-px w-16 bg-grafana-accent-green mb-4" />
                            <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Create new operational credentials</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 group md:col-span-2">
                                    <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Identity Name</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary/50 group-focus-within:text-grafana-accent-green transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm pl-12 pr-4 text-xs font-bold text-grafana-text-primary outline-none focus:border-grafana-accent-green/50 transition-all font-mono placeholder:text-grafana-text-secondary/30"
                                            placeholder="OPERATOR_FULL_NAME"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group md:col-span-2">
                                    <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Primary Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary/50 group-focus-within:text-grafana-accent-green transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm pl-12 pr-4 text-xs font-bold text-grafana-text-primary outline-none focus:border-grafana-accent-green/50 transition-all font-mono placeholder:text-grafana-text-secondary/30"
                                            placeholder="ENDPOINT_EMAIL"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group md:col-span-2">
                                    <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Security Key (Passphrase)</label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary/50 group-focus-within:text-grafana-accent-green transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm pl-12 pr-4 text-xs font-bold text-grafana-text-primary outline-none focus:border-grafana-accent-green/50 transition-all font-mono placeholder:text-grafana-text-secondary/30"
                                            placeholder="ENCRYPTION_KEY"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red rounded-sm text-[9px] font-bold uppercase tracking-widest font-mono">
                                    Error: {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-grafana-accent-green hover:bg-grafana-accent-green/90 text-grafana-bg rounded-sm font-bold uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 font-mono shadow-[0_0_15px_rgba(115,191,105,0.2)]"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-grafana-bg/20 border-t-grafana-bg rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Initialize Registry
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 pt-8 border-t border-grafana-border text-center">
                            <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">
                                Already in system? <Link href="/login" className="text-grafana-accent-green hover:underline">Access Authorized Portal</Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

