"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
    Activity, 
    LayoutDashboard, 
    Cpu, 
    AlertTriangle, 
    LogOut, 
    BarChart3, 
    Database, 
    Zap, 
    Layers, 
    ShieldAlert,
    Menu,
    ChevronRight,
    User,
    Settings,
    Bell,
    FileText,
    Monitor,
    Search
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const isLoginPage = pathname === '/customer/login';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isLoginPage) {
            router.push('/customer/login');
        }
    }, [isAuthenticated, loading, isLoginPage, router]);

    if (loading) {
        return <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated) return null;

    const navItems = [
        { group: 'TESİS İZLEME', items: [
            { name: 'GERİLİM', href: '/customer?cat=voltage', icon: Zap, color: '#0EA5E9' },
            { name: 'AKIM', href: '/customer?cat=current', icon: Activity, color: '#10B981' },
            { name: 'GÜÇ', href: '/customer?cat=power', icon: BarChart3, color: '#F43F5E' },
            { name: 'ENERJİ', href: '/customer?cat=energy', icon: Layers, color: '#8B5CF6' },
            { name: 'KALİTE', href: '/customer?cat=quality', icon: ShieldAlert, color: '#F59E0B' },
            { name: 'SİSTEM', href: '/customer?cat=system', icon: Cpu, color: '#6366F1' },
        ]},
        { group: 'ANALİZ & VERİ', items: [
            { name: 'Raporlar', href: '/customer/reports', icon: BarChart3, color: '#64748b' },
            { name: 'Kayıtlar', href: '/customer/logs', icon: Database, color: '#64748b' },
            { name: 'Veri Yapıları', href: '/customer/datasheets', icon: FileText, color: '#64748b' },
        ]}
    ];

    return (
        <div className="bg-[#F8FAFC] text-[#0F172A] font-sans h-screen flex overflow-hidden selection:bg-[#10B981]/20">
            
            {/* --- PREMIUM WHITE SIDEBAR --- */}
            <motion.aside 
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 88 }}
                className="h-full bg-white border-r border-slate-200 flex flex-col z-[100] relative transition-all duration-300"
            >
                {/* Brand Identity */}
                <div className={cn(
                    "h-20 flex items-center gap-3.5 px-7 border-b border-slate-100",
                    !isSidebarOpen && "justify-center"
                )}>
                    <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center shadow-lg shadow-slate-200 ring-4 ring-slate-50">
                         <Activity size={20} className="text-[#10B981] stroke-[2.5]" />
                    </div>
                    {isSidebarOpen && (
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-sm font-bold tracking-tight text-[#0F172A]">
                                {companyProfile?.name || "KINETIC"}
                            </h1>
                            <span className="text-[10px] font-bold text-[#10B981]/80 tracking-wider">OBSERVATORY</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-8 scrollbar-hide px-4">
                    {navItems.map((group, idx) => (
                        <div key={group.group} className={cn("mb-9", idx > 0 && "mt-4")}>
                            {isSidebarOpen && (
                                <h3 className="px-4 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none">
                                    {group.group}
                                </h3>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href.split('?')[0] && (item.href.includes('?cat=') ? pathname.includes(item.href) : true);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                                isActive 
                                                    ? "bg-slate-50 text-[#0F172A] shadow-sm ring-1 ring-slate-100" 
                                                    : "text-slate-500 hover:text-[#0F172A] hover:bg-slate-50"
                                            )}
                                        >
                                            <item.icon size={18} className={cn(
                                                "transition-colors",
                                                isActive ? "text-[#10B981]" : "opacity-70 group-hover:opacity-100"
                                            )} style={{ color: isActive ? item.color : '' }} />
                                            
                                            {isSidebarOpen && (
                                                <span className="text-[13px] font-semibold tracking-tight">{item.name}</span>
                                            )}
                                            
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="nav-dot" 
                                                    className="absolute left-[-16px] w-2 h-2 bg-[#10B981] rounded-full" 
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Account Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={logout}
                        className={cn(
                            "w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-slate-500 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-xs font-bold",
                            !isSidebarOpen && "px-0"
                        )}
                    >
                        <LogOut size={16} />
                        {isSidebarOpen && "Oturumu Kapat"}
                    </button>
                </div>
            </motion.aside>

            {/* --- CONTENT ARCHITECTURE --- */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
                
                {/* Header (Apple Style) */}
                <header className="h-20 flex items-center justify-between px-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
                    <div className="flex items-center gap-8">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0F172A] transition-all"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-[#0F172A]">VoltMetric Pro</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                                {pathname.includes('datasheets') ? 'VERİ YAPILARI' : (pathname.split('/').pop()?.toUpperCase().replace('-', ' ') || 'KONTROL PANELİ')}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-7">
                         {/* Search Minimalist */}
                         <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full w-64 group focus-within:ring-2 ring-[#10B981]/10 transition-all">
                             <Search size={14} className="text-slate-400" />
                             <input type="text" placeholder="Sistemde ara..." className="bg-transparent border-none outline-none text-[13px] text-slate-600 placeholder:text-slate-400 w-full" />
                         </div>

                         <div className="flex items-center gap-4">
                             <div className="flex flex-col items-end leading-none">
                                <span className="text-xs font-bold text-[#0F172A]">{user?.name}</span>
                                <span className="text-[10px] font-bold text-[#10B981] opacity-80 uppercase tracking-tighter">Yönetici</span>
                             </div>
                             <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                                <User size={16} className="text-slate-500" />
                             </div>
                         </div>
                    </div>
                </header>

                {/* Dashboard Scroll Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.3 }}
                            className="p-10 max-w-[1600px] mx-auto w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .volt-card {
                    background: white;
                    border: 1px border-slate-200;
                    border-radius: 28px;
                    box-shadow: 0 4px 20px -10px rgba(0, 0, 0, 0.05);
                    transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
                }
                .volt-card:hover {
                    box-shadow: 0 10px 40px -15px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                body { 
                    font-family: 'Inter', -apple-system, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    background-color: #F8FAFC;
                }
            `}</style>
        </div>
    );
}
