"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isAuthPage) {
        return <>{children}</>;
    }

    // If not authenticated and not on an auth page, don't render anything while redirecting
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8 relative">
                <div className="absolute top-0 right-0 p-8 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-200">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{user?.role?.replace('_', ' ') || 'Guest'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                        {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
