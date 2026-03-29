"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { FileText, Plus, Search, X, Tag, ToggleLeft, ToggleRight, Pencil, Trash2, ArrowLeft, AlertCircle, AlertTriangle, Upload, Download } from 'lucide-react';
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
    recordingInterval: '1',
};

// Form validation errors
interface FormErrors {
    [key: string]: string;
}

// Style constants
const inputClass = "w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 outline-none transition-all";
const inputErrorClass = "w-full px-4 py-2.5 bg-slate-900/50 border border-red-500/50 rounded-xl text-sm text-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 outline-none transition-all";
const labelClass = "text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5 block";

const MODBUS_DATA_TYPES = [
    { label: 'BYTE (8 bit, 0-255)', value: 'BYTE' },
    { label: 'WORD (16 bit, 0-65535)', value: 'WORD' },
    { label: 'DWORD (32 bit, 0-4.2B)', value: 'DWORD' },
    { label: 'LWORD (64 bit)', value: 'LWORD' },
    { label: 'SINT (8 bit, -128 to 127)', value: 'SINT' },
    { label: 'USINT (8 bit, 0-255)', value: 'USINT' },
    { label: 'INT (16 bit, -32K to 32K)', value: 'INT' },
    { label: 'UINT (16 bit, 0-65K)', value: 'UINT' },
    { label: 'DINT (32 bit, -2.1B to 2.1B)', value: 'DINT' },
    { label: 'UDINT (32 bit, 0-4.2B)', value: 'UDINT' },
    { label: 'LINT (64 bit)', value: 'LINT' },
    { label: 'ULINT (64 bit)', value: 'ULINT' },
    { label: 'FLOAT32 (32 bit Float)', value: 'FLOAT32' },
    { label: 'DOUBLE64 (64 bit Double)', value: 'DOUBLE64' },
];

