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
        <aside className="w-60 h-screen bg-slate-900 border-r border-slate-800 flex flex-col z-[100] shrink-0">
            {/* Professional Logo Area */}
            <div className="h-14 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/50">
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
                            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
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
                                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={16} className={cn(
                                                    "transition-colors",
                                                    isActive ? "text-white" : "text-slate-500 group-hover:text-brand-green"
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
            <div className="p-3 border-t border-slate-800 bg-slate-950/30">
                <div className="mb-4 px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white border border-slate-600 uppercase">
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{user?.name || 'Local_Operator'}</span>
                            <span className="text-[10px] text-slate-500 font-mono truncate uppercase">{user?.role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
