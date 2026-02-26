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
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin"></div>
                    <p className="text-[9px] font-bold text-foreground/40 tracking-widest animate-pulse">Initializing...</p>
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
                {/* Compact Header */}
                <header className="h-10 bg-card border-b border-border flex items-center justify-between px-4 z-50 shrink-0">
                    <h2 className="text-[11px] font-bold text-foreground tracking-tight capitalize">
                        {pathname === '/'
                            ? 'System Metrics'
                            : pathname.split('/').filter(Boolean).pop()?.replace('-', ' ')}
                    </h2>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 bg-muted px-3 py-1 rounded-md border border-border group focus-within:border-brand-green/30 transition-all">
                            <Search size={11} className="text-foreground/40 group-focus-within:text-brand-green" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-[10px] font-medium text-foreground w-36"
                            />
                        </div>

                        <div className="flex items-center gap-1 border-l border-border pl-3">
                            <button className="p-1.5 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-md transition-all relative">
                                <Bell size={14} />
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-card"></span>
                            </button>
                            <Link href="/settings" className="p-1.5 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-md transition-all">
                                <Settings size={14} />
                            </Link>
                            <button className="p-1.5 text-foreground/40 hover:text-brand-green hover:bg-muted rounded-md transition-all">
                                <HelpCircle size={14} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content - Tighter padding */}
                <main className="flex-1 overflow-y-auto bg-background p-3 lg:p-5 scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="max-w-[1800px] mx-auto"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
