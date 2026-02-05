"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Simple mock routing based on input for demo purposes
        if (email === 'super@scada.com') {
            router.push('/admin/system');
        } else if (email === 'admin@customer.com') {
            router.push('/admin/customer');
        } else {
            router.push('/');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-500 mb-6">
                        <ShieldAlert size={40} />
                    </div>
                    <h1 className="text-4xl font-black italic text-white tracking-tight">
                        SCADA <span className="text-blue-500">SECURE</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Log in to manage industrial infrastructure</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] shadow-2xl backdrop-blur-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-slate-500 font-black ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="super@scada.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-slate-500 font-black ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <LogIn size={20} />
                            Authenticate
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-black text-center mb-2">Internal Mock Credentials</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setEmail('super@scada.com'); setPassword('admin123'); }}
                                className="py-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-400 font-bold hover:border-blue-500/30 transition-all"
                            >
                                SUPER ADMIN
                            </button>
                            <button
                                onClick={() => { setEmail('admin@customer.com'); setPassword('admin123'); }}
                                className="py-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-400 font-bold hover:border-emerald-500/30 transition-all"
                            >
                                CUSTOMER ADMIN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
