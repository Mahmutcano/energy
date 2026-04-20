import React, { useState } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

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
    ytbsApiUsername?: string | null;
    ytbsApiPassword?: string | null;
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
        ytbsApiUsername: initialData?.ytbsApiUsername || '',
        ytbsApiPassword: initialData?.ytbsApiPassword || '',
        ytbsApiKey: initialData?.ytbsApiKey || '',
        baglantiAnlasmasiSirketiLisansNo: initialData?.baglantiAnlasmasiSirketiLisansNo || '',
        isActive: initialData?.isActive ?? true,
    });

    // Sync state with initialData when it changes (important for Modal reuse)
    React.useEffect(() => {
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
                ytbsApiUsername: initialData.ytbsApiUsername || '',
                ytbsApiPassword: initialData.ytbsApiPassword || '',
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Company Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="e.g. Enerji Corp."
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Tax Office</label>
                    <input
                        type="text"
                        value={formData.taxOffice || ''}
                        onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="Tax Office"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Tax Number</label>
                    <input
                        type="number"
                        value={formData.taxNumber || ''}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="Tax Number"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Email</label>
                    <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="Email"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Phone</label>
                    <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="Phone"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Representative</label>
                    <input
                        type="text"
                        value={formData.representative || ''}
                        onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="Representative Name"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Address</label>
                    <textarea
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none resize-none h-16 transition-all"
                        placeholder="Company address"
                    />
                </div>

                {/* YTBS Section */}
                <div className="md:col-span-2 pt-4 border-t border-slate-800/40">
                    <h4 className="text-[10px] font-black text-brand-green uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                        YTBS Integration Details
                    </h4>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS Portal Username</label>
                    <input
                        type="text"
                        value={formData.ytbsUsername || ''}
                        onChange={(e) => setFormData({ ...formData, ytbsUsername: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all font-mono"
                        placeholder="YTBS Portal Username"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS Portal Password</label>
                    <input
                        type="password"
                        value={formData.ytbsPassword || ''}
                        onChange={(e) => setFormData({ ...formData, ytbsPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all font-mono"
                        placeholder="YTBS Portal Password"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS API Username</label>
                    <input
                        type="text"
                        value={formData.ytbsApiUsername || ''}
                        onChange={(e) => setFormData({ ...formData, ytbsApiUsername: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all font-mono"
                        placeholder="YTBS API Username"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS API Password</label>
                    <input
                        type="password"
                        value={formData.ytbsApiPassword || ''}
                        onChange={(e) => setFormData({ ...formData, ytbsApiPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all font-mono"
                        placeholder="YTBS API Password"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS API Key</label>
                    <input
                        type="text"
                        value={formData.ytbsApiKey || ''}
                        onChange={(e) => setFormData({ ...formData, ytbsApiKey: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all font-mono"
                        placeholder="YTBS API Key"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">YTBS Lisans No</label>
                    <input
                        type="text"
                        value={formData.baglantiAnlasmasiSirketiLisansNo || ''}
                        onChange={(e) => setFormData({ ...formData, baglantiAnlasmasiSirketiLisansNo: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-all"
                        placeholder="License Number"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Status</span>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className="text-brand-green transition-transform active:scale-95"
                >
                    {formData.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
                </button>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase"
            >
                {isSubmitting ? 'Saving...' : submitLabel}
            </button>
        </form>
    );
}
