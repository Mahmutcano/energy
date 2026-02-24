"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { FileText, Plus, Search, X, Tag, ToggleLeft, ToggleRight, Pencil, Trash2, ArrowLeft, AlertCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
}

interface DataSheet {
    id: string;
    dataName: string;
    dataValue: string | null;
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
}

const defaultFormData = {
    dataName: '',
    dataValue: '',
    registerAddress: '',
    isActive: true,
    // Modbus
    functionCode: '',
    multiplier: '',
    wordSwap: false,
    // IEC104
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
};

// Form validation errors
interface FormErrors {
    [key: string]: string;
}

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
    const submittingRef = React.useRef(false);

    useEffect(() => {
        if (!profileId) return;

        const fetchData = async () => {
            try {
                const profileRes = await apiRequest('/api/datasheet-profiles');
                if (profileRes.ok) {
                    const profiles = await profileRes.json();
                    const p = profiles.find((x: any) => x.id === profileId);
                    if (p) setProfile(p);
                }

                const sheetRes = await apiRequest(`/api/datasheets?profileId=${profileId}`);
                if (sheetRes.ok) {
                    const sheets = await sheetRes.json();
                    setDataSheets(sheets);
                }
            } catch (err) {
                console.error("Failed to fetch datasheets:", err);
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
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (sheet: DataSheet) => {
        setPointToDelete(sheet);
    };

    const confirmDelete = async () => {
        if (!pointToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/datasheets/${pointToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Veri noktası başarıyla silindi');
                setDataSheets(dataSheets.filter(s => s.id !== pointToDelete.id));
                setPointToDelete(null);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Silme işlemi başarısız');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Bir hata oluştu');
        } finally {
            setIsDeleting(false);
        }
    };

    // Frontend validation
    const validateForm = (): boolean => {
        const errors: FormErrors = {};

        // dataName - always required
        const dataName = isModbus
            ? formData.dataName
            : (formData.dataName || formData.signalDescription || formData.componentId);
        if (!dataName || dataName.trim().length === 0) {
            if (isModbus) {
                errors.dataName = 'Data adı zorunludur';
            } else {
                errors.signalDescription = 'Sinyal açıklaması veya Komponent ID zorunludur';
            }
        }

        if (isModbus) {
            // registerAddress required for Modbus
            if (!formData.registerAddress) {
                errors.registerAddress = 'Register adresi zorunludur';
            } else if (parseInt(formData.registerAddress) < 0) {
                errors.registerAddress = 'Register adresi 0 veya daha büyük olmalıdır';
            }
        } else {
            // IEC104 - IOA obje adresi required
            if (!formData.ioa1ObjectAddress) {
                errors.ioa1ObjectAddress = 'IOA Obje Adresi zorunludur';
            } else if (parseInt(formData.ioa1ObjectAddress) < 0) {
                errors.ioa1ObjectAddress = 'IOA Obje Adresi 0 veya daha büyük olmalıdır';
            }

            // feederName max length
            if (formData.feederName && formData.feederName.length > 100) {
                errors.feederName = 'Fider/Hücre ismi en fazla 100 karakter olmalıdır';
            }

            // signalType max length
            if (formData.signalType && formData.signalType.length > 100) {
                errors.signalType = 'Sinyal tipi en fazla 100 karakter olmalıdır';
            }

            // signalDescription max length
            if (formData.signalDescription && formData.signalDescription.length > 250) {
                errors.signalDescription = 'Sinyal açıklaması en fazla 250 karakter olmalıdır';
            }

            // componentText max length
            if (formData.componentText && formData.componentText.length > 250) {
                errors.componentText = 'Komponent metni en fazla 250 karakter olmalıdır';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;

        setServerError('');

        if (!validateForm()) return;

        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const num = (val: string) => val ? parseFloat(val) : undefined;
            const int = (val: string) => val ? parseInt(val, 10) : undefined;

            // Data name auto-fill for IEC104
            const dataName = isModbus
                ? formData.dataName
                : (formData.dataName || formData.signalDescription || formData.componentId || 'IEC104-Point');

            const body: any = {
                profile_id: profileId,
                dataName,
                dataValue: formData.dataValue || null,
                registerAddress: int(formData.registerAddress),
                isActive: formData.isActive,
            };

            if (isModbus) {
                body.functionCode = int(formData.functionCode);
                body.multiplier = num(formData.multiplier);
                body.wordSwap = formData.wordSwap;
            } else {
                body.feederName = formData.feederName || null;
                body.signalType = formData.signalType || null;
                body.signalDescription = formData.signalDescription || null;
                body.dataType = formData.dataType || null;
                body.signalSource = formData.signalSource || null;
                body.componentId = formData.componentId || null;
                body.componentText = formData.componentText || null;
                body.ioa1ObjectAddress = int(formData.ioa1ObjectAddress);
                body.ioa2CellNo = int(formData.ioa2CellNo);
                body.ioa3VoltageLevel = int(formData.ioa3VoltageLevel);
                body.scadaAddress = int(formData.scadaAddress);
            }

            const url = editingSheet ? `/api/datasheets/${editingSheet.id}` : '/api/datasheets';
            const method = editingSheet ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingSheet ? 'Veri noktası güncellendi' : 'Veri noktası oluşturuldu');
                setIsModalOpen(false);
                setFormData(defaultFormData);
                setEditingSheet(null);
                setFormErrors({});
                setServerError('');
                const newData = await res.json();
                if (method === 'POST') {
                    setDataSheets([...dataSheets, newData]);
                } else {
                    setDataSheets(dataSheets.map(s => s.id === newData.id ? newData : s));
                }
            } else {
                const data = await res.json();
                if (typeof data.error === 'string') {
                    setServerError(data.error);
                } else if (Array.isArray(data.error)) {
                    const errMsg = data.error.map((e: any) => e.message).join(', ');
                    setServerError(errMsg);
                } else {
                    setServerError('İşlem başarısız oldu');
                }
            }
        } catch (err) {
            console.error('Create/Update error:', err);
            setServerError('Sunucu hatası oluştu');
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const filteredSheets = dataSheets.filter(s =>
        s.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.dataValue && s.dataValue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.signalDescription && s.signalDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.feederName && s.feederName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.componentId && s.componentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.componentText && s.componentText.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!profileId) {
        return (
            <div className="p-8 text-white space-y-4">
                <h1 className="text-2xl font-bold">Hata</h1>
                <p>Veri noktalarını görüntülemek için profil ID gereklidir.</p>
                <button onClick={() => router.back()} className="px-4 py-2 bg-slate-800 rounded-lg">Geri Dön</button>
            </div>
        );
    }

    // Style helpers
    const cellClass = "px-3 py-3 text-xs text-slate-300 whitespace-nowrap";
    const headerCellClass = "px-3 py-3 whitespace-nowrap";
    const inputClass = "w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 outline-none transition-colors";
    const inputErrorClass = "w-full px-4 py-3 bg-slate-900/50 border border-red-500/50 rounded-xl text-sm text-white focus:border-red-400 outline-none transition-colors";
    const labelClass = "text-xs font-bold text-slate-400 tracking-widest";

    const InputField = ({ label, name, value, onChange, placeholder, type = 'text', required = false, step, maxLength }: {
        label: string; name: string; value: string; onChange: (val: string) => void;
        placeholder?: string; type?: string; required?: boolean; step?: string; maxLength?: number;
    }) => (
        <div className="space-y-2">
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    if (formErrors[name]) {
                        setFormErrors({ ...formErrors, [name]: '' });
                    }
                }}
                className={formErrors[name] ? inputErrorClass : inputClass}
                placeholder={placeholder}
                required={required}
                step={step}
                maxLength={maxLength}
            />
            {formErrors[name] && (
                <p className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle size={10} /> {formErrors[name]}
                </p>
            )}
            {maxLength && value.length > 0 && (
                <p className={`text-[9px] text-right ${value.length > maxLength ? 'text-red-400' : 'text-slate-700'}`}>
                    {value.length}/{maxLength}
                </p>
            )}
        </div>
    );

    return (
        <div className="space-y-8 pb-16 animate-in-up font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="w-1.5 h-8 bg-brand-green rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {profile ? `${profile.name} - Veri Noktaları` : 'Yükleniyor...'}
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-16">{protocolType} profili için veri eşleme noktalarını yönetin.</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> Nokta Ekle
                </button>
            </div>

            {/* Search */}
            <div className="card-base p-2 bg-slate-900/40">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="İsim, açıklama, değer veya komponent ile ara..."
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card-base overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500 tracking-widest border-b border-slate-800/40 bg-slate-900/20">
                                {isModbus ? (
                                    <>
                                        <th className={headerCellClass}>DATA ADI</th>
                                        <th className={headerCellClass}>DATA DEĞERİ</th>
                                        <th className={headerCellClass}>REGISTER ADRESİ</th>
                                        <th className={headerCellClass}>FONKSİYON KODU</th>
                                        <th className={headerCellClass}>ÇARPAN</th>
                                        <th className={headerCellClass}>WORD SWAP</th>
                                    </>
                                ) : (
                                    <>
                                        <th className={headerCellClass}>FİDER/HÜCRE İSMİ</th>
                                        <th className={headerCellClass}>SİNYAL TİPİ</th>
                                        <th className={headerCellClass}>SİNYAL AÇIKLAMASI</th>
                                        <th className={headerCellClass}>DATA TİPİ</th>
                                        <th className={headerCellClass}>SİNYAL KAYNAĞI</th>
                                        <th className={headerCellClass}>KOMPONENT ID</th>
                                        <th className={headerCellClass}>KOMPONENT METNİ</th>
                                        <th className={headerCellClass}>IOA3 (OBJE ADRESİ)</th>
                                        <th className={headerCellClass}>IOA2 (HÜCRE NO)</th>
                                        <th className={headerCellClass}>IOA3 (GERİLİM SEVİYESİ)</th>
                                        <th className={headerCellClass}>SCADA ADRESİ</th>
                                    </>
                                )}
                                <th className={headerCellClass}>DURUM</th>
                                <th className={`${headerCellClass} text-right`}>İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isModbus ? 8 : 13} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Veri noktaları yükleniyor...</td></tr>
                            ) : filteredSheets.length === 0 ? (
                                <tr><td colSpan={isModbus ? 8 : 13} className="px-6 py-12 text-center text-sm text-slate-500">Bu profilde veri noktası bulunamadı.</td></tr>
                            ) : filteredSheets.map((sheet) => (
                                <tr key={sheet.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                                    {isModbus ? (
                                        <>
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-2">
                                                    <Tag size={14} className="text-slate-600 flex-shrink-0" />
                                                    <span className="font-bold text-white">{sheet.dataName}</span>
                                                </div>
                                            </td>
                                            <td className={`${cellClass} text-slate-400`}>{sheet.dataValue ?? '-'}</td>
                                            <td className={`${cellClass} font-mono tabular-nums text-amber-400 font-bold`}>{sheet.registerAddress ?? '-'}</td>
                                            <td className={cellClass}>
                                                {sheet.functionCode ? (
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                                        FC{sheet.functionCode}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className={`${cellClass} font-mono tabular-nums text-slate-400`}>{sheet.multiplier ?? '-'}</td>
                                            <td className={cellClass}>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${sheet.wordSwap ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-600'}`}>
                                                    {sheet.wordSwap ? 'Evet' : 'Hayır'}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={cellClass}>
                                                <span className="font-semibold text-white">{sheet.feederName ?? '-'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                {sheet.signalType ? (
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                                        {sheet.signalType}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className={`${cellClass} max-w-[180px] truncate`} title={sheet.signalDescription ?? ''}>
                                                {sheet.signalDescription ?? '-'}
                                            </td>
                                            <td className={cellClass}>
                                                {sheet.dataType ? (
                                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                                                        {sheet.dataType}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className={cellClass}>{sheet.signalSource ?? '-'}</td>
                                            <td className={`${cellClass} font-mono text-slate-400`}>{sheet.componentId ?? '-'}</td>
                                            <td className={`${cellClass} max-w-[160px] truncate`} title={sheet.componentText ?? ''}>
                                                {sheet.componentText ?? '-'}
                                            </td>
                                            <td className={`${cellClass} font-mono tabular-nums text-amber-400 font-bold`}>{sheet.ioa1ObjectAddress ?? '-'}</td>
                                            <td className={`${cellClass} font-mono tabular-nums text-slate-400`}>{sheet.ioa2CellNo ?? '-'}</td>
                                            <td className={`${cellClass} font-mono tabular-nums text-slate-400`}>{sheet.ioa3VoltageLevel ?? '-'}</td>
                                            <td className={`${cellClass} font-mono tabular-nums text-cyan-400 font-bold`}>{sheet.scadaAddress ?? '-'}</td>
                                        </>
                                    )}
                                    <td className={cellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sheet.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold ${sheet.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {sheet.isActive ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex justify-end gap-2">
                                            <button title="Düzenle" onClick={() => openEditModal(sheet)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <Pencil size={14} />
                                            </button>
                                            <button title="Sil" onClick={() => handleDeleteClick(sheet)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="flex items-center justify-between px-4 py-3 card-base bg-slate-900/30 text-xs">
                <span className="text-slate-500">
                    Toplam <span className="font-bold text-white">{filteredSheets.length}</span> / {dataSheets.length} veri noktası
                </span>
                <span className="text-slate-500">
                    Protokol: <span className="font-bold text-brand-green">{protocolType}</span>
                </span>
            </div>

            {/* ======================== MODAL ======================== */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-3xl bg-slate-950 border-slate-800 overflow-hidden shadow-2xl my-8 mt-24"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <FileText size={18} className="text-brand-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{editingSheet ? 'Nokta Düzenle' : 'Nokta Ekle'}</h2>
                                        <p className="text-[10px] text-slate-500 tracking-widest">{protocolType} Veri Noktası — {profile?.name}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                                {/* Server Error */}
                                {serverError && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                                        <AlertCircle size={18} className="flex-shrink-0" />
                                        <span>{serverError}</span>
                                    </div>
                                )}

                                {isModbus ? (
                                    <>
                                        {/* ============ MODBUS FIELDS ============ */}
                                        <div className="space-y-1 mb-2">
                                            <h3 className="text-xs font-bold text-blue-400 tracking-widest">MODBUS ALANLARI</h3>
                                            <p className="text-[10px] text-slate-600">Modbus protokolü için gerekli tüm alanlar.</p>
                                        </div>

                                        {/* Row 1: Data Adı + Data Değeri */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="DATA ADI" name="dataName" required
                                                value={formData.dataName}
                                                onChange={(val) => setFormData({ ...formData, dataName: val })}
                                                placeholder="Ör: Current L1, Voltage L1-N"
                                            />
                                            <InputField
                                                label="DATA DEĞERİ" name="dataValue"
                                                value={formData.dataValue}
                                                onChange={(val) => setFormData({ ...formData, dataValue: val })}
                                                placeholder="Ör: A, V, kW"
                                            />
                                        </div>

                                        {/* Row 2: Register Adresi + Fonksiyon Kodu */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="REGISTER ADRESİ" name="registerAddress" type="number" required
                                                value={formData.registerAddress}
                                                onChange={(val) => setFormData({ ...formData, registerAddress: val })}
                                                placeholder="Ör: 40001"
                                            />
                                            <div className="space-y-2">
                                                <label className={labelClass}>FONKSİYON KODU</label>
                                                <select
                                                    value={formData.functionCode}
                                                    onChange={(e) => setFormData({ ...formData, functionCode: e.target.value })}
                                                    className={inputClass}
                                                >
                                                    <option value="">Fonksiyon Seçin</option>
                                                    <option value="1">1 - Read Coils</option>
                                                    <option value="2">2 - Read Discrete Inputs</option>
                                                    <option value="3">3 - Read Holding Registers</option>
                                                    <option value="4">4 - Read Input Registers</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Row 3: Çarpan + Word Swap */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="ÇARPAN (Multiplier)" name="multiplier" type="number" step="0.0001"
                                                value={formData.multiplier}
                                                onChange={(val) => setFormData({ ...formData, multiplier: val })}
                                                placeholder="Ör: 0.1, 10, 0.001"
                                            />
                                            <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40 self-end">
                                                <span className={labelClass}>WORD SWAP</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, wordSwap: !formData.wordSwap })}
                                                    className={formData.wordSwap ? "text-brand-green" : "text-slate-600"}
                                                >
                                                    {formData.wordSwap ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* ============ IEC104 FIELDS ============ */}
                                        <div className="space-y-1 mb-2">
                                            <h3 className="text-xs font-bold text-brand-green tracking-widest">IEC 104 DATA SHEET ALANLARI</h3>
                                            <p className="text-[10px] text-slate-600">Excel data sheet ile birebir eşleşen tüm alanlar.</p>
                                        </div>

                                        {/* Row 1: Fider/Hücre İsmi + Sinyal Tipi */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="FİDER / HÜCRE İSMİ" name="feederName" maxLength={100}
                                                value={formData.feederName}
                                                onChange={(val) => setFormData({ ...formData, feederName: val })}
                                                placeholder="Ör: H2"
                                            />
                                            <InputField
                                                label="SİNYAL TİPİ" name="signalType" maxLength={100}
                                                value={formData.signalType}
                                                onChange={(val) => setFormData({ ...formData, signalType: val })}
                                                placeholder="Ör: ANALOG ÖLÇÜM"
                                            />
                                        </div>

                                        {/* Row 2: Sinyal Açıklaması (full width) */}
                                        <InputField
                                            label="SİNYAL AÇIKLAMASI" name="signalDescription" maxLength={250}
                                            value={formData.signalDescription}
                                            onChange={(val) => setFormData({ ...formData, signalDescription: val })}
                                            placeholder="Ör: VAN (KV), IA (A), FREKANS (Hz)"
                                            required
                                        />

                                        {/* Row 3: Data Tipi + Sinyal Kaynağı */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="DATA TİPİ" name="dataType" maxLength={50}
                                                value={formData.dataType}
                                                onChange={(val) => setFormData({ ...formData, dataType: val })}
                                                placeholder="Ör: MFI"
                                            />
                                            <InputField
                                                label="SİNYAL KAYNAĞI" name="signalSource" maxLength={100}
                                                value={formData.signalSource}
                                                onChange={(val) => setFormData({ ...formData, signalSource: val })}
                                                placeholder="Ör: IED"
                                            />
                                        </div>

                                        {/* Row 4: Komponent ID + Komponent Metni */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="KOMPONENT ID" name="componentId" maxLength={100}
                                                value={formData.componentId}
                                                onChange={(val) => setFormData({ ...formData, componentId: val })}
                                                placeholder="Ör: V-AN, I-A, F"
                                            />
                                            <InputField
                                                label="KOMPONENT METNİ" name="componentText" maxLength={250}
                                                value={formData.componentText}
                                                onChange={(val) => setFormData({ ...formData, componentText: val })}
                                                placeholder="Ör: A Faz-Notr Gerilimi"
                                            />
                                        </div>

                                        {/* Row 5: IOA3 (Obje Adresi) + IOA2 (Hücre No) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="IOA3 (OBJE ADRESİ)" name="ioa1ObjectAddress" type="number" required
                                                value={formData.ioa1ObjectAddress}
                                                onChange={(val) => setFormData({ ...formData, ioa1ObjectAddress: val })}
                                                placeholder="Ör: 1, 2, 3..."
                                            />
                                            <InputField
                                                label="IOA2 (HÜCRE NO)" name="ioa2CellNo" type="number"
                                                value={formData.ioa2CellNo}
                                                onChange={(val) => setFormData({ ...formData, ioa2CellNo: val })}
                                                placeholder="Ör: 11"
                                            />
                                        </div>

                                        {/* Row 6: IOA3 (Gerilim Seviyesi) + SCADA Adresi */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField
                                                label="IOA3 (GERİLİM SEVİYESİ)" name="ioa3VoltageLevel" type="number"
                                                value={formData.ioa3VoltageLevel}
                                                onChange={(val) => setFormData({ ...formData, ioa3VoltageLevel: val })}
                                                placeholder="Ör: 31"
                                            />
                                            <InputField
                                                label="SCADA ADRESİ" name="scadaAddress" type="number"
                                                value={formData.scadaAddress}
                                                onChange={(val) => setFormData({ ...formData, scadaAddress: val })}
                                                placeholder="Ör: 2034433"
                                            />
                                        </div>

                                        {/* Row 7: Data Değeri + Register Adresi (optional extras) */}
                                        <div className="border-t border-slate-800/40 pt-5 mt-2">
                                            <div className="space-y-1 mb-4">
                                                <h3 className="text-xs font-bold text-slate-500 tracking-widest">EK ALANLAR</h3>
                                                <p className="text-[10px] text-slate-600">Opsiyonel ek veri noktası bilgileri.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputField
                                                    label="DATA ADI" name="dataName"
                                                    value={formData.dataName}
                                                    onChange={(val) => setFormData({ ...formData, dataName: val })}
                                                    placeholder="Otomatik doldurulur (Sinyal Açıklaması)"
                                                />
                                                <InputField
                                                    label="DATA DEĞERİ" name="dataValue"
                                                    value={formData.dataValue}
                                                    onChange={(val) => setFormData({ ...formData, dataValue: val })}
                                                    placeholder="Ör: kV, A, Hz"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Active Status Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                                    <span className={labelClass}>AKTİF DURUMU</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className="text-brand-green"
                                    >
                                        {formData.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-bold tracking-widest text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] transition-all"
                                >
                                    {isSubmitting ? 'Kaydediliyor...' : editingSheet ? 'Noktayı Güncelle' : 'Nokta Oluştur'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {pointToDelete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-base w-full max-w-sm bg-slate-950 border-red-500/30 overflow-hidden shadow-2xl shadow-red-500/10"
                        >
                            <div className="p-6 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
                                    <AlertTriangle size={32} />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">Veri Noktasını Sil</h3>
                                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                                        <span className="font-bold text-white">{isModbus ? pointToDelete.dataName : (pointToDelete.signalDescription || pointToDelete.componentId || 'Bu nokta')}</span> silmek istediğinize emin misiniz?
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4">
                                    <button
                                        onClick={() => setPointToDelete(null)}
                                        disabled={isDeleting}
                                        className="py-3 px-4 rounded-xl border border-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-900 transition-colors disabled:opacity-50 tracking-widest uppercase"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="py-3 px-4 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Siliniyor...
                                            </>
                                        ) : (
                                            'Evet, Sil'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DataSheetsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Yükleniyor...</div>}>
            <DataSheetsContent />
        </Suspense>
    );
}
