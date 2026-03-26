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
            { name: 'Charts', href: '/charts', icon: BarChart3 },
            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
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

    return (
        <aside className="w-48 h-screen bg-card border-r border-border flex flex-col z-[100] shrink-0 transition-colors duration-300">
            {/* Logo */}
            <div className="h-10 flex items-center gap-2 px-3 border-b border-border bg-background/50">
                <div className="w-6 h-6 rounded-md bg-brand-green flex items-center justify-center text-white shadow-md shadow-brand-green/20">
                    <Activity size={12} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-[11px] font-black text-white tracking-tight leading-none">X-SCADA</h1>
                    <span className="text-[7px] font-bold text-brand-green tracking-widest">Enterprise</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-hide font-sans">
                {MENU_GROUPS.map((group, idx) => {
                    if (group.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;

                    return (
                        <div key={idx}>
                            {idx !== 0 && (
                                <div className="mx-2 my-1.5 border-t border-border/30" />
                            )}
                            <div className="space-y-px">
                                <h3 className="px-2 text-[8px] font-bold text-foreground/25 uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5">
                                    <span className="w-0.5 h-0.5 rounded-full bg-brand-green/40"></span>
                                    {group.label}
                                </h3>
                                {group.items.map((item: any) => {
                                    if (item.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') return null;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center justify-between px-2 py-1.5 rounded-lg transition-all",
                                                isActive
                                                    ? "bg-brand-green/10 text-brand-green border border-brand-green/20 font-bold"
                                                    : "text-foreground/50 hover:bg-foreground/[0.03] hover:text-foreground font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <item.icon size={13} className={cn(
                                                    "transition-colors",
                                                    isActive ? "text-brand-green" : "text-foreground/30 group-hover:text-brand-green/70"
                                                )} />
                                                <span className="text-[10px] leading-none">{item.name}</span>
                                            </div>
                                            {isActive && (
                                                <motion.div layoutId="active-indicator" className="w-0.5 h-3 bg-brand-green rounded-full shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
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
            <div className="p-2 border-t border-border bg-background/30">
                <div className="mb-2 px-2 py-2 rounded-md bg-white/5 border border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-[8px] font-bold text-white">
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white truncate leading-none">{user?.name || 'Operator'}</span>
                            <span className="text-[8px] text-foreground/40 font-mono truncate">{user?.role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full h-7 flex items-center justify-center gap-1.5 rounded-md text-foreground/40 hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold tracking-wider"
                >
                    <LogOut size={12} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
