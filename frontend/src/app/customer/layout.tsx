"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isLoginPage = pathname === '/customer/login';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isLoginPage) {
            router.push('/customer/login');
        }
    }, [isAuthenticated, loading, isLoginPage, router]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-2xl border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                </div>
                <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Loading Session...</p>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-white text-[#131722] font-sans selection:bg-blue-100 selection:text-[#2962ff]">
            {/* 
                This layout is now a clean wrapper. 
                The full Terminal UI (Header, Sidebars, Ticker) is managed 
                within the individual customer pages for a focused TradingView experience.
            */}
            {children}
        </div>
    );
}
