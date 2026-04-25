"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, BarChart3, Cpu, AlertTriangle, ShieldCheck, Terminal,
    Settings, Activity, LogOut, Factory, Building2, Network, FileText, Database,
    Server, Activity as PulseIcon, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { cn } from '../lib/utils';

const MENU_GROUPS = [
    {
        label: 'İzleme',
        items: [
            { name: 'Panel', href: '/', icon: LayoutDashboard },
            { name: 'Analiz', href: '/analytics', icon: BarChart3 },
            { name: 'Canlı Yayın', href: '/monitoring/live', icon: PulseIcon },
            { name: 'Alarmlar', href: '/alarms', icon: AlertTriangle },
        ]
    },
    {
        label: 'Altyapı',
        items: [
            { name: 'Santraller', href: '/plants', icon: Factory },
            { name: 'Cihazlar', href: '/devices', icon: Cpu },
            { name: 'Protokoller', href: '/protocols', icon: Network, adminOnly: true },
            { name: 'Veri Şemaları', href: '/datasheets', icon: FileText, adminOnly: true },
        ]
    },
    {
        label: 'Yapılandırma',
        adminOnly: true,
        items: [
            { name: 'Kurumlar', href: '/admin/companies', icon: Building2 },
            { name: 'Kullanıcı Yönetimi', href: '/admin/users', icon: ShieldCheck },
            { name: 'YTBS Ayarları', href: '/admin/ytbs', icon: Database },
        ]
    },
    {
        label: 'Sistem Yönetimi',
        adminOnly: true,
        items: [
            { name: 'Sistem Sağlığı', href: '/admin/system', icon: Server },
            { name: 'Modbus Testi', href: '/admin/modbus-test', icon: Terminal },
            { name: 'IEC104 Testi', href: '/admin/iec104-test', icon: Terminal },
            { name: 'Platform Ayarları', href: '/settings', icon: Settings },
        ]
    }
];

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { theme, setTheme } = useTheme();

    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

    const toggleTheme = () => {
        setTheme(theme === 'light-pure' ? 'industrial-emerald' : 'light-pure');
    };

    return (
        <aside className="w-64 h-screen flex flex-col z-[100] bg-grafana-bg border-r border-grafana-border shrink-0 transition-colors duration-300">
            {/* Brand Logo */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-grafana-border bg-grafana-panel/30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-grafana-accent-blue flex items-center justify-center shadow-[0_0_15px_rgba(87,148,242,0.3)]">
                        <Activity size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xs font-black tracking-widest text-grafana-text-primary uppercase font-sans">
                            SCADA<span className="text-grafana-accent-blue">.PRO</span>
                        </h1>
                    </div>
                </div>
                
                {/* Theme Toggle Button */}
                <button 
                    onClick={toggleTheme}
                    className="p-1.5 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue transition-all"
                    title={theme === 'light-pure' ? 'Karanlık Mod' : 'Aydınlık Mod'}
                >
                    {theme === 'light-pure' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                {MENU_GROUPS.map((group, idx) => {
                    if (group.adminOnly && !isAdmin) return null;

                    return (
                        <div key={idx} className="space-y-2">
                            <h3 className="px-3 text-[10px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] flex items-center justify-between">
                                {group.label}
                                {group.adminOnly && <ShieldCheck size={10} className="text-grafana-accent-orange" />}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item: any) => {
                                    if (item.adminOnly && !isAdmin) return null;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2 rounded-sm transition-all relative",
                                                isActive
                                                    ? "bg-grafana-accent-blue/10 text-grafana-accent-blue border-l-2 border-grafana-accent-blue"
                                                    : "text-grafana-text-secondary hover:bg-grafana-panel hover:text-grafana-text-primary border-l-2 border-transparent"
                                            )}
                                        >
                                            <item.icon size={18} className={cn(
                                                "transition-colors",
                                                isActive ? "text-grafana-accent-blue" : "group-hover:text-grafana-text-primary"
                                            )} />
                                            <span className="text-[13px] font-medium font-sans">{item.name}</span>
                                            
                                            {isActive && (
                                                <motion.div
                                                    layoutId="active-indicator"
                                                    className="absolute right-2"
                                                >
                                                    <ChevronRight size={14} />
                                                </motion.div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Profile & Logout */}
            <div className="p-4 border-t border-grafana-border bg-grafana-panel/20">
                <div className="flex items-center gap-3 px-2 py-3 mb-4 rounded-sm bg-grafana-bg border border-grafana-border/50">
                    <div className="w-10 h-10 rounded-sm bg-grafana-panel flex items-center justify-center text-xs font-bold text-grafana-text-primary border border-grafana-border">
                        {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-grafana-text-primary truncate font-sans">
                            {user?.name || 'Operator'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isAdmin ? "bg-grafana-accent-orange" : "bg-grafana-accent-green"
                            )} />
                            <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-wider font-mono">
                                {user?.role === 'SUPER_ADMIN' ? 'KÖK ADMİN' : user?.role === 'COMPANY_ADMIN' ? 'KURUM ADMİNİ' : 'OPERATÖR'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={logout}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-sm border border-grafana-accent-red/20 text-grafana-accent-red hover:bg-grafana-accent-red hover:text-white transition-all text-[11px] font-bold tracking-widest uppercase font-mono"
                >
                    <LogOut size={14} />
                    Güvenli Çıkış
                </button>
            </div>
        </aside>
    );
}

