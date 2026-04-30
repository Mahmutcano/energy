"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { 
    FileText, 
    Plus, 
    Search, 
    X, 
    Tag, 
    ToggleLeft, 
    ToggleRight, 
    Pencil, 
    Trash2, 
    ArrowLeft, 
    AlertCircle, 
    AlertTriangle, 
    Upload, 
    Download,
    Database,
    Binary,
    Activity,
    Cpu,
    Zap,
    ChevronRight,
    Layout,
    RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';

interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
}

interface DataSheet {
    id: string;
    dataName: string;
    dataValue: string | null;
    dataExplanation: string | null;
    registerAddress: number | null;
    isActive: boolean;
    // Modbus
    functionCode: number | null;
    multiplier: number | null;
    wordSwap: boolean | null;
    // IEC104
    feederName: string | null;
    signalType: string | null;
    signalDescription: string | null;
    dataType: string | null;
    signalSource: string | null;
    componentId: string | null;
    componentText: string | null;
    ioa1ObjectAddress: number | null;
    ioa2CellNo: number | null;
    ioa3VoltageLevel: number | null;
    scadaAddress: number | null;
    recordingInterval: number | null;
    measurementType: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}

const defaultFormData = {
    dataName: '',
    dataValue: '',
    dataExplanation: '',
    registerAddress: '',
    isActive: true,
    functionCode: '',
    multiplier: '',
    wordSwap: false,
    feederName: '',
    signalType: '',
    signalDescription: '',
    dataType: '',
    signalSource: '',
    componentId: '',
    componentText: '',
    ioa1ObjectAddress: '',
    ioa2CellNo: '',
    ioa3VoltageLevel: '',
    scadaAddress: '',
    recordingInterval: '60',
    measurementType: '',
};

interface FormErrors { [key: string]: string; }

// --- PREMIUM STYLING ---
const inputClass = "w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-sm text-white focus:border-grafana-accent-blue/50 focus:ring-4 focus:ring-grafana-accent-blue/5 outline-none transition-all placeholder:text-slate-700 font-mono";
const inputErrorClass = "w-full px-6 py-4 bg-slate-900 border border-red-500/50 rounded-2xl text-sm text-white focus:border-red-400 focus:ring-4 focus:ring-red-500/5 outline-none transition-all font-mono";
const labelClass = "text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mb-2 block";

const MEASUREMENT_TYPES = [
    { label: 'Faz Gerilimi', value: 'PHASE_VOLTAGE' },
    { label: 'Faz Akımı', value: 'PHASE_CURRENT' },
    { label: 'Aktif Güç', value: 'ACTIVE_POWER' },
    { label: 'Reaktif Güç', value: 'REACTIVE_POWER' },
    { label: 'Frekans', value: 'FREQUENCY' },
    { label: 'Aktif Enerji', value: 'ACTIVE_ENERGY' },
    { label: 'Reaktif Enerji', value: 'REACTIVE_ENERGY' },
    { label: 'Sıcaklık', value: 'TEMPERATURE' },
];

const InputField = ({ label, name, value, onChange, placeholder, type = 'text', required = false, error, autoFocus = false }: any) => (
    <div className="space-y-1">
        <label className={labelClass}>{label}{required && <span className="text-grafana-accent-blue ml-1">*</span>}</label>
        <input
            autoFocus={autoFocus}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? inputErrorClass : inputClass}
            placeholder={placeholder}
            required={required}
        />
        {error && <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
    </div>
);

function DataSheetsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const profileId = searchParams?.get('profileId') || '';
    const queryProtocolType = searchParams?.get('protocolType') || 'MODBUS';

    const [profile, setProfile] = useState<DatasheetProfile | null>(null);
    const [dataSheets, setDataSheets] = useState<DataSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSheet, setEditingSheet] = useState<DataSheet | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState(defaultFormData);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState('');
    const [pointToDelete, setPointToDelete] = useState<DataSheet | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleCloseModal = React.useCallback(() => setIsModalOpen(false), []);
    const submittingRef = React.useRef(false);

    useEffect(() => {
        if (!profileId) return;
        const fetchData = async () => {
            try {
                const profileRes = await apiRequest('/api/datasheet-profiles');
                if (profileRes.ok) {
                    const result = await profileRes.json();
                    const profiles = result.success ? result.data : result;
                    const p = Array.isArray(profiles) ? profiles.find((x: any) => x.id === profileId) : null;
                    if (p) setProfile(p);
                }
                const sheetRes = await apiRequest(`/api/datasheets?profileId=${profileId}`);
                if (sheetRes.ok) {
                    const result = await sheetRes.json();
                    const sheets = result.success ? result.data : result;
                    setDataSheets(Array.isArray(sheets) ? sheets : []);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [profileId]);

    const protocolType = profile?.protocolType || queryProtocolType;
    const isModbus = protocolType === 'MODBUS';

    const openCreateModal = () => {
        setEditingSheet(null);
        setFormData(defaultFormData);
        setFormErrors({});
        setServerError('');
        setIsModalOpen(true);
    };

    const openEditModal = (sheet: DataSheet) => {
        setEditingSheet(sheet);
        setFormErrors({});
        setServerError('');
        setFormData({
            dataName: sheet.dataName || '',
            dataValue: sheet.dataValue || '',
            dataExplanation: sheet.dataExplanation || '',
            registerAddress: sheet.registerAddress?.toString() || '',
            isActive: sheet.isActive ?? true,
            functionCode: sheet.functionCode?.toString() || '',
            multiplier: sheet.multiplier?.toString() || '',
            wordSwap: sheet.wordSwap ?? false,
            feederName: sheet.feederName || '',
            signalType: sheet.signalType || '',
            signalDescription: sheet.signalDescription || '',
            dataType: sheet.dataType || '',
            signalSource: sheet.signalSource || '',
            componentId: sheet.componentId || '',
            componentText: sheet.componentText || '',
            ioa1ObjectAddress: sheet.ioa1ObjectAddress?.toString() || '',
            ioa2CellNo: sheet.ioa2CellNo?.toString() || '',
            ioa3VoltageLevel: sheet.ioa3VoltageLevel?.toString() || '',
            scadaAddress: sheet.scadaAddress?.toString() || '',
            recordingInterval: sheet.recordingInterval?.toString() || '60',
            measurementType: sheet.measurementType || '',
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (sheet: DataSheet) => setPointToDelete(sheet);

    const confirmDelete = async () => {
        if (!pointToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/datasheets/${pointToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Nokta kayıttan silindi');
                setDataSheets(dataSheets.filter(s => s.id !== pointToDelete.id));
                setPointToDelete(null);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const num = (v: string) => v ? parseFloat(v) : undefined;
            const int = (v: string) => v ? parseInt(v, 10) : undefined;

            const body: any = {
                profileId,
                dataName: formData.dataName || formData.signalDescription || 'Nokta',
                dataValue: formData.dataValue || null,
                dataExplanation: formData.dataExplanation || null,
                registerAddress: int(formData.registerAddress),
                isActive: formData.isActive,
                recordingInterval: int(formData.recordingInterval),
                measurementType: formData.measurementType || null,
                dataType: formData.dataType || null,
            };

            if (isModbus) {
                body.functionCode = int(formData.functionCode);
                body.multiplier = num(formData.multiplier);
                body.wordSwap = formData.wordSwap;
            } else {
                body.feederName = formData.feederName || null;
                body.signalType = formData.signalType || null;
                body.signalDescription = formData.signalDescription || null;
                body.ioa1ObjectAddress = int(formData.ioa1ObjectAddress);
                body.scadaAddress = int(formData.scadaAddress);
            }

            const url = editingSheet ? `/api/datasheets/${editingSheet.id}` : '/api/datasheets';
            const method = editingSheet ? 'PATCH' : 'POST';
            const res = await apiRequest(url, { method, body: JSON.stringify(body) });

            if (res.ok) {
                toast.success('Kayıt Senkronizasyonu Başarılı');
                setIsModalOpen(false);
                const result = await res.json();
                const newData = result.success ? result.data : result;
                if (method === 'POST') setDataSheets([...dataSheets, newData]);
                else setDataSheets(dataSheets.map(s => s.id === newData.id ? newData : s));
            } else {
                const err = await res.json();
                setServerError(err.error?.message || 'Senkronizasyon Başarısız');
            }
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleExcelImport = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event: any) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const res = await apiRequest('/api/datasheets/bulk', {
                    method: 'POST',
                    body: JSON.stringify({ profileId, points: json })
                });
                if (res.ok) toast.success('Toplu Aktarım Tamamlandı');
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const filteredSheets = dataSheets.filter(s => 
        s.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.signalDescription && s.signalDescription.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a,b) => (a.registerAddress || 0) - (b.registerAddress || 0));

    const cellClass = "px-6 py-5 text-[11px] font-black text-white/70 whitespace-nowrap tabular-nums tracking-widest";
    const headerCellClass = "px-6 py-4 text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase border-b border-white/5 font-mono";

    return (
        <div className="space-y-8 pb-24 font-sans selection:bg-grafana-accent-blue/30">
            {/* --- HEADER --- */}
            <PageHeader 
                title={profile?.name || "ŞEMATİK"} 
                highlightedTitle="DÜĞÜM EŞLEME"
                subtitle={`${protocolType} katmanı için endüstriyel veri noktası konfigürasyon matrisi`}
                icon={Layout}
            >
                <div className="flex flex-wrap items-center gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx" className="hidden" />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-3 px-5 py-2.5 bg-grafana-bg border border-grafana-border text-grafana-accent-blue rounded-sm text-[10px] font-bold hover:bg-grafana-panel transition-all tracking-widest uppercase font-mono"
                    >
                        <Upload size={14} /> TOPLU AKTAR
                    </button>
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-3 px-5 py-2.5 bg-grafana-accent-blue text-white rounded-sm text-[10px] font-bold shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all tracking-widest uppercase font-mono"
                    >
                        <Plus size={14} strokeWidth={3} /> NOKTA EKLE
                    </button>
                </div>
            </PageHeader>

            {/* --- ACTIONS BAR --- */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SİNYAL VEYA ADRES FİLTRELE..."
                        className="w-full pl-12 pr-6 py-3 bg-grafana-bg border border-grafana-border rounded-sm text-[10px] font-bold tracking-widest text-white focus:outline-none focus:border-grafana-accent-blue/50 transition-all placeholder:text-grafana-text-secondary/50 uppercase font-mono"
                    />
                </div>
                <div className="flex items-center gap-4 px-6 py-2.5 bg-grafana-panel/50 border border-grafana-border rounded-sm">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-grafana-text-secondary tracking-widest uppercase font-mono">Toplam</span>
                        <span className="text-sm font-bold text-white tabular-nums font-mono">{filteredSheets.length}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-grafana-border" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-grafana-text-secondary tracking-widest uppercase font-mono">Mod</span>
                        <span className="text-sm font-bold text-grafana-accent-blue font-mono">{protocolType}</span>
                    </div>
                </div>
            </div>

            {/* --- DATA TABLE --- */}
            <div className="bg-grafana-panel/30 border border-grafana-border rounded-sm overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                {isModbus ? (
                                    <>
                                        <th>ETİKET</th>
                                        <th>BİRİM</th>
                                        <th>TİP</th>
                                        <th>ADRES</th>
                                        <th>FC</th>
                                        <th>ÇARPAN</th>
                                        <th>KAT</th>
                                    </>
                                ) : (
                                    <>
                                        <th>FİDER</th>
                                        <th>AÇIKLAMA</th>
                                        <th>TİP</th>
                                        <th>IOA</th>
                                        <th>SCADA</th>
                                        <th>KAT</th>
                                    </>
                                )}
                                <th>KAYIT</th>
                                <th>DURUM</th>
                                <th className="text-right">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                <tr><td colSpan={10} className="px-12 py-24 text-center animate-pulse text-[10px] font-bold text-grafana-text-secondary tracking-[0.5em] uppercase font-mono">Senkronize Ediliyor...</td></tr>
                            ) : filteredSheets.length === 0 ? (
                                <tr><td colSpan={10} className="px-12 py-24 text-center text-[10px] font-bold text-grafana-text-secondary tracking-[0.5em] uppercase font-mono">Kayıt Bulunamadı</td></tr>
                            ) : filteredSheets.map((sheet, i) => (
                                <tr key={sheet.id} className="group hover:bg-white/[0.02] transition-colors">
                                    {isModbus ? (
                                        <>
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1 h-5 bg-grafana-accent-blue/20 group-hover:bg-grafana-accent-blue transition-all" />
                                                    <span className="text-white font-bold group-hover:text-grafana-accent-blue transition-colors uppercase font-mono">{sheet.dataName}</span>
                                                </div>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-text-secondary font-mono italic">{sheet.dataValue || 'HAM'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="px-2 py-0.5 rounded-sm bg-slate-900 border border-slate-800 text-[9px] font-bold text-purple-400 font-mono">{sheet.dataType || 'UINT16'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-accent-blue font-bold font-mono">{sheet.registerAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-accent-orange font-bold font-mono">FC{sheet.functionCode || 3}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-text-secondary font-mono">x{sheet.multiplier || 1}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[10px] font-bold text-grafana-text-secondary/50 uppercase font-mono">{sheet.measurementType || 'SİSTEM'}</span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1 h-5 bg-grafana-accent-blue/20 group-hover:bg-grafana-accent-blue transition-all" />
                                                    <span className="text-white font-bold uppercase font-mono">{sheet.feederName || '-'}</span>
                                                </div>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-text-secondary font-bold font-mono">{sheet.signalDescription || sheet.dataName}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="px-2 py-0.5 rounded-sm bg-slate-900 border border-slate-800 text-[9px] font-bold text-purple-400 font-mono">{sheet.dataType || 'IEC-VAL'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-accent-blue font-bold font-mono">{sheet.ioa1ObjectAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-grafana-accent-orange font-bold font-mono">{sheet.scadaAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[10px] font-bold text-grafana-text-secondary/50 uppercase font-mono">{sheet.measurementType || 'TELEMETRİ'}</span>
                                            </td>
                                        </>
                                    )}
                                    <td className={cellClass}>
                                        <span className="text-grafana-text-secondary font-mono">{sheet.recordingInterval}s</span>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", sheet.isActive ? 'bg-grafana-accent-green shadow-[0_0_8px_#73bf69]' : 'bg-slate-800')} />
                                            <span className={cn("text-[9px] font-bold tracking-widest font-mono", sheet.isActive ? 'text-grafana-accent-green' : 'text-slate-700')}>{sheet.isActive ? 'AKTİF' : 'PASİF'}</span>
                                        </div>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => openEditModal(sheet)} className="p-1.5 rounded-sm bg-slate-900 border border-slate-800 hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all text-grafana-text-secondary">
                                                <Pencil size={12} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(sheet)} className="p-1.5 rounded-sm bg-slate-900 border border-slate-800 hover:text-grafana-accent-red hover:border-grafana-accent-red/50 transition-all text-grafana-text-secondary">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSheet ? 'Nokta Güncelleme' : 'Nokta Tanımlama'}
                subtitle={`${protocolType} Protokol Katmanı`}
                icon={Database}
                maxWidth="5xl"
            >
                <form onSubmit={handleSubmit} className="space-y-8 p-4">
                    {serverError && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-sm text-[10px] font-bold text-red-500 tracking-widest uppercase font-mono">
                            <AlertCircle size={14} /> {serverError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isModbus ? (
                            <>
                                <div className="lg:col-span-2">
                                    <InputField 
                                        label="Terminal Etiketi" required autoFocus 
                                        value={formData.dataName} onChange={(val:any) => setFormData({...formData, dataName: val})}
                                        placeholder="örn. CORE_SENS_V_L1" 
                                    />
                                </div>
                                <InputField 
                                    label="Birim / Vektör" 
                                    value={formData.dataValue} onChange={(val:any) => setFormData({...formData, dataValue: val})}
                                    placeholder="örn. VAC"
                                />
                                <InputField 
                                    label="Register Adresi" type="number" required
                                    value={formData.registerAddress} onChange={(val:any) => setFormData({...formData, registerAddress: val})}
                                    placeholder="40001"
                                />
                                <div className="space-y-2">
                                    <label className={labelClass}>Fonksiyon Haritası</label>
                                    <select value={formData.functionCode} onChange={(e) => setFormData({...formData, functionCode: e.target.value})} className={inputClass}>
                                        <option value="3">03 - READ HOLDING</option>
                                        <option value="4">04 - READ INPUT</option>
                                        <option value="1">01 - READ COIL</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClass}>Çarpan</label>
                                    <select value={formData.multiplier} onChange={(e) => setFormData({...formData, multiplier: e.target.value})} className={inputClass}>
                                        <option value="1">1.00 - HAM</option>
                                        <option value="0.1">0.10 - DESİ</option>
                                        <option value="0.01">0.01 - SANTİ</option>
                                        <option value="10">10.00 - DEKA</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <InputField label="Fider Etiketi" value={formData.feederName} onChange={(val:any) => setFormData({...formData, feederName: val})} placeholder="H1" />
                                <div className="lg:col-span-2">
                                    <InputField label="Sinyal Açıklaması" required value={formData.signalDescription} onChange={(val:any) => setFormData({...formData, signalDescription: val})} placeholder="Faz L1 Gerilimi" />
                                </div>
                                <InputField label="IOA Nesne Adresi" type="number" required value={formData.ioa1ObjectAddress} onChange={(val:any) => setFormData({...formData, ioa1ObjectAddress: val})} placeholder="1000" />
                                <InputField label="Scada Adresi" type="number" value={formData.scadaAddress} onChange={(val:any) => setFormData({...formData, scadaAddress: val})} placeholder="200021" />
                            </>
                        )}
                        <div className="space-y-2">
                            <label className={labelClass}>Ölçüm Kategorisi</label>
                            <select value={formData.measurementType} onChange={(e) => setFormData({...formData, measurementType: e.target.value})} className={inputClass}>
                                <option value="">TİP SEÇ...</option>
                                {MEASUREMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <InputField label="Kayıt Aralığı (S)" type="number" value={formData.recordingInterval} onChange={(val:any) => setFormData({...formData, recordingInterval: val})} />
                    </div>

                    <div className="pt-6 border-t border-grafana-border flex items-center justify-between">
                        <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className="flex items-center gap-4 group">
                             <div className={`w-10 h-5 rounded-full border transition-all relative ${formData.isActive ? 'bg-grafana-accent-green/20 border-grafana-accent-green' : 'bg-slate-900 border-slate-800'}`}>
                                <motion.div animate={{ x: formData.isActive ? 20 : 2 }} className={`w-3 h-3 rounded-full mt-[3px] ${formData.isActive ? 'bg-grafana-accent-green' : 'bg-slate-700'}`} />
                             </div>
                             <span className="text-[9px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono">AKTİF DURUM</span>
                        </button>
                        <button
                            type="submit" disabled={isSubmitting}
                            className="px-8 py-3 bg-grafana-accent-blue text-white font-bold tracking-widest text-[10px] rounded-sm hover:bg-grafana-accent-blue/90 transition-all uppercase shadow-lg shadow-grafana-accent-blue/20 font-mono"
                        >
                            {isSubmitting ? 'SENKRONİZE EDİLİYOR...' : editingSheet ? 'GÜNCELLE' : 'KAYDET'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!pointToDelete}
                onClose={() => setPointToDelete(null)}
                title="Noktayı Sil" icon={AlertTriangle} maxWidth="sm"
            >
                <div className="text-center space-y-6 pt-4">
                    <div className="w-16 h-16 rounded-sm bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-bold text-white tracking-tight uppercase">Terminal Noktası Silinsin mi?</p>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed font-medium">
                             <span className="text-white font-bold">{pointToDelete?.dataName}</span> kalıcı olarak kaldırılacaktır.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button onClick={() => setPointToDelete(null)} className="py-3 rounded-sm border border-grafana-border text-grafana-text-secondary font-bold text-[9px] tracking-widest uppercase font-mono">VAZGEÇ</button>
                        <button onClick={confirmDelete} className="py-3 rounded-sm bg-grafana-accent-red text-white font-bold text-[9px] tracking-widest uppercase shadow-lg shadow-grafana-accent-red/20 font-mono">SİLMEYİ ONAYLA</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function DataSheetsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Şema Görünümü Başlatılıyor...</div>}>
            <DataSheetsContent />
        </Suspense>
    );
}
