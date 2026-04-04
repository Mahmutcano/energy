"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, LayoutDashboard, Cpu, AlertTriangle, LogOut, BarChart3, Database } from "lucide-react";
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

    const isLoginPage = pathname === '/customer/login';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isLoginPage) {
            router.push('/customer/login');
        }
    }, [isAuthenticated, loading, isLoginPage, router]);

    if (loading) {
        return <div className="h-screen w-full bg-[#05080F] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    return (
        <div className="customer-theme bg-[#05080F] text-[#F1F5F9] font-sans h-screen flex overflow-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 bg-volt-grid pointer-events-none opacity-20" />

            {/* Sidebar */}
            <aside className="w-56 h-full bg-[#0A0E17]/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-[100] relative">
                <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
                    <div className="w-7 h-7 rounded-lg bg-neon-blue flex items-center justify-center text-black shadow-[0_0_15px_#00E5FF]">
                        <Activity size={14} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-[10px] font-black tracking-[0.2em] uppercase truncate">
                            {companyProfile?.name || "Voltage Pro"}
                        </h1>
                        <span className="text-[7px] font-bold text-neon-blue tracking-[0.3em] uppercase opacity-60">System Monitoring</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-2 mt-4">
                    {[
                        { name: 'Dashboard', href: '/customer', icon: LayoutDashboard },
                        { name: 'Plants', href: '/customer/plants', icon: Database },
                        { name: 'Devices', href: '/customer/devices', icon: Cpu },
                        { name: 'Alarms', href: '/customer/alarms', icon: AlertTriangle },
                        { name: 'Reports', href: '/customer/reports', icon: BarChart3 },
                    ].map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                    isActive 
                                        ? "bg-neon-blue/10 text-neon-blue border border-neon-blue/20" 
                                        : "text-white/40 hover:text-white"
                                )}
                            >
                                <item.icon size={16} className={cn(
                                    "transition-colors duration-300",
                                    isActive ? "text-neon-blue" : "text-white/20 group-hover:text-neon-blue/70"
                                )} />
                                <span className="text-[11px] font-bold tracking-tight">{item.name}</span>
                                {isActive && (
                                    <motion.div layoutId="nav-glow" className="absolute left-0 w-0.5 h-4 bg-neon-blue rounded-full shadow-[0_0_10px_#00E5FF]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                    <button 
                        onClick={logout}
                        className="w-full h-9 flex items-center justify-center gap-2 rounded-xl text-white/30 hover:bg-red-500/10 hover:text-red-500 transition-all text-[10px] font-bold tracking-widest border border-transparent hover:border-red-500/20"
                    >
                        <LogOut size={14} />
                        EXIT SYSTEM
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
                {/* Neon Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0A0E17]/40 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-neon-blue rounded-full shadow-[0_0_15px_#00E5FF]" />
                        <h2 className="text-xs font-black tracking-[0.2em] uppercase">
                            Kinetic Observatory <span className="opacity-30 mx-2">/</span> 
                            <span className="text-neon-blue">{pathname.split('/').pop()?.replace('-', ' ') || 'Overview'}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                         <div className="flex flex-col items-end leading-none">
                            <span className="text-[10px] font-black text-white">{user?.name}</span>
                            <span className="text-[8px] font-bold text-neon-lime tracking-widest mt-0.5 uppercase">Premium Portal</span>
                         </div>
                    </div>
                </header>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .customer-theme {
                    --neon-blue: #00E5FF;
                    --neon-orange: #FF3300;
                    --neon-lime: #CCFF00;
                }
                .bg-volt-grid {
                    background-image: 
                      linear-gradient(to right, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                .volt-card {
                    background: rgba(10, 14, 23, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .volt-card:hover {
                    border-color: rgba(0, 229, 255, 0.2);
                    box-shadow: 0 0 40px rgba(0, 229, 255, 0.06);
                    transform: translateY(-2px);
                }
                .text-neon-cyan { color: #00E5FF; text-shadow: 0 0 10px rgba(0, 229, 255, 0.2); }
                .text-neon-lime { color: #CCFF00; text-shadow: 0 0 10px rgba(204, 255, 0, 0.2); }
                .text-neon-orange { color: #FF3300; text-shadow: 0 0 10px rgba(255, 51, 0, 0.2); }
            `}</style>
        </div>
    );
}
