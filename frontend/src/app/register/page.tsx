"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, UserPlus, Lock, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const { login, isAuthenticated, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, loading, router]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name, role: 'CUSTOMER' }),
            });

            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                router.push('/');
            } else {
                setError(data.message || 'Kayıt başarısız');
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
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-xl space-y-8 relative z-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-5 rounded-[2.5rem] bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-500 shadow-2xl border border-white/5 mx-auto">
                        <ShieldAlert size={48} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black italic text-white tracking-tighter">
                            SCADA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">SECURE</span>
                        </h1>
                        <p className="text-slate-500 mt-3 font-medium text-lg">Create your secure gateway access</p>
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleRegister} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Operator Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="operator_id_01"
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating Account...' : (
                                <>
                                    <UserPlus size={22} />
                                    Create Identity
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 font-bold mb-4">Already have an authorized identity?</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-xs hover:text-blue-400 transition-colors group"
                        >
                            Log in to secure terminal
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
