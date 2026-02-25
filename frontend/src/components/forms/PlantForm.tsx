import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-900 animate-pulse rounded-xl border border-slate-800" />
});

export interface PlantFormData {
    companyId: string;
    plantName: string;
    latitude: string;
    longitude: string;
    plantType: 'SOLAR' | 'WIND' | 'HYDRO';
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
    });

    // Sync state with initialData when it changes (important for Modal reuse)
    React.useEffect(() => {
        if (initialData) {
            setFormData({
                companyId: initialData.companyId || '',
                plantName: initialData.plantName || '',
                latitude: initialData.latitude || '',
                longitude: initialData.longitude || '',
                plantType: initialData.plantType || 'SOLAR',
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-[450px]">
                {/* Left Side: Map Picker */}
                <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-[350px]">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Plant Location</label>
                        <span className="text-[10px] text-slate-500 font-medium">Search or click to pick</span>
                    </div>
                    <LocationPicker
                        initialPos={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : undefined}
                        onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat.toString(), longitude: lng.toString() })}
                    />
                </div>

                {/* Right Side: Form Details */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Company</label>
                        <select
                            value={formData.companyId}
                            onChange={(e) => {
                                if (e.target.value === 'ADD_NEW' && onAddNewCompany) {
                                    onAddNewCompany();
                                } else {
                                    setFormData({ ...formData, companyId: e.target.value });
                                }
                            }}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                            required
                        >
                            <option value="">Select Company...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            {onAddNewCompany && (
                                <option value="ADD_NEW" className="font-bold text-brand-green bg-brand-green/10">
                                    + Add New Company
                                </option>
                            )}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Plant Name</label>
                        <input
                            type="text"
                            value={formData.plantName}
                            onChange={(e) => setFormData({ ...formData, plantName: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                            placeholder="e.g. Solar Plant Alpha"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Type</label>
                        <select
                            value={formData.plantType}
                            onChange={(e) => setFormData({ ...formData, plantType: e.target.value as any })}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                            required
                        >
                            <option value="SOLAR">Solar Power</option>
                            <option value="WIND">Wind Farm</option>
                            <option value="HYDRO">Hydroelectric</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-1">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.latitude}
                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-green/50 outline-none tabular-nums transition-all"
                                placeholder="38.4237"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-1">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.longitude}
                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-green/50 outline-none tabular-nums transition-all"
                                placeholder="27.1428"
                            />
                        </div>
                    </div>

                    <div className="mt-auto">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase mt-2"
                        >
                            {isSubmitting ? 'Saving...' : submitLabel}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
