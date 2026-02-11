"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, Mail, Lock, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, loading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                router.push('/');
            } else {
                setError(data.message || 'Giriş başarısız');
            }
        } catch (err) {
            setError('Sunucuya bağlanılamadı');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-lg space-y-12 relative z-10">
                <div className="text-center space-y-6">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative inline-flex p-6 rounded-[2.5rem] bg-slate-900 border border-white/5 text-blue-500 shadow-2xl">
                            <ShieldAlert size={56} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-6xl font-black italic text-white tracking-tighter">
                            SCADA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">SECURE</span>
                        </h1>
                        <p className="text-slate-500 mt-4 font-medium text-lg tracking-wide uppercase">Industrial Identity Terminal</p>
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                    <form onSubmit={handleLogin} className="space-y-8">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black ml-2">Encrypted ID (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={22} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="operator@scada.system"
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-3xl py-6 pl-16 pr-6 text-white placeholder:text-slate-800 focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center ml-2">
                                <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Private Key</label>
                                <button type="button" className="text-[10px] uppercase tracking-widest text-blue-600 font-black hover:text-blue-400 transition-colors">Emergency Reset</button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={22} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-3xl py-6 pl-16 pr-6 text-white placeholder:text-slate-800 focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 transition-all outline-none"
                                    required
                                />
                                <Zap className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-blue-500/30 active:scale-[0.97] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {isLoading ? 'Decrypting Access...' : (
                                <>
                                    <LogIn size={24} />
                                    Authenticate Terminal
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-6">
                        <p className="text-slate-600 font-bold">New system operator?</p>
                        <Link
                            href="/register"
                            className="group flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-slate-300 font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Request New Access Grant
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-blue-500" />
                        </Link>
                    </div>
                </div>

                <p className="text-center text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">
                    End-to-End Encrypted Industrial Protocol
                </p>
            </div>
        </div>
    );
}
