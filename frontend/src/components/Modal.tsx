"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
    zIndex?: number;
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
};

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    children,
    maxWidth = 'lg',
    zIndex = 200
}: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
                    style={{ zIndex }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className={`card-base w-full ${maxWidthClasses[maxWidth]} bg-slate-950 border-slate-800 shadow-2xl my-8 overflow-hidden`}
                    >
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                            <div className="flex items-center gap-3">
                                {Icon && (
                                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <Icon size={18} className="text-brand-green" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                                    {subtitle && (
                                        <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">{subtitle}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
