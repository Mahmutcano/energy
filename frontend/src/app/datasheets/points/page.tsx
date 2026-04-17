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
    Layout
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

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
const inputClass = "w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-sm text-white focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 outline-none transition-all placeholder:text-slate-700";
const inputErrorClass = "w-full px-6 py-4 bg-slate-900 border border-red-500/50 rounded-2xl text-sm text-white focus:border-red-400 focus:ring-4 focus:ring-red-500/5 outline-none transition-all";
const labelClass = "text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mb-2 block";

const MODBUS_DATA_TYPES = [
    { label: 'BYTE (8 bit)', value: 'BYTE' },
    { label: 'WORD (16 bit)', value: 'WORD' },
    { label: 'DWORD (32 bit)', value: 'DWORD' },
    { label: 'FLOAT32', value: 'FLOAT32' },
    { label: 'INT16', value: 'INT16' },
    { label: 'UINT16', value: 'UINT16' },
    { label: 'INT32', value: 'INT32' },
    { label: 'UINT32', value: 'UINT32' },
];

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
        <label className={labelClass}>{label}{required && <span className="text-brand-green ml-1">*</span>}</label>
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
                toast.success('Point purged from registry');
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
                dataName: formData.dataName || formData.signalDescription || 'Point',
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
                toast.success('Registry Sync Successful');
                setIsModalOpen(false);
                const result = await res.json();
                const newData = result.success ? result.data : result;
                if (method === 'POST') setDataSheets([...dataSheets, newData]);
                else setDataSheets(dataSheets.map(s => s.id === newData.id ? newData : s));
            } else {
                const err = await res.json();
                setServerError(err.error?.message || 'Sync Failed');
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
                if (res.ok) toast.success('Bulk Migration Finished');
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
    const headerCellClass = "px-6 py-4 text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase border-b border-white/5";

    return (
        <div className="space-y-12 pb-24 font-sans selection:bg-brand-green/30">
            {/* --- KINETIC HEADER --- */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <motion.button 
                            whileHover={{ x: -4 }}
                            onClick={() => router.back()} 
                            className="p-3 rounded-2xl bg-[#0f172a]/80 border border-white/10 text-slate-400 hover:text-white transition-all shadow-xl"
                        >
                            <ArrowLeft size={20} />
                        </motion.button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 text-brand-green font-black text-[11px] tracking-[0.5em] uppercase opacity-80">
                                <Activity size={14} className="animate-pulse" /> 
                                {protocolType} Node Mapping
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                                {profile?.name} <span className="text-white/20">Schematic</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx" className="hidden" />
                    <motion.button whileHover={{ y: -2 }} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-4 bg-slate-900 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest text-[#00E5FF] shadow-xl hover:bg-[#00E5FF]/10 transition-all">
                        <Upload size={16} /> BULK INJECT
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        onClick={openCreateModal}
                        className="flex items-center gap-3 px-8 py-4 bg-brand-green text-[#020617] rounded-2xl text-[10px] font-black shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-brand-green/40 transition-all tracking-[0.2em] uppercase"
                    >
                        <Plus size={16} strokeWidth={3} /> Register Data Point
                    </motion.button>
                </div>
            </div>

            {/* --- KINETIC ACTIONS BAR --- */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="FILTER BY SCHEMATIC LABEL OR SIGNAL VECTOR..."
                        className="w-full pl-16 pr-8 py-5 bg-[#0f172a]/40 border border-white/5 rounded-3xl text-[10px] font-black tracking-widest text-white focus:outline-none focus:border-brand-green/30 focus:ring-8 focus:ring-brand-green/5 transition-all placeholder:text-slate-800 uppercase"
                    />
                </div>
                <div className="flex items-center gap-6 px-10 py-5 volt-card border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase">Registry Size</span>
                        <span className="text-xl font-black text-white tabular-nums">{filteredSheets.length}<span className="text-[10px] text-white/20 ml-2">PTS</span></span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase">Protocol Link</span>
                        <span className="text-xl font-black text-[#CCFF00]">{protocolType}</span>
                    </div>
                </div>
            </div>

            {/* --- KINETIC DATA TABLE --- */}
            <div className="volt-card overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                {isModbus ? (
                                    <>
                                        <th className={headerCellClass}>IDENTITY</th>
                                        <th className={headerCellClass}>VECTOR</th>
                                        <th className={headerCellClass}>ENCODING</th>
                                        <th className={headerCellClass}>ADDR</th>
                                        <th className={headerCellClass}>FC</th>
                                        <th className={headerCellClass}>DELTA</th>
                                        <th className={headerCellClass}>CAT</th>
                                    </>
                                ) : (
                                    <>
                                        <th className={headerCellClass}>FIDER</th>
                                        <th className={headerCellClass}>SIGNAL</th>
                                        <th className={headerCellClass}>DATA TYPE</th>
                                        <th className={headerCellClass}>IOA OBJ</th>
                                        <th className={headerCellClass}>SCADA ADDR</th>
                                        <th className={headerCellClass}>CAT</th>
                                    </>
                                )}
                                <th className={headerCellClass}>REC</th>
                                <th className={headerCellClass}>STATE</th>
                                <th className={`${headerCellClass} text-right`}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                <tr><td colSpan={10} className="px-12 py-24 text-center animate-pulse text-[10px] font-black text-slate-600 tracking-[0.5em] uppercase">Synchronizing with Registry...</td></tr>
                            ) : filteredSheets.length === 0 ? (
                                <tr><td colSpan={10} className="px-12 py-24 text-center text-[10px] font-black text-slate-700 tracking-[0.5em] uppercase">Zero Points Logged</td></tr>
                            ) : filteredSheets.map((sheet, i) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    key={sheet.id} 
                                    className="group hover:bg-white/[0.02] transition-colors relative"
                                >
                                    {isModbus ? (
                                        <>
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1 h-6 bg-brand-green/20 group-hover:bg-brand-green transition-all" />
                                                    <span className="text-white font-black group-hover:text-brand-green transition-colors uppercase">{sheet.dataName}</span>
                                                </div>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-slate-500 font-bold italic truncate max-w-[150px] block">{sheet.dataValue || 'RAW'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-purple-400">{sheet.dataType || 'UINT16'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[#CCFF00] font-black">{sheet.registerAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-cyan-400 font-black">FC{sheet.functionCode || 3}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-slate-600">x{sheet.multiplier || 1}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[10px] font-black text-slate-400 uppercase opacity-40">{sheet.measurementType || 'SYSTEM'}</span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1 h-6 bg-[#00E5FF]/20 group-hover:bg-[#00E5FF] transition-all" />
                                                    <span className="text-white font-black uppercase">{sheet.feederName || '-'}</span>
                                                </div>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-slate-400 font-bold">{sheet.signalDescription || sheet.dataName}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black text-purple-400">{sheet.dataType || 'IEC-VAL'}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[#CCFF00] font-black">{sheet.ioa1ObjectAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-cyan-400 font-black">{sheet.scadaAddress}</span>
                                            </td>
                                            <td className={cellClass}>
                                                <span className="text-[10px] font-black text-slate-400 uppercase opacity-40">{sheet.measurementType || 'TELEMETRY'}</span>
                                            </td>
                                        </>
                                    )}
                                    <td className={cellClass}>
                                        <span className="text-slate-600">{sheet.recordingInterval}s</span>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${sheet.isActive ? 'bg-brand-green shadow-[0_0_8px_#10B981]' : 'bg-white/10'}`} />
                                            <span className={`text-[9px] font-black tracking-widest ${sheet.isActive ? 'text-brand-green' : 'text-slate-700'}`}>{sheet.isActive ? 'ONLINE' : 'OFFLINE'}</span>
                                        </div>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                            <button onClick={() => openEditModal(sheet)} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-all text-slate-500">
                                                <Pencil size={12} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(sheet)} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:text-red-500 hover:bg-red-500/10 transition-all text-slate-500">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSheet ? 'Update Schematic' : 'Define Terminal Point'}
                subtitle={`${protocolType} Protocol Layer — Profile: ${profile?.name}`}
                icon={Database}
                maxWidth="5xl"
            >
                <form onSubmit={handleSubmit} className="space-y-8 p-4">
                    {serverError && (
                        <div className="flex items-center gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-black text-red-500 tracking-widest uppercase italic">
                            <AlertCircle size={16} /> {serverError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {isModbus ? (
                            <>
                                <div className="lg:col-span-2">
                                    <InputField 
                                        label="Terminal Label" required autoFocus 
                                        value={formData.dataName} onChange={(val:any) => setFormData({...formData, dataName: val})}
                                        placeholder="e.g. CORE_SENS_V_L1" 
                                    />
                                </div>
                                <InputField 
                                    label="Vector / Unit" 
                                    value={formData.dataValue} onChange={(val:any) => setFormData({...formData, dataValue: val})}
                                    placeholder="e.g. VAC"
                                />
                                <InputField 
                                    label="Register Address" type="number" required
                                    value={formData.registerAddress} onChange={(val:any) => setFormData({...formData, registerAddress: val})}
                                    placeholder="40001"
                                />
                                <div className="space-y-2">
                                    <label className={labelClass}>Function Map</label>
                                    <select value={formData.functionCode} onChange={(e) => setFormData({...formData, functionCode: e.target.value})} className={inputClass}>
                                        <option value="3">03 - READ HOLDING</option>
                                        <option value="4">04 - READ INPUT</option>
                                        <option value="1">01 - READ COIL</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClass}>Multiplier</label>
                                    <select value={formData.multiplier} onChange={(e) => setFormData({...formData, multiplier: e.target.value})} className={inputClass}>
                                        <option value="1">1.00 - NATIVE</option>
                                        <option value="0.1">0.10 - DECI</option>
                                        <option value="0.01">0.01 - CENTI</option>
                                        <option value="10">10.00 - DECA</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <InputField label="Feeder Tag" value={formData.feederName} onChange={(val:any) => setFormData({...formData, feederName: val})} placeholder="H1" />
                                <div className="lg:col-span-2">
                                    <InputField label="Signal Description" required value={formData.signalDescription} onChange={(val:any) => setFormData({...formData, signalDescription: val})} placeholder="Phase L1 Voltage" />
                                </div>
                                <InputField label="IOA Object Addr" type="number" required value={formData.ioa1ObjectAddress} onChange={(val:any) => setFormData({...formData, ioa1ObjectAddress: val})} placeholder="1000" />
                                <InputField label="Scada Address" type="number" value={formData.scadaAddress} onChange={(val:any) => setFormData({...formData, scadaAddress: val})} placeholder="200021" />
                            </>
                        )}
                        <div className="space-y-2">
                            <label className={labelClass}>Measurement Cat</label>
                            <select value={formData.measurementType} onChange={(e) => setFormData({...formData, measurementType: e.target.value})} className={inputClass}>
                                <option value="">SELECT TYPE...</option>
                                {MEASUREMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <InputField label="Rec Interval (S)" type="number" value={formData.recordingInterval} onChange={(val:any) => setFormData({...formData, recordingInterval: val})} />
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                        <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className="flex items-center gap-4 group">
                             <div className={`w-12 h-6 rounded-full border transition-all relative ${formData.isActive ? 'bg-brand-green/20 border-brand-green' : 'bg-slate-900 border-white/10'}`}>
                                <motion.div animate={{ x: formData.isActive ? 24 : 4 }} className={`w-4 h-4 rounded-full mt-[3px] ${formData.isActive ? 'bg-brand-green' : 'bg-slate-700'}`} />
                             </div>
                             <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] group-hover:text-white transition-colors">ACTIVE STATE</span>
                        </button>
                        <button
                            type="submit" disabled={isSubmitting}
                            className="px-12 py-5 bg-brand-green text-[#020617] font-black tracking-[0.3em] text-[10px] rounded-2xl hover:scale-[1.02] shadow-2xl shadow-brand-green/30 uppercase"
                        >
                            {isSubmitting ? 'SYNCHRONIZING...' : editingSheet ? 'UPDATE POINT' : 'REGISTER POINT'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!pointToDelete}
                onClose={() => setPointToDelete(null)}
                title="Purge Point" icon={AlertTriangle} maxWidth="sm"
            >
                <div className="text-center space-y-6 pt-4">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p className="text-lg font-black text-white tracking-tight uppercase">Purge Terminal Point?</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-2">
                             Point <span className="text-white font-bold">{pointToDelete?.dataName}</span> will be permanently removed from node schematic.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button onClick={() => setPointToDelete(null)} className="py-4 rounded-2xl border border-white/5 text-slate-500 font-black text-[9px] tracking-[0.3em] uppercase">Abort</button>
                        <button onClick={confirmDelete} className="py-4 rounded-2xl bg-red-500 text-white font-black text-[9px] tracking-[0.3em] uppercase shadow-2xl shadow-red-500/30">Confirm Purge</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function DataSheetsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Initialising Schema View...</div>}>
            <DataSheetsContent />
        </Suspense>
    );
}
