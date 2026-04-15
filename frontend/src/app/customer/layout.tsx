"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { 
    Activity, 
    Cpu, 
    LogOut, 
    BarChart3, 
    Database, 
    Zap, 
    Layers, 
    ShieldAlert,
    Menu,
    Search,
    FileText,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const { user, companyProfile, loading, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const currentCat = searchParams.get('cat') || 'voltage';

    const isLoginPage = pathname === '/customer/login';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isLoginPage) {
            router.push('/customer/login');
        }
    }, [isAuthenticated, loading, isLoginPage, router]);

    const navItems = useMemo(() => [
        { group: 'TESİS İZLEME', items: [
            { name: 'Gerilim', href: '/customer?cat=voltage', icon: Zap, color: '#22d3ee' },
            { name: 'Akım', href: '/customer?cat=current', icon: Activity, color: '#34d399' },
            { name: 'Güç', href: '/customer?cat=power', icon: BarChart3, color: '#fb7185' },
            { name: 'Enerji', href: '/customer?cat=energy', icon: Layers, color: '#a78bfa' },
            { name: 'Kalite', href: '/customer?cat=quality', icon: ShieldAlert, color: '#fbbf24' },
            { name: 'Sistem', href: '/customer?cat=system', icon: Cpu, color: '#818cf8' },
        ]},
        { group: 'ANALİZ & VERİ', items: [
            { name: 'Raporlar', href: '/customer/reports', icon: BarChart3, color: '#94a3b8' },
            { name: 'Kayıtlar', href: '/customer/logs', icon: Database, color: '#94a3b8' },
            { name: 'Veri yapıları', href: '/customer/datasheets', icon: FileText, color: '#94a3b8' },
        ]}
    ], []);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#0c1222] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-emerald-400/80" />
                    </div>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 tracking-wide">Oturum yükleniyor</p>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    const linkIsActive = (href: string) => {
        if (href.startsWith('/customer?')) {
            const q = href.split('?')[1] || '';
            const cat = new URLSearchParams(q).get('cat') || 'voltage';
            return pathname === '/customer' && currentCat === cat;
        }
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <div className="relative min-h-screen text-[#e2e8f0] font-sans flex overflow-hidden bg-[#0a0c10] selection:bg-blue-500/30 selection:text-white">
            {/* Atmospheric background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-slate-800/10 blur-[100px]" />
            </div>

            <motion.aside 
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="relative z-[100] h-screen flex flex-col border-r border-white/5 bg-[#070d1f]/95 backdrop-blur-2xl shadow-[10px_0_40px_rgba(0,0,0,0.6)]"
            >
                <div className={cn(
                    "h-16 flex items-center gap-3 px-6 border-b border-white/[0.04]",
                    !isSidebarOpen && "justify-center px-2"
                )}>
                    <div className="relative shrink-0">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded bg-slate-800 border border-white/10">
                            <Activity size={16} className="text-blue-400" />
                        </div>
                    </div>
                    {isSidebarOpen && (
                        <div className="flex min-w-0 flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-white">
                                ENERGY SCADA
                            </span>
                            <h1 className="truncate text-[10px] font-medium text-slate-500">
                                {companyProfile?.name || "INDUSTRIAL_HUB"}
                            </h1>
                        </div>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide">
                    {navItems.map((group) => (
                        <div key={group.group}>
                            {isSidebarOpen && (
                                <p className="mb-4 px-2 text-[9px] font-black uppercase tracking-[0.25em] text-neutral-600">
                                    {group.group}
                                </p>
                            )}
                            <div className="space-y-1.5">
                                {group.items.map((item) => {
                                    const active = linkIsActive(item.href);
                                    return (
                                        <Link
                                            key={item.name + item.href}
                                            href={item.href}
                                            className={cn(
                                                "group relative flex items-center gap-4 rounded px-3 py-2 transition-all duration-200",
                                                active
                                                    ? "bg-slate-800/80 text-white shadow-sm ring-1 ring-white/10"
                                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                                            )}
                                        >
                                            <item.icon
                                                size={16}
                                                className={cn(
                                                    "shrink-0 transition-colors",
                                                    active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                                                )}
                                                strokeWidth={2}
                                            />
                                            {isSidebarOpen && (
                                                <span className="text-xs font-medium tracking-tight">{item.name}</span>
                                            )}
                                            {active && isSidebarOpen && (
                                                <div className="ml-auto w-1 h-3 rounded-full bg-blue-500" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-white/5 bg-black/40 p-4">
                    <button 
                        type="button"
                        onClick={logout}
                        className={cn(
                            "flex h-11 w-full items-center justify-center gap-3 rounded-md text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-all hover:bg-red-500/10 hover:text-red-400",
                            !isSidebarOpen && "px-0"
                        )}
                    >
                        <LogOut size={16} />
                        {isSidebarOpen && "Emergency Exit"}
                    </button>
                </div>
            </motion.aside>

            <main className="relative z-10 flex min-w-0 flex-1 flex-col bg-[#070d1f]">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.04] bg-[#0a0c10]/80 px-6 backdrop-blur-xl">
                    <div className="flex min-w-0 items-center gap-4">
                        <button 
                            type="button"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                            <Menu size={16} />
                        </button>
                        <div className="hidden h-4 w-px bg-white/10 sm:block" />
                        <div className="min-w-0">
                            <h2 className="truncate text-xs font-bold text-white uppercase tracking-tight">
                                {companyProfile?.name} <span className="mx-2 text-slate-600 font-normal">|</span> <span className="text-slate-500 font-medium tracking-normal text-[10px]">SCADA v4.2</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden items-center gap-3 rounded bg-white/[0.03] px-3 py-1.5 border border-white/[0.05] transition-all focus-within:ring-1 focus-within:ring-blue-500/30 md:flex md:w-64 lg:w-80">
                            <Search size={14} className="shrink-0 text-slate-500" />
                            <input
                                type="search"
                                placeholder="Search system nodes..."
                                className="w-full border-none bg-transparent text-[11px] font-medium text-white outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-semibold text-white leading-none">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-1">Admin Account</p>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 border border-white/10 text-white text-[10px] font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname + (searchParams.toString() || '')}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.3 }}
                            className="mx-auto w-full max-w-[1920px] p-6 md:p-8"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                body { background-color: #070d1f; }
            `}</style>
        </div>
    );
}
