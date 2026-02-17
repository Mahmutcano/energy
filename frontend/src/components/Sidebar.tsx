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
    Network
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MENU_GROUPS = [
    {
        label: 'Monitoring',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        ]
    },
    {
        label: 'System Management',
        items: [
            { name: 'Devices', href: '/devices', icon: Cpu },
            { name: 'Network Map', href: '/network', icon: Network },
            { name: 'Alarms', href: '/alarms', icon: AlertTriangle },
            { name: 'Settings', href: '/settings', icon: Settings },
        ]
    },
    {
        label: 'Administration',
        adminOnly: true,
        items: [
            { name: 'System Admin', href: '/admin/system', icon: ShieldCheck },
            { name: 'Modbus Control', href: '/admin/modbus-test', icon: Terminal },
            { name: 'Client Config', href: '/admin/customer', icon: Factory },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    return (
        <aside className="w-60 h-screen bg-card border-r border-border flex flex-col z-[100] shrink-0 transition-colors duration-300">
            {/* Professional Logo Area */}
            <div className="h-14 flex items-center gap-3 px-6 border-b border-border bg-background/50">
                <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-green/20">
                    <Activity size={18} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-sm font-black text-white tracking-tight uppercase">X-SCADA</h1>
                    <span className="text-[9px] font-bold text-brand-green uppercase tracking-widest">Enterprise_V1</span>
                </div>
            </div>

            {/* Navigation Body */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-hide font-sans">
                {MENU_GROUPS.map((group, idx) => {
                    // Filter admin items
                    if (group.adminOnly && user?.role !== 'SUPER_ADMIN') return null;

                    return (
                        <div key={idx} className="space-y-1.5">
                            <h3 className="px-3 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-2">
                                {group.label}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;

                                    // Role-based visibility logic for specific items within groups
                                    if (item.name === 'Client Config' && !['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')) return null;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center justify-between px-3 py-2 rounded-md transition-all",
                                                isActive
                                                    ? "bg-brand-green text-white shadow-sm font-semibold"
                                                    : "text-foreground/60 hover:bg-white/5 hover:text-foreground font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={16} className={cn(
                                                    "transition-colors",
                                                    isActive ? "text-white" : "text-foreground/40 group-hover:text-brand-green"
                                                )} />
                                                <span className="text-xs leading-none">{item.name}</span>
                                            </div>
                                            {isActive && <ChevronRight size={12} className="opacity-50" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Sidebar Footer with Operator Info */}
            <div className="p-3 border-t border-border bg-background/30">
                <div className="mb-4 px-3 py-3 rounded-lg bg-white/5 border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{user?.name || 'Local_Operator'}</span>
                            <span className="text-[10px] text-foreground/40 font-mono truncate uppercase">{user?.role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-foreground/40 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
