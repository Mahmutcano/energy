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
    const modalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            // Focus the modal for accessibility
            modalRef.current?.focus();
        }
    }, [isOpen]);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc, true);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc, true);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 overflow-y-auto outline-none"
                    style={{ zIndex }}
                >
                    <div
                        ref={modalRef}
                        tabIndex={-1}
                        className="min-h-full flex items-center justify-center p-4 bg-black/80 backdrop-blur-md outline-none"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onClose();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={`card-base w-full ${maxWidthClasses[maxWidth]} bg-slate-950 border-slate-800 shadow-2xl my-8 overflow-hidden relative`}
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 sticky top-0 z-10 backdrop-blur-md">
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
                </div>
            )}
        </AnimatePresence>
    );
}
