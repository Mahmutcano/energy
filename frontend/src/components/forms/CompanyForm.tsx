"use client";

import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Building2, MapPin, Phone, Mail, User, ShieldCheck, Key, Hash, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompanyFormData {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    representative: string | null;
    taxOffice: string | null;
    taxNumber: string | null;
    ytbsUsername?: string | null;
    ytbsPassword?: string | null;
    ytbsApiKey?: string | null;
    baglantiAnlasmasiSirketiLisansNo?: string | null;
    isActive: boolean;
}

interface CompanyFormProps {
    initialData?: Partial<CompanyFormData>;
    onSubmit: (data: CompanyFormData) => void;
    isSubmitting: boolean;
    submitLabel: string;
}

export default function CompanyForm({
    initialData,
    onSubmit,
    isSubmitting,
    submitLabel
}: CompanyFormProps) {
    const [formData, setFormData] = useState<CompanyFormData>({
        name: initialData?.name || '',
        address: initialData?.address || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        representative: initialData?.representative || '',
        taxOffice: initialData?.taxOffice || '',
        taxNumber: initialData?.taxNumber || '',
        ytbsUsername: initialData?.ytbsUsername || '',
        ytbsPassword: initialData?.ytbsPassword || '',
        ytbsApiKey: initialData?.ytbsApiKey || '',
        baglantiAnlasmasiSirketiLisansNo: initialData?.baglantiAnlasmasiSirketiLisansNo || '',
        isActive: initialData?.isActive ?? true,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                address: initialData.address || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                representative: initialData.representative || '',
                taxOffice: initialData.taxOffice || '',
                taxNumber: initialData.taxNumber || '',
                ytbsUsername: initialData.ytbsUsername || '',
                ytbsPassword: initialData.ytbsPassword || '',
                ytbsApiKey: initialData.ytbsApiKey || '',
                baglantiAnlasmasiSirketiLisansNo: initialData.baglantiAnlasmasiSirketiLisansNo || '',
                isActive: initialData.isActive ?? true,
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <Building2 size={12} />
                        CORPORATE_LEGAL_ENTITY
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="ENTITY_NAME_STRING"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <FileText size={12} />
                        TAX_OFFICE_LOCUS
                    </label>
                    <input
                        type="text"
                        value={formData.taxOffice || ''}
                        onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="OFFICE_NAME"
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <Hash size={12} />
                        TAX_IDENT_NUMBER
                    </label>
                    <input
                        type="number"
                        value={formData.taxNumber || ''}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="NUMERIC_ID"
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <Mail size={12} />
                        COMM_ENDPOINT_EMAIL
                    </label>
                    <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="EMAIL_ADDR"
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <Phone size={12} />
                        TEL_VOICE_UPLINK
                    </label>
                    <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="PHONE_NUM"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <User size={12} />
                        LEGAL_REPRESENTATIVE
                    </label>
                    <input
                        type="text"
                        value={formData.representative || ''}
                        onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                        className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                        placeholder="REP_FULL_NAME"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                        <MapPin size={12} />
                        GEOGRAPHIC_ADDRESS_STRING
                    </label>
                    <textarea
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-grafana-bg border border-grafana-border rounded-sm px-4 py-3 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20 min-h-[80px]"
                        placeholder="PHYSICAL_LOCATION_DETAILS"
                    />
                </div>

                {/* YTBS Section */}
                <div className="md:col-span-2 pt-6 border-t border-grafana-border/50">
                    <div className="flex items-center gap-3 mb-6 px-1">
                        <ShieldCheck size={16} className="text-grafana-accent-blue" />
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] font-mono">YTBS_INTEGRATION_PROTOCOLS</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                                <User size={12} />
                                YTBS_AUTH_USER
                            </label>
                            <input
                                type="text"
                                value={formData.ytbsUsername || ''}
                                onChange={(e) => setFormData({ ...formData, ytbsUsername: e.target.value })}
                                className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono"
                                placeholder="USERNAME"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                                <Key size={12} />
                                YTBS_AUTH_SECRET
                            </label>
                            <input
                                type="password"
                                value={formData.ytbsPassword || ''}
                                onChange={(e) => setFormData({ ...formData, ytbsPassword: e.target.value })}
                                className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                                <ShieldCheck size={12} />
                                YTBS_API_CREDENTIAL
                            </label>
                            <input
                                type="text"
                                value={formData.ytbsApiKey || ''}
                                onChange={(e) => setFormData({ ...formData, ytbsApiKey: e.target.value })}
                                className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono"
                                placeholder="API_KEY_STRING"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                                <FileText size={12} />
                                LICENSE_PROTOCOL_ID
                            </label>
                            <input
                                type="text"
                                value={formData.baglantiAnlasmasiSirketiLisansNo || ''}
                                onChange={(e) => setFormData({ ...formData, baglantiAnlasmasiSirketiLisansNo: e.target.value })}
                                className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono"
                                placeholder="LIC_NUM"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-grafana-panel/30 rounded-sm border border-grafana-border group hover:border-grafana-accent-blue/30 transition-all">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] font-mono group-hover:text-grafana-accent-blue transition-colors">OPERATIONAL_STATUS</span>
                    <span className="text-[8px] text-grafana-text-secondary uppercase font-mono">Toggle active registry in global cluster</span>
                </div>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={cn(
                        "transition-all active:scale-95",
                        formData.isActive ? "text-grafana-accent-green" : "text-grafana-text-secondary"
                    )}
                >
                    {formData.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 bg-grafana-accent-blue disabled:opacity-50 text-white font-black tracking-[0.3em] text-xs rounded-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase flex items-center justify-center gap-3 font-mono"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        {submitLabel.toUpperCase()}
                        <ShieldCheck size={18} />
                    </>
                )}
            </button>
        </form>
    );
}
