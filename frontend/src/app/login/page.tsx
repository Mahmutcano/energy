"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Mail, Lock, ArrowRight, Shield, Cpu, Terminal as TerminalIcon, Radio, Globe, Zap, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const { login } = useAuth();
    const router = useRouter();

    const logs = [
        "Sistem başlatılıyor X-SCADA v2.0.4...",
        "AES-256 üzerinden güvenli bağlantı kuruluyor...",
        "Uzak istasyon kümeleri taranıyor [Bölge-1, Bölge-2]...",
        "Veri bütünlüğü doğrulandı. Hash: 0x8F2D4A...",
        "Protokol el sıkışması: MODBUS/TCP kuruldu.",
        "Bağlantı durumu: MÜKEMMEL. Gecikme: 12ms.",
        "Operatör kimlik doğrulaması bekleniyor...",
        "Sistem şifreli oturum başlatmaya hazır."
    ];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString('tr-TR')}] ${logs[i % logs.length]}`].slice(-10));
            i++;
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);
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
        <div className="min-h-screen w-full flex bg-grafana-bg font-sans selection:bg-grafana-accent-blue/20 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(87,148,242,0.05),transparent_40%)] pointer-events-none"></div>
            <div className="absolute inset-0 dot-bg opacity-20 pointer-events-none"></div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
                <div className="w-full h-2 bg-white animate-scanline"></div>
            </div>

            {/* Left: Branding & Visuals */}
            <div className="hidden lg:flex w-7/12 items-center justify-center p-16 xl:p-24 relative border-r border-grafana-border overflow-hidden">
                <div className="relative z-10 w-full max-w-2xl space-y-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-8"
                    >
                        <div className="p-8 bg-grafana-panel border border-grafana-border rounded-sm shadow-2xl relative group overflow-hidden">
                            <div className="absolute inset-0 bg-grafana-accent-blue/5 animate-pulse" />
                            <Activity size={56} className="text-grafana-accent-blue relative z-10 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 bg-grafana-accent-blue text-white text-[9px] font-bold rounded-sm font-mono tracking-widest animate-pulse">KİLİTLİ</span>
                                <span className="text-[10px] font-bold text-grafana-accent-blue uppercase tracking-[0.6em] font-mono">Operasyon Platformu</span>
                            </div>
                            <h1 className="text-6xl font-black text-white tracking-tighter uppercase font-sans leading-none">
                                X-SCADA <span className="text-grafana-text-secondary font-light">MERKEZ</span>
                            </h1>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-6 col-span-2"
                        >
                            <h2 className="text-4xl font-bold text-grafana-text-primary leading-tight tracking-tight uppercase max-w-lg">
                                Endüstriyel <br /> <span className="text-grafana-accent-blue">Telemetri Yönetimi.</span>
                            </h2>
                            <p className="text-sm text-grafana-text-secondary leading-relaxed font-mono max-w-md">
                                Küresel enerji ağları için yüksek hassasiyetli izleme. Güvenli, düşük gecikmeli ve kritik altyapılar için tasarlandı.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="col-span-2 p-6 bg-grafana-panel/40 border border-grafana-border rounded-sm font-mono space-y-3 relative overflow-hidden group shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-grafana-border/50 pb-3">
                                <div className="flex items-center gap-2">
                                    <TerminalIcon size={14} className="text-grafana-accent-blue" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Canlı Sistem Günlüğü</span>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-red/50" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-orange/50" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green/50" />
                                </div>
                            </div>
                            <div className="space-y-1.5 h-40 overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                    {terminalLines.map((line, idx) => (
                                        <motion.p
                                            key={line + idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-[10px] text-grafana-accent-blue/80"
                                        >
                                            <span className="text-grafana-text-secondary pr-2">»</span>
                                            {line}
                                        </motion.p>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {[
                            { label: 'Ağ Güvenliği', val: 'AES-256-GCM', icon: Globe },
                            { label: 'Gecikme', val: '< 15ms Ort.', icon: Zap },
                        ].map((item, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                key={i}
                                className="p-5 bg-grafana-panel/50 border border-grafana-border rounded-sm hover:border-grafana-accent-blue/30 transition-all group"
                            >
                                <div className="flex items-center gap-2 mb-3 text-grafana-accent-blue">
                                    <item.icon size={14} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono">{item.label}</span>
                                </div>
                                <p className="text-sm font-bold text-white font-mono uppercase">{item.val}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 p-12 opacity-10">
                    <Database size={120} className="text-grafana-accent-blue" />
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-8 relative z-10 bg-grafana-bg lg:bg-grafana-panel/20 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <div className="bg-grafana-panel border border-grafana-border p-12 rounded-sm shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        {/* Technical corner accents */}
                        <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-grafana-accent-blue/20 m-2" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-grafana-accent-blue/20 m-2" />

                        <div className="mb-12 text-center">
                            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-grafana-bg border border-grafana-border rounded-full">
                                <Radio size={12} className="text-grafana-accent-green animate-pulse" />
                                <span className="text-[9px] font-bold text-grafana-accent-green uppercase tracking-[0.3em] font-mono">Sunucu Aktif</span>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-3 font-sans">Kimlik Doğrulama</h3>
                            <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">Kısıtlı Erişim Protokolü</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-5">
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono ml-1">Operatör Girişi</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary/40 group-focus-within:text-grafana-accent-blue transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-14 bg-grafana-bg border border-grafana-border rounded-sm pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-bg/80 transition-all font-mono placeholder:text-grafana-text-secondary/20 shadow-inner"
                                            placeholder="KULLANICI ADI"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono ml-1">Erişim Anahtarı</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-grafana-text-secondary/40 group-focus-within:text-grafana-accent-blue transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-14 bg-grafana-bg border border-grafana-border rounded-sm pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-bg/80 transition-all font-mono placeholder:text-grafana-text-secondary/20 shadow-inner"
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-4 bg-grafana-accent-red/10 border border-grafana-accent-red/30 text-grafana-accent-red rounded-sm text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-3"
                                >
                                    <Shield size={16} />
                                    <span>Hata: {error}</span>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 disabled:opacity-50 font-mono shadow-[0_0_20px_rgba(87,148,242,0.3)] active:scale-95 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Oturum Aç
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-grafana-border text-center">
                            <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono">
                                Personel değil misiniz? <Link href="/register" className="text-grafana-accent-blue hover:text-white transition-colors underline underline-offset-4">Kayıt Olun</Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 text-center opacity-30">
                        <p className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.5em] font-mono">X-SCADA KURUMSAL SİSTEM v2.0.4</p>
                    </div>
                </motion.div>
            </div>

            <style jsx global>{`
                @keyframes scanline {
                    0% { top: -5%; }
                    100% { top: 105%; }
                }
                .animate-scanline {
                    position: absolute;
                    width: 100%;
                    height: 100px;
                    background: linear-gradient(to bottom, transparent, rgba(87, 148, 242, 0.05), transparent);
                    animation: scanline 8s linear infinite;
                }
                .dot-bg {
                    background-image: radial-gradient(circle at 1px 1px, #1a1a1a 1px, transparent 0);
                    background-size: 40px 40px;
                }
            `}</style>
        </div>
    );
}
