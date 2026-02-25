"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Settings, HelpCircle, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    const isAuthPage = pathname === '/login' || pathname === '/register';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isAuthPage) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, isAuthPage, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-border border-t-brand-green rounded-full animate-spin"></div>
                    <p className="text-[11px] font-bold text-foreground/40  tracking-widest animate-pulse">Initializing System...</p>
                </div>
            </div>
        );
    }

    if (isAuthPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden transition-colors duration-300">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Control Header */}
                <header className="h-14 bg-card border-b border-border flex items-center justify-between px-8 z-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-foreground/40 group">
                            <Activity size={16} className="text-brand-green animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest">LIVE MONITOR</span>
                        </div>
                        <div className="h-4 w-px bg-border mx-2"></div>
                        <h2 className="text-sm font-bold text-foreground  tracking-tight">
                            {pathname === '/' ? 'System Metrics' : pathname.slice(1).replace('-', ' ')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Quick Search Utility */}
                        <div className="hidden lg:flex items-center gap-3 bg-muted px-4 py-2 rounded-lg border border-border group focus-within:border-brand-green/30 transition-all">
                            <Search size={14} className="text-foreground/40 group-focus-within:text-brand-green" />
                            <input
                                type="text"
                                placeholder="Search IOA, Device..."
                                className="bg-transparent border-none outline-none text-[11px] font-medium text-foreground w-48"
                            />
                        </div>

                        <div className="flex items-center gap-2 border-l border-border pl-6">
                            <button className="p-2 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-lg transition-all relative">
                                <Bell size={18} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
                            </button>
                            <Link href="/settings" className="p-2 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-lg transition-all">
                                <Settings size={18} />
                            </Link>
                            <button className="p-2 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-lg transition-all">
                                <HelpCircle size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content Viewport */}
                <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-10 scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="max-w-[1600px] mx-auto"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
