import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    highlightedTitle?: string;
    subtitle: string;
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    children?: React.ReactNode;
}

export default function PageHeader({ 
    title, 
    highlightedTitle,
    subtitle, 
    icon: Icon, 
    iconColor = "text-grafana-accent-blue", 
    iconBgColor = "bg-grafana-accent-blue/10",
    children 
}: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-grafana-panel/20 p-6 border border-grafana-border rounded-sm dot-bg animate-in-fade shadow-sm">
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-sm border transition-all", iconBgColor, iconColor, "border-white/5 shadow-inner")}>
                        <Icon size={20} />
                    </div>
                    <h1 className="text-2xl font-bold text-grafana-text-primary tracking-tight uppercase flex items-center gap-2">
                        {title} 
                        {highlightedTitle && (
                            <span className="text-grafana-text-secondary font-light">{highlightedTitle}</span>
                        )}
                    </h1>
                </div>
                <p className="text-[10px] md:text-[11px] font-bold text-grafana-text-secondary uppercase tracking-[0.2em] font-mono ml-11 leading-none opacity-80">
                    {subtitle}
                </p>
            </div>
            {children && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {children}
                </div>
            )}
        </div>
    );
}
