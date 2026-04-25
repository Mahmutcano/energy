"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Settings, HelpCircle, Activity, ShieldCheck, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isCustomerPage = pathname?.startsWith('/customer');

    useEffect(() => {
        if (!loading && !isAuthenticated && !isAuthPage && !isCustomerPage) {
            router.push('/login');
            return;
        }

        if (!loading && isAuthenticated && user?.role === 'NORMAL_USER' && !isCustomerPage && !isAuthPage) {
            router.push('/customer');
        }
    }, [isAuthenticated, loading, isAuthPage, isCustomerPage, user, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-grafana-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-grafana-border border-t-grafana-accent-blue rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-grafana-text-secondary tracking-[0.3em] uppercase animate-pulse font-mono">System Initialization...</p>
                </div>
            </div>
        );
    }

    if (isAuthPage || isCustomerPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen w-full bg-grafana-bg text-grafana-text-primary font-sans overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar / Header */}
                <header className="h-12 bg-grafana-panel border-b border-grafana-border flex items-center justify-between px-6 z-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">UTC:</span>
                            <span className="text-[11px] font-bold text-grafana-accent-blue font-mono">
                                {currentTime.toISOString().split('T')[1].split('.')[0]}
                            </span>
                        </div>
                        <div className="h-4 w-[1px] bg-grafana-border mx-2" />
                        <h2 className="text-[12px] font-bold text-grafana-text-primary tracking-tight uppercase font-sans flex items-center gap-2">
                            {pathname === '/'
                                ? 'Global Dashboard'
                                : pathname.split('/').filter(Boolean).pop()?.replace('-', ' ')}
                            {user?.role?.includes('ADMIN') && <ShieldCheck size={12} className="text-grafana-accent-orange" />}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Health Indicators */}
                        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-sm bg-grafana-bg/50 border border-grafana-border/50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-grafana-accent-green animate-pulse shadow-[0_0_8px_#73bf69]" />
                                <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-tighter font-mono">Socket</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_8px_#73bf69]" />
                                <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-tighter font-mono">Redis</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-grafana-accent-green shadow-[0_0_8px_#73bf69]" />
                                <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-tighter font-mono">DB</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-l border-grafana-border pl-4">
                            <button className="p-2 text-grafana-text-secondary hover:text-grafana-text-primary hover:bg-grafana-bg transition-all relative rounded-sm">
                                <Bell size={16} />
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-grafana-accent-red rounded-full border border-grafana-panel shadow-[0_0_5px_#f2495c]"></span>
                            </button>
                            <Link href="/settings" className="p-2 text-grafana-text-secondary hover:text-grafana-text-primary hover:bg-grafana-bg transition-all rounded-sm">
                                <Settings size={16} />
                            </Link>
                            <button className="p-2 text-grafana-text-secondary hover:text-grafana-text-primary hover:bg-grafana-bg transition-all rounded-sm">
                                <HelpCircle size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-grafana-bg p-4 lg:p-6 scroll-smooth dot-bg">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className="max-w-[2400px] mx-auto"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
