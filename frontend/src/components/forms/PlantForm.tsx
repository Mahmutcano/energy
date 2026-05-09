"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Building2, Cpu, Zap, Wind, Waves, ShieldCheck, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-grafana-panel/20 animate-pulse rounded-sm border border-grafana-border" />
});

export interface PlantFormData {
    companyId: string;
    plantName: string;
    latitude: string;
    longitude: string;
    plantType: 'SOLAR' | 'WIND' | 'HYDRO';
    ytbsCode: string;
    canSendYtbs: boolean;
}

interface PlantFormProps {
    initialData?: Partial<PlantFormData>;
    companies: { id: string; name: string }[];
    onSubmit: (data: PlantFormData) => void;
    onAddNewCompany?: () => void;
    isSubmitting: boolean;
    submitLabel: string;
}

export default function PlantForm({
    initialData,
    companies,
    onSubmit,
    onAddNewCompany,
    isSubmitting,
    submitLabel
}: PlantFormProps) {
    const [formData, setFormData] = useState<PlantFormData>({
        companyId: initialData?.companyId || '',
        plantName: initialData?.plantName || '',
        latitude: initialData?.latitude || '',
        longitude: initialData?.longitude || '',
        plantType: initialData?.plantType || 'SOLAR',
        ytbsCode: initialData?.ytbsCode || '',
        canSendYtbs: initialData?.canSendYtbs || false,
    });

    // Handle initialData changes during render to avoid cascading renders
    const [prevInitialData, setPrevInitialData] = useState(initialData);
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setFormData({
            companyId: initialData?.companyId || '',
            plantName: initialData?.plantName || '',
            latitude: initialData?.latitude || '',
            longitude: initialData?.longitude || '',
            plantType: initialData?.plantType || 'SOLAR',
            ytbsCode: initialData?.ytbsCode || '',
            canSendYtbs: initialData?.canSendYtbs || false,
        });
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 min-h-[500px]">
                {/* Left Side: Map Picker */}
                <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-[400px]">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-grafana-accent-blue" />
                            <label className="text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono">GEO_SPATIAL_COORDINATES</label>
                        </div>
                        <span className="text-[9px] text-grafana-accent-blue font-bold font-mono uppercase tracking-widest animate-pulse">Awaiting_Selection...</span>
                    </div>
                    <div className="flex-1 rounded-sm border border-grafana-border overflow-hidden shadow-2xl relative group">
                        <LocationPicker
                            initialPos={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : undefined}
                            onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat.toString(), longitude: lng.toString() })}
                        />
                        <div className="absolute top-4 right-4 z-[1000] p-3 bg-grafana-panel/90 backdrop-blur-md border border-grafana-border rounded-sm shadow-2xl pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
                            <div className="space-y-1">
                                <p className="text-[8px] font-bold text-grafana-text-secondary uppercase font-mono">LAT: <span className="text-white">{formData.latitude || '0.0000'}</span></p>
                                <p className="text-[8px] font-bold text-grafana-text-secondary uppercase font-mono">LNG: <span className="text-white">{formData.longitude || '0.0000'}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form Details */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="space-y-2.5">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                            <Building2 size={12} />
                            ORG_REGISTRY
                        </label>
                        <select
                            value={formData.companyId}
                            onChange={(e) => {
                                if (e.target.value === 'ADD_NEW' && onAddNewCompany) {
                                    onAddNewCompany();
                                } else {
                                    setFormData({ ...formData, companyId: e.target.value });
                                }
                            }}
                            className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono appearance-none cursor-pointer"
                            required
                        >
                            <option value="" className="bg-grafana-bg text-grafana-text-secondary">SELECT_ENTITY_CLUSTER</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id} className="bg-grafana-bg">{c.name.toUpperCase()}</option>
                            ))}
                            {onAddNewCompany && (
                                <option value="ADD_NEW" className="bg-grafana-accent-blue/20 text-grafana-accent-blue font-bold">
                                    + ADD_NEW_REGISTRY
                                </option>
                            )}
                        </select>
                    </div>

                    <div className="space-y-2.5">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                            <Cpu size={12} />
                            NODE_IDENTIFIER
                        </label>
                        <input
                            type="text"
                            value={formData.plantName}
                            onChange={(e) => setFormData({ ...formData, plantName: e.target.value })}
                            className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                            placeholder="OPERATIONAL_NAME_STRING"
                            required
                        />
                    </div>

                    <div className="space-y-2.5">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                            {formData.plantType === 'SOLAR' && <Zap size={12} className="text-grafana-accent-orange" />}
                            {formData.plantType === 'WIND' && <Wind size={12} className="text-grafana-accent-blue" />}
                            {formData.plantType === 'HYDRO' && <Waves size={12} className="text-grafana-accent-green" />}
                            POWER_GENERATION_MODE
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['SOLAR', 'WIND', 'HYDRO'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, plantType: type })}
                                    className={cn(
                                        "py-3 border rounded-sm text-[9px] font-bold uppercase font-mono transition-all tracking-widest",
                                        formData.plantType === type 
                                            ? "bg-grafana-accent-blue/10 border-grafana-accent-blue text-white shadow-[0_0_15px_rgba(87,148,242,0.1)]" 
                                            : "bg-grafana-bg border-grafana-border text-grafana-text-secondary hover:border-grafana-text-secondary/50"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-grafana-border/50 mt-2">
                        <div className="space-y-2.5">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-grafana-text-secondary tracking-[0.2em] uppercase font-mono ml-1">
                                <Terminal size={12} />
                                YTBS_IDENT_KEY
                            </label>
                            <input
                                type="text"
                                value={formData.ytbsCode}
                                onChange={(e) => setFormData({ ...formData, ytbsCode: e.target.value })}
                                className="w-full h-12 bg-grafana-bg border border-grafana-border rounded-sm px-4 text-xs font-bold text-white outline-none focus:border-grafana-accent-blue/50 focus:bg-grafana-panel/50 transition-all font-mono placeholder:text-grafana-text-secondary/20"
                                placeholder="PROTOCOL_HEX_IDENT"
                            />
                        </div>

                        <label className="flex items-center justify-between p-4 bg-grafana-panel/30 border border-grafana-border rounded-sm hover:border-grafana-accent-blue/30 transition-all cursor-pointer group">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className={formData.canSendYtbs ? "text-grafana-accent-green" : "text-grafana-text-secondary"} />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest font-mono group-hover:text-grafana-accent-blue transition-colors">DATA_EMISSION_PROTOCOL</span>
                                </div>
                                <span className="text-[8px] text-grafana-text-secondary uppercase font-mono">Allow this node to broadcast telemetry</span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.canSendYtbs}
                                    onChange={(e) => setFormData({ ...formData, canSendYtbs: e.target.checked })}
                                    className="peer sr-only"
                                />
                                <div className="w-12 h-6 bg-grafana-bg border border-grafana-border rounded-full peer peer-checked:bg-grafana-accent-green/20 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-grafana-text-secondary after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6 peer-checked:after:bg-grafana-accent-green"></div>
                            </div>
                        </label>
                    </div>

                    <div className="mt-auto">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-grafana-accent-blue disabled:opacity-50 text-white font-black tracking-[0.3em] text-xs rounded-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase flex items-center justify-center gap-3 font-mono"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {submitLabel.toUpperCase()}
                                    <Terminal size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
