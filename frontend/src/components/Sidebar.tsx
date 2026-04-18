"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, BarChart3, Cpu, AlertTriangle, ShieldCheck, Terminal,
    Settings, Activity, LogOut, Factory, Building2, Network, Layers, FileText, Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MENU_GROUPS = [
    {
        label: 'Admin',
        adminOnly: true,
        items: [
            { name: 'Companies', href: '/admin/companies', icon: Building2 },
            { name: 'Users', href: '/admin/users', icon: ShieldCheck },
            { name: 'System Control', href: '/admin/system', icon: Layers },
            { name: 'YTBS Sync', href: '/admin/ytbs', icon: Database },
        ]
    },
    {
        label: 'Infrastructure',
        items: [
            { name: 'Plants', href: '/plants', icon: Factory },
            { name: 'Protocols', href: '/protocols', icon: Network },
            { name: 'Datasheets', href: '/datasheets', icon: FileText },
        ]
    },
    {
        label: 'Operations',
        items: [
            { name: 'Devices', href: '/devices', icon: Cpu },
            { name: 'Alarms', href: '/alarms', icon: AlertTriangle },
        ]
    },
    {
        label: 'Monitoring',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Live', href: '/monitoring/live', icon: Activity },
        ]
    },
    {
        label: 'System',
        items: [
            { name: 'Database', href: '/database', icon: Database },
            { name: 'Modbus', href: '/admin/modbus-test', icon: Terminal, adminOnly: true },
            { name: 'IEC104', href: '/admin/iec104-test', icon: Terminal, adminOnly: true },
            { name: 'Settings', href: '/settings', icon: Settings },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    const isCustomer = pathname?.startsWith('/customer');

    return (
        <aside className={cn(
            "w-56 h-screen flex flex-col z-[100] shrink-0 transition-all duration-500",
            isCustomer 
                ? "bg-[#f3f4f6] border-r border-[#dfe2e7] text-[#131722]" 
                : "bg-card border-r border-border"
        )}>
            {/* Logo */}
            <div className={cn(
                "h-14 flex items-center gap-3 px-4 border-b transition-colors",
                isCustomer ? "border-[#dfe2e7] bg-white" : "border-border bg-background/50"
            )}>
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all",
                    isCustomer ? "bg-[#2962ff] text-white shadow-blue-100" : "bg-brand-green text-white shadow-brand-green/20"
                )}>
                    <Activity size={16} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <h1 className={cn(
                        "text-[13px] font-black tracking-tighter leading-none transition-colors",
                        isCustomer ? "text-[#131722]" : "text-white"
                    )}>X-SCADA</h1>
                    <span className={cn(
                        "text-[8px] font-black tracking-[0.2em] transition-colors",
                        isCustomer ? "text-[#2962ff]" : "text-brand-green"
                    )}>TERMINAL</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
                {MENU_GROUPS.map((group, idx) => {
                    if (group.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;

                    return (
                        <div key={idx} className="mb-6">
                            <h3 className={cn(
                                "px-3 text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 transition-colors",
                                isCustomer ? "text-[#787b86]" : "text-foreground/25"
                            )}>
                                <span className={cn(
                                    "w-1 h-1 rounded-full",
                                    isCustomer ? "bg-[#2962ff]" : "bg-brand-green"
                                )}></span>
                                {group.label}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item: any) => {
                                    if (item.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border",
                                                isActive
                                                    ? isCustomer 
                                                        ? "bg-white text-[#2962ff] border-[#dfe2e7] shadow-sm font-black" 
                                                        : "bg-brand-green/10 text-brand-green border-brand-green/20 font-bold"
                                                    : isCustomer
                                                        ? "text-[#787b86] hover:bg-white hover:text-[#131722] border-transparent"
                                                        : "text-foreground/50 hover:bg-foreground/[0.03] hover:text-foreground border-transparent font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={16} className={cn(
                                                    "transition-colors",
                                                    isActive 
                                                        ? isCustomer ? "text-[#2962ff]" : "text-brand-green" 
                                                        : isCustomer ? "text-[#787b86] group-hover:text-[#2962ff]" : "text-foreground/30 group-hover:text-brand-green/70"
                                                )} />
                                                <span className="text-[11px] font-bold">{item.name}</span>
                                            </div>
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-indicator" 
                                                    className={cn(
                                                        "w-1 h-4 rounded-full shadow-lg",
                                                        isCustomer ? "bg-[#2962ff] shadow-blue-100" : "bg-brand-green shadow-emerald-100"
                                                    )} 
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className={cn(
                "p-3 border-t transition-colors",
                isCustomer ? "border-[#dfe2e7] bg-white" : "border-border bg-background/30"
            )}>
                <div className={cn(
                    "mb-3 px-3 py-3 rounded-2xl border transition-all",
                    isCustomer ? "bg-[#f3f4f6] border-[#dfe2e7]" : "bg-white/5 border-border/50"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm",
                            isCustomer ? "bg-white text-[#131722] border border-[#dfe2e7]" : "bg-background border border-border text-white"
                        )}>
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className={cn(
                                "text-[11px] font-black truncate leading-none",
                                isCustomer ? "text-[#131722]" : "text-white"
                            )}>{user?.name || 'Operator'}</span>
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest mt-1",
                                isCustomer ? "text-[#2962ff]" : "text-foreground/40"
                            )}>{user?.role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className={cn(
                        "w-full h-9 flex items-center justify-center gap-2 rounded-xl transition-all text-[10px] font-black tracking-widest border",
                        isCustomer 
                            ? "text-[#787b86] hover:bg-rose-50 hover:text-rose-600 border-transparent" 
                            : "text-foreground/40 hover:bg-red-500 hover:text-white border-transparent"
                    )}
                >
                    <LogOut size={14} />
                    SIGN OUT
                </button>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isCustomer ? '#dfe2e7' : '#2a2e39'}; border-radius: 10px; }
            `}</style>
        </aside>
    );
}
