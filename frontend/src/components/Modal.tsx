"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    zIndex = 1000
}: ModalProps) {
    const [mounted, setMounted] = useState(false);
    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isOpen) {
            modalRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc, true);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc, true);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 overflow-y-auto outline-none transition-colors duration-300"
                    style={{ zIndex }}
                >
                    <div className="min-h-full flex flex-col items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        style={{ zIndex: -1 }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={cn(
                            "card-base w-full",
                            maxWidthClasses[maxWidth],
                            "bg-grafana-bg border-grafana-border shadow-2xl overflow-hidden relative"
                        )}
                        style={{ zIndex: 1 }}
                    >
                        <div className="px-4 py-3 border-b border-grafana-border flex justify-between items-center bg-grafana-panel/50 backdrop-blur-md">
                            <div className="flex items-center gap-2.5">
                                {Icon && (
                                    <div className="p-1.5 rounded-sm bg-grafana-bg border border-grafana-border">
                                        <Icon size={14} className="text-grafana-accent-blue" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-[13px] font-bold text-grafana-text-primary tracking-tight">{title}</h2>
                                    {subtitle && (
                                        <p className="text-[8px] text-grafana-text-secondary tracking-widest uppercase mt-0.5">{subtitle}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-grafana-text-secondary hover:text-grafana-text-primary transition-colors rounded-sm hover:bg-grafana-panel/50"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
