"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart3,
    Cpu,
    AlertTriangle,
    ShieldCheck,
    Terminal,
    Settings,
    Activity,
    ChevronRight,
    LogOut,
    Factory,
    Building2,
    Network,
    Layers,
    FileText,
    Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MENU_GROUPS = [
    {
        label: 'Administration',
        adminOnly: true,
        items: [
            { name: 'Companies', href: '/admin/companies', icon: Building2 },
            { name: 'Users', href: '/admin/users', icon: ShieldCheck },
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
            { name: 'Live Monitoring', href: '/monitoring/live', icon: Activity },
            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        ]
    },
    {
        label: 'System',
        items: [
            { name: 'Database', href: '/database', icon: Database },
            { name: 'Modbus Test', href: '/admin/modbus-test', icon: Terminal, adminOnly: true },
            { name: 'IEC104 Test', href: '/admin/iec104-test', icon: Terminal, adminOnly: true },
            { name: 'Settings', href: '/settings', icon: Settings },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    return (
        <aside className="w-60 h-screen bg-card border-r border-border flex flex-col z-[100] shrink-0 transition-colors duration-300">
            {/* Logo Area */}
            <div className="h-14 flex items-center gap-3 px-6 border-b border-border bg-background/50">
                <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-green/20">
                    <Activity size={18} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-sm font-black text-white tracking-tight ">X-SCADA</h1>
                    <span className="text-[9px] font-bold text-brand-green  tracking-widest">Enterprise</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-hide font-sans">
                {MENU_GROUPS.map((group, idx) => {
                    if (group.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;

                    return (
                        <div key={idx} className="relative">
                            {idx !== 0 && (
                                <div className="mx-3 my-4 border-t border-border/30 shadow-[0_1px_0_rgba(255,255,255,0.03)]" />
                            )}
                            <div className="space-y-1">
                                <h3 className="px-3 text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-brand-green/40"></span>
                                    {group.label}
                                </h3>
                                <div className="space-y-0.5">
                                    {group.items.map((item: any) => {
                                        if (item.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;
                                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                                                    isActive
                                                        ? "bg-brand-green/10 text-brand-green border border-brand-green/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] font-bold"
                                                        : "text-foreground/50 hover:bg-foreground/[0.03] hover:text-foreground font-medium"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={17} className={cn(
                                                        "transition-colors",
                                                        isActive ? "text-brand-green" : "text-foreground/30 group-hover:text-brand-green/70"
                                                    )} />
                                                    <span className="text-xs leading-none">{item.name}</span>
                                                </div>
                                                {isActive && (
                                                    <motion.div layoutId="active-indicator" className="w-1 h-4 bg-brand-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-background/30">
                <div className="mb-4 px-3 py-3 rounded-lg bg-white/5 border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-white ">
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{user?.name || 'Operator'}</span>
                            <span className="text-[10px] text-foreground/40 font-mono truncate ">{user?.role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-foreground/40 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold  tracking-wider"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