const InputField = ({ label, name, value, onChange, placeholder, type = 'text', required = false, step, maxLength, error, autoFocus = false }: {
    label: string; name: string; value: string; onChange: (val: string) => void;
    placeholder?: string; type?: string; required?: boolean; step?: string; maxLength?: number; error?: string; autoFocus?: boolean;
}) => (
    <div className="space-y-1.5">
        <label className={labelClass}>
            {label}
            {required && <span className="text-brand-green ml-1">*</span>}
        </label>
        <input
            autoFocus={autoFocus}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? inputErrorClass : inputClass}
            placeholder={placeholder}
            required={required}
            step={step}
            maxLength={maxLength}
        />
        {error && (
            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle size={12} /> {error}
            </p>
        )}
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
    const handleCloseModal = React.useCallback(() => {
        setIsModalOpen(false);
    }, []);
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
            recordingInterval: sheet.recordingInterval?.toString() || '1',
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
                toast.success('Data point deleted successfully');
                setDataSheets(dataSheets.filter(s => s.id !== pointToDelete.id));
                setPointToDelete(null);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Delete failed';
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('An error occurred');
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
                errors.dataName = 'Data name is required';
            } else {
                errors.signalDescription = 'Signal description or Component ID is required';
            }
        }

        if (isModbus) {
            // registerAddress required for Modbus
            if (!formData.registerAddress) {
                errors.registerAddress = 'Register address is required';
            } else if (parseInt(formData.registerAddress) < 0) {
                errors.registerAddress = 'Register address must be 0 or greater';
            }
        } else {
            // IEC104 - IOA obje adresi required
            if (!formData.ioa1ObjectAddress) {
                errors.ioa1ObjectAddress = 'IOA Object Address is required';
            } else if (parseInt(formData.ioa1ObjectAddress) < 0) {
                errors.ioa1ObjectAddress = 'IOA Object Address must be 0 or greater';
            }

            // feederName max length
            if (formData.feederName && formData.feederName.length > 100) {
                errors.feederName = 'Feeder/Cell name must be max 100 characters';
            }

            // signalType max length
            if (formData.signalType && formData.signalType.length > 100) {
                errors.signalType = 'Signal type must be max 100 characters';
            }

            // signalDescription max length
            if (formData.signalDescription && formData.signalDescription.length > 250) {
                errors.signalDescription = 'Signal description must be max 250 characters';
            }

            // componentText max length
            if (formData.componentText && formData.componentText.length > 250) {
                errors.componentText = 'Component text must be max 250 characters';
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
                profileId: profileId,
                dataName,
                dataValue: formData.dataValue || null,
                dataExplanation: formData.dataExplanation || null,
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
                body.signalSource = formData.signalSource || null;
                body.componentId = formData.componentId || null;
                body.componentText = formData.componentText || null;
                body.ioa1ObjectAddress = int(formData.ioa1ObjectAddress);
                body.ioa2CellNo = int(formData.ioa2CellNo);
                body.ioa3VoltageLevel = int(formData.ioa3VoltageLevel);
                body.scadaAddress = int(formData.scadaAddress);
            }
            body.dataType = formData.dataType || null;
            body.recordingInterval = int(formData.recordingInterval);

            const url = editingSheet ? `/api/datasheets/${editingSheet.id}` : '/api/datasheets';
            const method = editingSheet ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingSheet ? 'Data point updated' : 'Data point created');
                setIsModalOpen(false);
                setFormData(defaultFormData);
                setEditingSheet(null);
                setFormErrors({});
                setServerError('');
                const result = await res.json();
                const newData = result.success ? result.data : result;
                if (method === 'POST') {
                    setDataSheets([...dataSheets, newData]);
                } else {
                    setDataSheets(dataSheets.map(s => s.id === newData.id ? newData : s));
                }
            } else {
                const result = await res.json();
                const error = result.error;
                if (typeof error === 'string') {
                    setServerError(error);
                } else if (error && typeof error === 'object') {
                    setServerError(error.message || 'Operation failed');
                } else {
                    setServerError('Operation failed');
                }
            }
        } catch (err) {
            console.error('Create/Update error:', err);
            setServerError('Server error occurred');
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Get all rows as raw array of arrays to find headers
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (rows.length === 0) {
                    toast.error('Excel file is empty');
                    setIsImporting(false);
                    return;
                }

                // Find header row dynamically
                let headerRowIndex = 0;
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const rowStr = JSON.stringify(rows[i]);
                    // Check for common keywords including new Modbus headers
                    if (rowStr.includes('SCADA ADRESİ') || rowStr.includes('SİNYAL AÇIKLAMASI') || rowStr.includes('REGISTER ADDRESS') || rowStr.includes('Note-1') || rowStr.includes('Address') || rowStr.includes('Scaling')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                // Convert to JSON using the found header row
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

                // Map Excel columns to our model
                // Support both Turkish and English headers with variations
                const mappedPoints = jsonData.map((row: any) => {
                    const findValue = (keys: string[]) => {
                        const rowKeys = Object.keys(row);
                        for (const targetKey of keys) {
                            // Direct match
                            if (row[targetKey] !== undefined && row[targetKey] !== null) return row[targetKey];

                            // Case-insensitive & trimmed search
                            const targetLower = targetKey.toLowerCase().trim();
                            for (const rowKey of rowKeys) {
                                if (rowKey.toLowerCase().trim() === targetLower) {
                                    return row[rowKey];
                                }
                                // Partial matches for common headers
                                if (rowKey.toLowerCase().includes(targetLower)) {
                                    return row[rowKey];
                                }
                            }
                        }
                        return undefined;
                    };

                    if (isModbus) {
                        // Concatenate Note-1 and Note-2 for dataName if they exist, otherwise use single field fallback
                        const name1 = findValue(['Note-1', 'Notes-1', 'Not-1']);
                        const name2 = findValue(['Note-2', 'Notes-2', 'Not-2']);
                        let combinedName = '';
                        if (name1 || name2) {
                            combinedName = `${name1 || ''} ${name2 || ''}`.trim();
                        }

                        return {
                            dataName: findValue(['DATA NAME', 'Data Name', 'Veri Adı', 'Name', 'Adı', 'Sinyal Açıklaması']),
                            dataValue: findValue(['DATA VALUE (UNIT)', 'Unit', 'Birim', 'Value', 'Değer']),
                            dataExplanation: findValue(['DATA EXPLANATION', 'Description', 'Açıklama', 'Explanation']),
                            dataType: findValue(['DATA TYPE', 'Data Type', 'Veri Tipi', 'Type']),
                            registerAddress: findValue(['REGISTER ADDRESS', 'Address', 'Adres', 'Register', 'SCADA ADRESİ']),
                            functionCode: findValue(['FUNCTION CODE', 'FC', 'Function', 'Fonksiyon']) || 3,
                            multiplier: findValue(['Multiplier', 'Scaling', 'Çarpan', 'Scale']),
                            wordSwap: row['WORD SWAP'] === 'YES' || row['WORD SWAP'] === 'EVET' || row['WORD SWAP'] === true || findValue(['Word Swap', 'Swap']) === 'YES',
                            recordingInterval: findValue(['REC (MIN)', 'Saklama Süresi', 'Interval', 'Aralık', 'Kayıt Süresi', 'Kayıt Aralığı']) || 1,
                            isActive: findValue(['STATUS', 'DURUM']) === 'INACTIVE' || findValue(['STATUS', 'DURUM']) === 'HAYIR' ? false : true
                        };
                    } else {
                        const description = findValue(['Signal Description', 'Sinyal Açıklaması', 'Açıklama', 'SİNYAL AÇIKLAMASI']);
                        return {
                            feederName: findValue(['Feeder', 'Fider', 'Hücre Adı', 'Hücre', 'FİDER/HÜCRE İSMİ']),
                            signalType: findValue(['Signal Type', 'Sinyal Tipi', 'Tip', 'SİNYAL TİPİ']),
                            signalDescription: description,
                            dataExplanation: description,
                            dataName: findValue(['Signal Name', 'Sinyal Adı', 'Adı', 'Name']),
                            dataValue: findValue(['Unit', 'Birim', 'Value', 'Değer']),
                            dataType: findValue(['Data Type', 'Veri Tipi', 'DATA TİPİ', 'TIP', 'TİP']),
                            signalSource: findValue(['Source', 'Kaynak', 'Sinyal Kaynağı', 'SİNYAL KAYNAĞI']),
                            componentId: findValue(['Component ID', 'Komponent ID', 'KOMPONENT ID']),
                            componentText: findValue(['Component Text', 'Komponent Metni', 'KOMPONENT METNİ']),
                            ioa1ObjectAddress: findValue(['IOA1', 'IOA Object Address', 'Obje Adresi', 'IOA', 'IOA3 ( Obje Adresi)', 'IOA3 (Obje Adresi)', 'IOA3']),
                            ioa2CellNo: findValue(['IOA2', 'IOA Cell No', 'Hücre No', 'IOA2 ( Hücre No)', 'IOA2 (Hücre No)', 'IOA2']),
                            ioa3VoltageLevel: findValue(['IOA3', 'IOA Voltage Level', 'Gerilim Seviyesi', 'IOA3 ( Gerilim Seviyesi)', 'IOA3 (Gerilim Seviyesi)']),
                            scadaAddress: findValue(['SCADA Address', 'SCADA Adresi', 'SCADA ADRESİ', 'ADRES', 'ADDRESS']),
                            recordingInterval: findValue(['Interval', 'Aralık', 'Kayıt Süresi', 'Kayıt Aralığı', 'KAYIT ARALIĞI']) || 1,
                            isActive: true
                        };
                    }
                });

                // Clean data (remove undefined and convert types)
                const finalPoints = mappedPoints.filter(p => isModbus ? (p.dataName || p.registerAddress) : (p.signalDescription || p.ioa1ObjectAddress || p.scadaAddress)).map(p => {
                    const cleaned: any = { ...p };
                    if (cleaned.registerAddress !== undefined) cleaned.registerAddress = parseInt(cleaned.registerAddress);
                    if (cleaned.functionCode !== undefined) cleaned.functionCode = parseInt(cleaned.functionCode);
                    if (cleaned.multiplier !== undefined) {
                        // Handle comma in scaling string (e.g. "0,001")
                        let multStr = cleaned.multiplier.toString().replace(',', '.');
                        cleaned.multiplier = parseFloat(multStr);
                    }
                    if (cleaned.ioa1ObjectAddress !== undefined) cleaned.ioa1ObjectAddress = parseInt(cleaned.ioa1ObjectAddress);
                    if (cleaned.ioa2CellNo !== undefined) cleaned.ioa2CellNo = parseInt(cleaned.ioa2CellNo);
                    if (cleaned.ioa3VoltageLevel !== undefined) cleaned.ioa3VoltageLevel = parseInt(cleaned.ioa3VoltageLevel);
                    if (cleaned.scadaAddress !== undefined) cleaned.scadaAddress = parseInt(cleaned.scadaAddress);
                    if (cleaned.recordingInterval !== undefined) {
                        let intervalVal = cleaned.recordingInterval.toString();
                        let matches = intervalVal.match(/\d+/);
                        cleaned.recordingInterval = matches ? parseInt(matches[0]) : 1;
                    }

                    // Specific logic for IEC104 dataName
                    if (!isModbus && !p.dataName) {
                        cleaned.dataName = p.signalDescription || p.componentId || 'IEC104-Point';
                    }

                    return cleaned;
                });

                if (finalPoints.length === 0) {
                    toast.error('No valid data points found in Excel');
                    setIsImporting(false);
                    return;
                }

                // Send to bulk endpoint
                const res = await apiRequest('/api/datasheets/bulk', {
                    method: 'POST',
                    body: JSON.stringify({
                        profileId,
                        points: finalPoints
                    })
                });

                if (res.ok) {
                    const result = await res.json();
                    const data = result.success ? result.data : result;
                    toast.success(`Successfully imported ${data.length || 0} data points`);
                    // Refresh data
                    const refreshRes = await apiRequest(`/api/datasheets?profileId=${profileId}`);
                    if (refreshRes.ok) {
                        const refreshResult = await refreshRes.json();
                        const sheets = refreshResult.success ? refreshResult.data : refreshResult;
                        setDataSheets(Array.isArray(sheets) ? sheets : []);
                    }
                } else {
                    const result = await res.json();
                    const errorMessage = result.error?.message || result.error || 'Import failed';
                    toast.error(errorMessage);
                }
            } catch (err) {
                console.error('Import error:', err);
                toast.error('Failed to parse Excel file');
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const downloadTemplate = () => {
        const headers = isModbus
            ? [['DATA NAME', 'DATA EXPLANATION', 'DATA VALUE (UNIT)', 'DATA TYPE', 'REGISTER ADDRESS', 'FUNCTION CODE', 'MULTIPLIER', 'WORD SWAP', 'CREATED AT/BY', 'UPDATED AT/BY', 'REC (MIN)', 'STATUS']]
            : [['FEEDER/CELL NAME', 'SIGNAL TYPE', 'SIGNAL DESCRIPTION', 'DATA VALUE (UNIT)', 'DATA TYPE', 'SIGNAL SOURCE', 'COMPONENT ID', 'COMPONENT TEXT', 'IOA (OBJECT ADDR)', 'IOA (CELL NO)', 'IOA (VOLTAGE LVL)', 'SCADA ADDRESS', 'CREATED AT/BY', 'UPDATED AT/BY', 'REC (MIN)', 'STATUS']];

        const ws = XLSX.utils.aoa_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `${protocolType}_Template.xlsx`);
    };

    const filteredSheets = dataSheets
        .filter(s =>
            s.dataName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.dataValue && s.dataValue.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.signalDescription && s.signalDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.feederName && s.feederName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.componentId && s.componentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.componentText && s.componentText.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            const addrA = a.registerAddress ?? a.ioa1ObjectAddress ?? a.scadaAddress ?? Infinity;
            const addrB = b.registerAddress ?? b.ioa1ObjectAddress ?? b.scadaAddress ?? Infinity;
            return addrA - addrB;
        });

    if (!profileId) {
        return (
            <div className="p-8 text-white space-y-4">
                <h1 className="text-2xl font-bold">Error</h1>
                <p>Profile ID is required to view data points.</p>
                <button onClick={() => router.back()} className="px-4 py-2 bg-slate-800 rounded-lg">Go Back</button>
            </div>
        );
    }

    const cellClass = "px-3 py-3 text-xs text-slate-300 whitespace-nowrap";
    const headerCellClass = "px-3 py-3 whitespace-nowrap";

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
                            {profile ? `${profile.name} - Data Points` : 'Loading...'}
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-16">Manage data mapping points for {protocolType} profile.</p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleExcelImport}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-slate-400 rounded-xl text-xs font-bold border border-slate-800 hover:text-white transition-all shadow-lg"
                        title="Download Excel Template"
                    >
                        <Download size={16} /> Template
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/30 hover:bg-blue-600/20 transition-all shadow-lg disabled:opacity-50"
                    >
                        <Upload size={16} /> {isImporting ? 'Importing...' : 'Import Excel'}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-3 px-6 py-3 bg-brand-green text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-green/20 hover:scale-[1.02] transition-all tracking-widest"
                    >
                        <Plus size={16} strokeWidth={3} /> Add Point
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="card-base p-2 bg-slate-900/40">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, description, value or component..."
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
                                        <th className={headerCellClass}>DATA NAME</th>
                                        <th className={headerCellClass}>DATA EXPLANATION</th>
                                        <th className={headerCellClass}>DATA VALUE (UNIT)</th>
                                        <th className={headerCellClass}>DATA TYPE</th>
                                        <th className={headerCellClass}>REGISTER ADDRESS</th>
                                        <th className={headerCellClass}>FUNCTION CODE</th>
                                        <th className={headerCellClass}>MULTIPLIER</th>
                                        <th className={headerCellClass}>WORD SWAP</th>
                                    </>
                                ) : (
                                    <>
                                        <th className={headerCellClass}>FEEDER/CELL NAME</th>
                                        <th className={headerCellClass}>SIGNAL TYPE</th>
                                        <th className={headerCellClass}>SIGNAL DESCRIPTION</th>
                                        <th className={headerCellClass}>DATA VALUE (UNIT)</th>
                                        <th className={headerCellClass}>DATA TYPE</th>
                                        <th className={headerCellClass}>SIGNAL SOURCE</th>
                                        <th className={headerCellClass}>COMPONENT ID</th>
                                        <th className={headerCellClass}>COMPONENT TEXT</th>
                                        <th className={headerCellClass}>IOA (OBJECT ADDR)</th>
                                        <th className={headerCellClass}>IOA (CELL NO)</th>
                                        <th className={headerCellClass}>IOA (VOLTAGE LVL)</th>
                                        <th className={headerCellClass}>SCADA ADDRESS</th>
                                    </>
                                )}
                                <th className={headerCellClass}>CREATED AT/BY</th>
                                <th className={headerCellClass}>UPDATED AT/BY</th>
                                <th className={headerCellClass}>REC (MIN)</th>
                                <th className={headerCellClass}>STATUS</th>
                                <th className={`${headerCellClass} text-right`}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isModbus ? 9 : 13} className="px-6 py-12 text-center text-sm text-slate-500 animate-pulse">Loading data points...</td></tr>
                            ) : filteredSheets.length === 0 ? (
                                <tr><td colSpan={isModbus ? 9 : 13} className="px-6 py-12 text-center text-sm text-slate-500">No data points found in this profile.</td></tr>
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
                                            <td className={`${cellClass} text-slate-400 max-w-[200px] truncate`} title={sheet.dataExplanation ?? ''}>
                                                {sheet.dataExplanation || '-'}
                                            </td>
                                            <td className={`${cellClass} text-slate-400`}>{sheet.dataValue ?? '-'}</td>
                                            <td className={cellClass}>
                                                {sheet.dataType ? (
                                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                                                        {sheet.dataType}
                                                    </span>
                                                ) : '-'}
                                            </td>
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
                                                    {sheet.wordSwap ? 'YES' : 'NO'}
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
                                            <td className={`${cellClass} text-slate-400`}>{sheet.dataValue ?? '-'}</td>
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
                                        <div className="flex flex-col text-[10px] text-slate-300 font-bold tracking-tighter tabular-nums">
                                            <span>{sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                                            <span className="opacity-50 font-medium">{sheet.createdAt ? new Date(sheet.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            {sheet.createdBy && <span className="text-[8px] text-slate-600 mt-1 truncate max-w-[80px]" title={sheet.createdBy}>BY: {sheet.createdBy.substring(0, 8)}</span>}
                                        </div>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex flex-col text-[10px] text-amber-500/80 font-bold tracking-tighter tabular-nums">
                                            <span>{sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                            <span className="opacity-50 font-medium">{sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            {sheet.updatedBy && <span className="text-[8px] text-slate-600 mt-1 truncate max-w-[80px]" title={sheet.updatedBy}>BY: {sheet.updatedBy.substring(0, 8)}</span>}
                                        </div>
                                    </td>
                                    <td className={`${cellClass} font-mono text-slate-500 text-center`}>
                                        {sheet.recordingInterval ?? '1'}m
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sheet.isActive ? 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className={`text-[10px] font-bold ${sheet.isActive ? 'text-brand-green' : 'text-slate-600'}`}>
                                                {sheet.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={cellClass}>
                                        <div className="flex justify-end gap-2">
                                            <button title="Edit" onClick={() => openEditModal(sheet)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-brand-green hover:border-brand-green/50 transition-colors text-slate-400">
                                                <Pencil size={14} />
                                            </button>
                                            <button title="Delete" onClick={() => handleDeleteClick(sheet)} className="p-2 rounded-md bg-slate-900 border border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors text-slate-400">
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
                    Total <span className="font-bold text-white">{filteredSheets.length}</span> / {dataSheets.length} data points
                </span>
                <span className="text-slate-500">
                    Protocol: <span className="font-bold text-brand-green">{protocolType}</span>
                </span>
            </div>

            {/* ======================== MODAL ======================== */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSheet ? 'Edit Point' : 'Add Point'}
                subtitle={`${protocolType} DATA POINT — ${profile?.name}`}
                icon={FileText}
                maxWidth="5xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div className="space-y-1 mb-4 border-l-2 border-blue-500/50 pl-3">
                                <h3 className="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase">MODBUS CONFIGURATION</h3>
                                <p className="text-[10px] text-slate-500 font-medium">Configure register addresses and function codes.</p>
                            </div>

                            {/* Section 1: Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="DATA NAME" name="dataName" required autoFocus
                                    value={formData.dataName}
                                    error={formErrors.dataName}
                                    onChange={(val) => {
                                        setFormData({ ...formData, dataName: val });
                                        if (formErrors.dataName) setFormErrors({ ...formErrors, dataName: '' });
                                    }}
                                    placeholder="e.g. Voltage L1"
                                />
                                <InputField
                                    label="DATA EXPLANATION" name="dataExplanation"
                                    value={formData.dataExplanation}
                                    onChange={(val) => setFormData({ ...formData, dataExplanation: val })}
                                    placeholder="e.g. A Phase-Neutral Voltage"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField
                                    label="DATA VALUE (UNIT)" name="dataValue"
                                    value={formData.dataValue}
                                    onChange={(val) => setFormData({ ...formData, dataValue: val })}
                                    placeholder="e.g. A, V, kW"
                                />
                                <div className="space-y-1.5">
                                    <label className={labelClass}>DATA TYPE</label>
                                    <select
                                        value={formData.dataType}
                                        onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">Select Data Type</option>
                                        {MODBUS_DATA_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <InputField
                                    label="REGISTER ADDRESS" name="registerAddress" type="number" required
                                    value={formData.registerAddress}
                                    error={formErrors.registerAddress}
                                    onChange={(val) => {
                                        setFormData({ ...formData, registerAddress: val });
                                        if (formErrors.registerAddress) setFormErrors({ ...formErrors, registerAddress: '' });
                                    }}
                                    placeholder="e.g. 40001"
                                />
                            </div>

                            {/* Section 2: Technical */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className={labelClass}>FUNCTION CODE</label>
                                    <select
                                        value={formData.functionCode}
                                        onChange={(e) => setFormData({ ...formData, functionCode: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">Select Function</option>
                                        <option value="1">1 - Read Coils</option>
                                        <option value="2">2 - Read Discrete Inputs</option>
                                        <option value="3">3 - Read Holding Registers</option>
                                        <option value="4">4 - Read Input Registers</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelClass}>MULTIPLIER (SCALING)</label>
                                    <select
                                        value={formData.multiplier}
                                        onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">Select Multiplier</option>
                                        <option value="1">1 (None)</option>
                                        <option value="10">10</option>
                                        <option value="100">100</option>
                                        <option value="1000">1000 (e.g. kV to V)</option>
                                        <option value="0.1">0.1</option>
                                        <option value="0.01">0.01</option>
                                        <option value="0.001">0.001 (e.g. V to kV)</option>
                                        <option value="0.0001">0.0001</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40 h-[50px] self-end">
                                    <span className={labelClass + " !mb-0"}>WORD SWAP</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, wordSwap: !formData.wordSwap })}
                                        className={formData.wordSwap ? "text-brand-green scale-110" : "text-slate-600 hover:text-slate-500"}
                                    >
                                        {formData.wordSwap ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    </button>
                                </div>
                            </div>

                            {/* Common Field: Recording Interval */}
                            <div className="pt-4 border-t border-slate-800/40">
                                 <InputField
                                    label="KAYIT SÜRESİ (DAKİKA)" name="recordingInterval" type="number" required
                                    value={formData.recordingInterval}
                                    onChange={(val) => setFormData({ ...formData, recordingInterval: val })}
                                    placeholder="e.g. 1"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ============ IEC104 FIELDS ============ */}
                            <div className="space-y-1 mb-4 border-l-2 border-brand-green/50 pl-3">
                                <h3 className="text-[10px] font-black text-brand-green tracking-[0.2em] uppercase">IEC 104 SPECIFICATIONS</h3>
                                <p className="text-[10px] text-slate-500 font-medium">Fields matching the official Excel data sheet specifications.</p>
                            </div>

                            {/* Section 1: Signal Identification */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField
                                    label="FEEDER / CELL NAME" name="feederName" maxLength={100} autoFocus
                                    value={formData.feederName}
                                    error={formErrors.feederName}
                                    onChange={(val) => {
                                        setFormData({ ...formData, feederName: val });
                                        if (formErrors.feederName) setFormErrors({ ...formErrors, feederName: '' });
                                    }}
                                    placeholder="e.g. H2"
                                />
                                <InputField
                                    label="SIGNAL TYPE" name="signalType" maxLength={100}
                                    value={formData.signalType}
                                    error={formErrors.signalType}
                                    onChange={(val) => {
                                        setFormData({ ...formData, signalType: val });
                                        if (formErrors.signalType) setFormErrors({ ...formErrors, signalType: '' });
                                    }}
                                    placeholder="e.g. ANALOG"
                                />
                                <div className="space-y-1.5">
                                    <label className={labelClass}>DATA TYPE</label>
                                    <select
                                        value={formData.dataType}
                                        onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">Select Data Type</option>
                                        {MODBUS_DATA_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Signal Description & Explanation (full width) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="SIGNAL DESCRIPTION" name="signalDescription" maxLength={250}
                                    value={formData.signalDescription}
                                    error={formErrors.signalDescription}
                                    onChange={(val) => {
                                        setFormData({ ...formData, signalDescription: val, dataExplanation: val });
                                        if (formErrors.signalDescription) setFormErrors({ ...formErrors, signalDescription: '' });
                                    }}
                                    placeholder="e.g. VAN (KV), IA (A), FREQUENCY (Hz)"
                                    required
                                />
                                <InputField
                                    label="DATA NAME" name="dataName" maxLength={100}
                                    value={formData.dataName}
                                    error={formErrors.dataName}
                                    onChange={(val) => {
                                        setFormData({ ...formData, dataName: val });
                                        if (formErrors.dataName) setFormErrors({ ...formErrors, dataName: '' });
                                    }}
                                    placeholder="e.g. L1-N Voltage"
                                />
                            </div>

                            {/* Section 2: Component Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField
                                    label="SIGNAL SOURCE" name="signalSource" maxLength={100}
                                    value={formData.signalSource}
                                    onChange={(val) => setFormData({ ...formData, signalSource: val })}
                                    placeholder="e.g. IED"
                                />
                                <InputField
                                    label="COMPONENT ID" name="componentId" maxLength={100}
                                    value={formData.componentId}
                                    onChange={(val) => setFormData({ ...formData, componentId: val })}
                                    placeholder="e.g. V-AN"
                                />
                                <InputField
                                    label="COMPONENT TEXT" name="componentText" maxLength={250}
                                    value={formData.componentText}
                                    error={formErrors.componentText}
                                    onChange={(val) => {
                                        setFormData({ ...formData, componentText: val });
                                        if (formErrors.componentText) setFormErrors({ ...formErrors, componentText: '' });
                                    }}
                                    placeholder="e.g. A Phase Voltage"
                                />
                            </div>

                            {/* Section 3: Addressing (IOA & SCADA) */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/10 p-4 rounded-xl border border-slate-800/20">
                                <InputField
                                    label="IOA (OBJ ADDR)" name="ioa1ObjectAddress" type="number" required
                                    value={formData.ioa1ObjectAddress}
                                    error={formErrors.ioa1ObjectAddress}
                                    onChange={(val) => {
                                        setFormData({ ...formData, ioa1ObjectAddress: val });
                                        if (formErrors.ioa1ObjectAddress) setFormErrors({ ...formErrors, ioa1ObjectAddress: '' });
                                    }}
                                    placeholder="e.g. 1"
                                />
                                <InputField
                                    label="IOA (CELL NO)" name="ioa2CellNo" type="number"
                                    value={formData.ioa2CellNo}
                                    onChange={(val) => setFormData({ ...formData, ioa2CellNo: val })}
                                    placeholder="e.g. 11"
                                />
                                <InputField
                                    label="IOA (VOLTAGE)" name="ioa3VoltageLevel" type="number"
                                    value={formData.ioa3VoltageLevel}
                                    onChange={(val) => setFormData({ ...formData, ioa3VoltageLevel: val })}
                                    placeholder="e.g. 31"
                                />
                                <InputField
                                    label="SCADA ADDR" name="scadaAddress" type="number"
                                    value={formData.scadaAddress}
                                    onChange={(val) => setFormData({ ...formData, scadaAddress: val })}
                                    placeholder="e.g. 2034433"
                                />
                            </div>

                            {/* Section 4: Metadata & Recording */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField
                                    label="DISPLAY NAME" name="dataName"
                                    value={formData.dataName}
                                    onChange={(val) => setFormData({ ...formData, dataName: val })}
                                    placeholder="Display label"
                                />
                                <InputField
                                    label="DATA VALUE (UNIT)" name="dataValue"
                                    value={formData.dataValue}
                                    onChange={(val) => setFormData({ ...formData, dataValue: val })}
                                    placeholder="e.g. kV, A, Hz"
                                />
                                <InputField
                                    label="KAYIT SÜRESİ (DAKİKA)" name="recordingInterval" type="number" required
                                    value={formData.recordingInterval}
                                    onChange={(val) => setFormData({ ...formData, recordingInterval: val })}
                                    placeholder="e.g. 1"
                                />
                            </div>
                        </>
                    )}

                    {/* Active Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className={labelClass + " !mb-0"}>ACTIVE STATUS</span>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                            className="text-brand-green scale-110"
                        >
                            {formData.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-brand-green disabled:bg-brand-green/50 text-white font-black tracking-[0.2em] text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase"
                    >
                        {isSubmitting ? 'SAVING...' : editingSheet ? 'UPDATE POINT' : 'CREATE POINT'}
                    </button>
                </form>
            </Modal>

            <Modal
                isOpen={!!pointToDelete}
                onClose={() => setPointToDelete(null)}
                title="Delete Data Point"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-4 font-sans">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-white">{pointToDelete?.dataName}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setPointToDelete(null)}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-lg border border-slate-800 text-slate-400 font-bold text-[10px] hover:bg-slate-900 transition-colors disabled:opacity-50 tracking-widest uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-lg bg-red-500 text-white font-bold text-[10px] hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function DataSheetsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
            <DataSheetsContent />
        </Suspense>
    );
}
