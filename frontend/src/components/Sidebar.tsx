"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Activity,
    Settings,
    AlertTriangle,
    LayoutDashboard,
    ShieldCheck,
    Factory,
    Zap,
    LogOut,
    Terminal
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Devices', href: '/devices', icon: Activity },
    { name: 'Alarms', href: '/alarms', icon: AlertTriangle },
    { name: 'System Admin', href: '/admin/system', icon: ShieldCheck },
    { name: 'Modbus Terminal', href: '/admin/modbus-test', icon: Terminal },
    { name: 'Customer Admin', href: '/admin/customer', icon: Factory },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    return (
        <div className="flex h-screen flex-col bg-slate-950 text-slate-200 w-64 border-r border-slate-800">
            <div className="flex h-20 items-center gap-2 px-6 border-b border-slate-800">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                    <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white italic">X-SCADA</span>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    // Conditionally show admin links
                    if (item.name === 'System Admin' && user?.role !== 'SUPER_ADMIN') return null;
                    if (item.name === 'Modbus Terminal' && user?.role !== 'SUPER_ADMIN') return null;
                    if (item.name === 'Customer Admin' && !['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')) return null;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-600/10 text-blue-400 font-medium"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {item.name}
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Connected RTUs</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-slate-200">3 Online</span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all group font-bold text-sm"
                >
                    <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    Terminate Session
                </button>
            </div>
        </div>
    );
}
