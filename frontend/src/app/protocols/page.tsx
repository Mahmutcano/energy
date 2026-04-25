"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Network, Plus, X, Cpu, Factory, Wifi, Settings2, Pencil, Trash2, Cpu as DeviceIcon, AlertTriangle, Database, Activity, Shield, Zap, Info, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import PlantForm, { PlantFormData } from '@/components/forms/PlantForm';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface CommProtocol {
    id: string;
    plantId: string;
    configName: string;
    protocolType: 'MODBUS' | 'IEC104';
    plant?: { id: string; plantName: string };
    _count?: { devices: number };
    modbusConfig?: {
        ipAddress: string;
        port: number;
        slaveId: number;
        timeout: number;
        retryCount: number;
    } | null;
    iec104Config?: {
        ipAddress: string;
        port: number;
        asduAddr: number;
        t0: number;
        t1: number;
        t2: number;
        t3: number;
        k: number;
        w: number;
    } | null;
    createdAt: string;
}

const defaultFormData = {
    configName: '',
    plantId: '',
    protocolType: 'MODBUS' as 'MODBUS' | 'IEC104',
    ipAddress: '192.168.1.100',
    port: 502,
    slaveId: 1,
    timeout: 1000,
    retryCount: 3,
    iecIpAddress: '192.168.1.101',
    iecPort: 2404,
    asduAddr: 1,
    t0: 30,
    t1: 15,
    t2: 10,
    t3: 20,
    k: 12,
    w: 8,
};

function ProtocolsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPlantId = searchParams?.get('plantId') || '';

    const [protocols, setProtocols] = useState<CommProtocol[]>([]);
    const [plants, setPlants] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProtocol, setEditingProtocol] = useState<CommProtocol | null>(null);
    const [formData, setFormData] = useState({ ...defaultFormData, plantId: initialPlantId });
    const submittingRef = React.useRef(false);
    const [protocolToDelete, setProtocolToDelete] = useState<CommProtocol | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline Plant Modal State
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
    const [isCreatingPlant, setIsCreatingPlant] = useState(false);

    const fetchProtocols = async () => {
        try {
            const res = await apiRequest('/api/comm-protocols');
            if (res.ok) {
                const result = await res.json();
                const data = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                
                let filteredData = Array.isArray(data) ? data : [];
                if (initialPlantId) {
                    filteredData = filteredData.filter((p: CommProtocol) => p.plantId === initialPlantId);
                }
                setProtocols(filteredData);
            }
        }
        catch (err) {
            console.error('Protokoller çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlants = async () => {
        try {
            const plantRes = await apiRequest('/api/plants');
            if (plantRes.ok) {
                const result = await plantRes.json();
                const data = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                setPlants(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Santraller çekilemedi:', err);
        }
    };

    const fetchCompanies = async () => {
        try {
            const compRes = await apiRequest('/api/companies');
            if (compRes.ok) {
                const result = await compRes.json();
                const data = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
                setCompanies(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Firmalar çekilemedi:', err);
        }
    }

    useEffect(() => {
        Promise.all([fetchProtocols(), fetchPlants(), fetchCompanies()]);
    }, [initialPlantId]);

    const openCreateModal = () => {
        setEditingProtocol(null);
        setFormData({ ...defaultFormData, plantId: initialPlantId || (plants.length > 0 ? plants[0].id : '') });
        setIsModalOpen(true);
    };

    const openEditModal = (proto: CommProtocol) => {
        setEditingProtocol(proto);
        
        const updatedForm = {
            ...defaultFormData,
            configName: proto.configName || '',
            plantId: proto.plantId || '',
            protocolType: proto.protocolType,
            ...(proto.protocolType === 'MODBUS' && proto.modbusConfig ? {
                ipAddress: proto.modbusConfig.ipAddress,
                port: proto.modbusConfig.port,
                slaveId: proto.modbusConfig.slaveId,
                timeout: proto.modbusConfig.timeout,
                retryCount: proto.modbusConfig.retryCount,
            } : {}),
            ...(proto.protocolType === 'IEC104' && proto.iec104Config ? {
                iecIpAddress: proto.iec104Config.ipAddress,
                iecPort: proto.iec104Config.port,
                asduAddr: proto.iec104Config.asduAddr,
                t0: proto.iec104Config.t0,
                t1: proto.iec104Config.t1,
                t2: proto.iec104Config.t2,
                t3: proto.iec104Config.t3,
                k: proto.iec104Config.k,
                w: proto.iec104Config.w,
            } : {}),
        };

        setFormData(updatedForm);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (proto: CommProtocol) => {
        setProtocolToDelete(proto);
    };

    const confirmDelete = async () => {
        if (!protocolToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/comm-protocols/${protocolToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Protokol yapılandırması silindi');
                setProtocols(protocols.filter(p => p.id !== protocolToDelete.id));
                setProtocolToDelete(null);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Silme hatası';
                toast.error(errorMessage);
                fetchProtocols();
            }
        } catch (err) {
            console.error('Silme hatası:', err);
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
            const body: any = {
                configName: formData.configName,
                plantId: formData.plantId,
                protocolType: formData.protocolType,
            };

            if (formData.protocolType === 'MODBUS') {
                body.modbusConfig = {
                    ipAddress: formData.ipAddress,
                    port: formData.port,
                    slaveId: formData.slaveId,
                    timeout: formData.timeout,
                    retryCount: formData.retryCount,
                };
            } else {
                body.iec104Config = {
                    ipAddress: formData.iecIpAddress,
                    port: formData.iecPort,
                    asduAddr: formData.asduAddr,
                    t0: formData.t0,
                    t1: formData.t1,
                    t2: formData.t2,
                    t3: formData.t3,
                    k: formData.k,
                    w: formData.w,
                };
            }

            const url = editingProtocol ? `/api/comm-protocols/${editingProtocol.id}` : '/api/comm-protocols';
            const method = editingProtocol ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success(editingProtocol ? 'Protokol yığını güncellendi' : 'Protokol yığını başlatıldı');
                setIsModalOpen(false);
                setFormData({ ...defaultFormData, plantId: initialPlantId });
                setEditingProtocol(null);
                fetchProtocols();
            }
        } catch (err) {
            console.error('Oluşturma hatası:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handlePlantSubmit = async (data: PlantFormData) => {
        setIsCreatingPlant(true);
        try {
            const body = {
                companyId: data.companyId,
                plantName: data.plantName,
                plantType: data.plantType,
                latitude: data.latitude ? parseFloat(data.latitude) : null,
                longitude: data.longitude ? parseFloat(data.longitude) : null,
            };
            const res = await apiRequest('/api/plants', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const result = await res.json();
                const newPlant = result.success ? result.data : result;
                const plantId = newPlant.id || newPlant;
                toast.success('Düğüm oluşturuldu');
                await fetchPlants();
                setFormData({ ...formData, plantId: (typeof plantId === 'string' ? plantId : plantId.id) });
                setIsPlantModalOpen(false);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Düğüm oluşturulamadı';
                toast.error(errorMessage);
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
        } finally {
            setIsCreatingPlant(false);
        }
    };

    const modbusCount = protocols.filter(p => p.protocolType === 'MODBUS').length;
    const iec104Count = protocols.filter(p => p.protocolType === 'IEC104').length;

    return (
        <div className="space-y-6 pb-20 animate-in-fade font-sans">
            <PageHeader 
                title="İLETİŞİM" 
                highlightedTitle="YIĞINI"
                subtitle="Modbus TCP ve IEC 60870-5-104 uç nokta orkestrasyonu"
                icon={Network}
            >
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-6 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(87,148,242,0.2)] font-mono"
                >
                    <Plus size={16} /> YENİ UÇ NOKTA KAYDET
                </button>
            </PageHeader>

            {/* Metrikler */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'TOPLAM UÇ NOKTA', val: protocols.length, icon: Network, color: 'text-grafana-accent-blue', bg: 'bg-grafana-accent-blue/5' },
                    { label: 'MODBUS YIĞINI', val: modbusCount, icon: Database, color: 'text-grafana-accent-orange', bg: 'bg-grafana-accent-orange/5' },
                    { label: 'IEC104 YIĞINI', val: iec104Count, icon: Wifi, color: 'text-grafana-accent-green', bg: 'bg-grafana-accent-green/5' },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-grafana-panel/40 border border-grafana-border p-5 rounded-sm flex items-center gap-5 group hover:border-grafana-text-secondary/30 transition-all"
                    >
                        <div className={cn("p-3 rounded-sm border border-white/10", stat.bg, stat.color)}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-tech-label">{stat.label}</p>
                            <p className="text-2xl font-bold text-grafana-text-primary font-mono tabular-nums leading-none">{stat.val.toString().padStart(2, '0')}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Protokol Tablosu */}
            <div className="bg-grafana-panel/30 border border-grafana-border rounded-sm overflow-hidden shadow-sm">
                <div className="p-4 border-b border-grafana-border bg-grafana-bg/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings2 size={14} className="text-grafana-accent-blue" />
                        <h3 className="text-tech-label text-grafana-text-primary">UÇ NOKTA YAPILANDIRMA MATRİSİ</h3>
                    </div>
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-grafana-accent-orange" /> MODBUS
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-grafana-text-secondary uppercase font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-grafana-accent-green" /> IEC104
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                <th>YIĞIN TİPİ</th>
                                <th>YAPILANDIRMA ADI</th>
                                <th>İLİŞKİLİ DÜĞÜM</th>
                                <th>IP ADRESİ</th>
                                <th>PARAMETRELER</th>
                                <th className="text-center">CİHAZLAR</th>
                                <th className="text-right">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode='popLayout'>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-24">
                                            <div className="flex flex-col items-center gap-3 opacity-50">
                                                <RefreshCw size={24} className="animate-spin text-grafana-accent-blue" />
                                                <span className="text-tech-label animate-pulse">UÇ NOKTA VERİLERİ SORGULANIYOR...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : protocols.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-24">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Info size={24} />
                                                <span className="text-tech-label uppercase">Henüz iletişim yığını tanımlanmadı</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : protocols.map((proto, idx) => (
                                    <motion.tr 
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={proto.id} 
                                        className="group hover:bg-white/[0.02] transition-all"
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-1.5 h-6 rounded-full transition-all group-hover:h-8",
                                                    proto.protocolType === 'MODBUS' ? "bg-grafana-accent-orange" : "bg-grafana-accent-green"
                                                )} />
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-sm border font-mono uppercase tracking-tighter",
                                                    proto.protocolType === 'MODBUS' 
                                                        ? "bg-grafana-accent-orange/10 border-grafana-accent-orange/30 text-grafana-accent-orange shadow-[0_0_10px_rgba(255,152,48,0.05)]" 
                                                        : "bg-grafana-accent-green/10 border-grafana-accent-green/30 text-grafana-accent-green shadow-[0_0_10px_rgba(115,191,105,0.05)]"
                                                )}>
                                                    {proto.protocolType === 'MODBUS' ? 'MODBUS_TCP' : 'IEC_104'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-grafana-text-primary uppercase group-hover:text-white transition-colors">{proto.configName || 'İSİMSİZ'}</span>
                                                <span className="text-[9px] text-grafana-text-secondary font-mono tracking-tighter">ID: {proto.id.substring(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-sm bg-grafana-bg border border-grafana-border">
                                                    <Factory size={12} className="text-grafana-text-secondary" />
                                                </div>
                                                <span className="text-[11px] font-bold text-grafana-text-secondary uppercase tracking-tighter">{proto.plant?.plantName || 'BAĞIMSIZ'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-sm bg-grafana-accent-blue/5 border border-grafana-accent-blue/20">
                                                    <Shield size={12} className="text-grafana-accent-blue" />
                                                </div>
                                                <span className="text-sm font-mono text-grafana-accent-blue font-bold tracking-tight">
                                                    {proto.protocolType === 'MODBUS' ? proto.modbusConfig?.ipAddress : proto.iec104Config?.ipAddress || '0.0.0.0'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            {proto.protocolType === 'MODBUS' && proto.modbusConfig ? (
                                                <div className="flex gap-4 font-mono text-[10px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-grafana-text-secondary opacity-50 uppercase tracking-tighter">PORT</span>
                                                        <span className="text-grafana-text-primary font-bold">{proto.modbusConfig.port}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-grafana-text-secondary opacity-50 uppercase tracking-tighter">SLAVE</span>
                                                        <span className="text-grafana-text-primary font-bold">{proto.modbusConfig.slaveId}</span>
                                                    </div>
                                                </div>
                                            ) : proto.protocolType === 'IEC104' && proto.iec104Config ? (
                                                <div className="flex gap-4 font-mono text-[10px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-grafana-text-secondary opacity-50 uppercase tracking-tighter">PORT</span>
                                                        <span className="text-grafana-text-primary font-bold">{proto.iec104Config.port}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-grafana-text-secondary opacity-50 uppercase tracking-tighter">ASDU</span>
                                                        <span className="text-grafana-text-primary font-bold">{proto.iec104Config.asduAddr}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-mono text-grafana-text-secondary/30 uppercase tracking-widest italic">Konfigüre Edilmemiş</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="inline-flex flex-col items-center bg-grafana-bg border border-grafana-border rounded-sm px-3 py-1">
                                                <span className="text-xs font-bold font-mono text-grafana-text-primary leading-none">{proto._count?.devices || 0}</span>
                                                <span className="text-[8px] font-bold font-mono text-grafana-text-secondary uppercase tracking-tighter mt-1">CİHAZ</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    title="Cihaz Matrisi" 
                                                    onClick={() => router.push(`/devices?protocolId=${proto.id}`)} 
                                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                                >
                                                    <DeviceIcon size={14} />
                                                </button>
                                                <button 
                                                    title="Düzenle" 
                                                    onClick={() => openEditModal(proto)} 
                                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button 
                                                    title="Sil" 
                                                    onClick={() => handleDeleteClick(proto)} 
                                                    className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-red hover:border-grafana-accent-red/50 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modallar (Modal bileşeni içindeki başlıklar ve formlar da stilize edildi) */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProtocol ? 'YIĞIN YAPILANDIRMA' : 'YIĞIN BAŞLATMA'}
                icon={Network}
                maxWidth="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-tech-label block ml-1">YAPI ADI</label>
                            <input
                                type="text"
                                value={formData.configName}
                                onChange={(e) => setFormData({ ...formData, configName: e.target.value })}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono"
                                placeholder="Örn: ANA_MODBUS_HAT"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-tech-label block ml-1">EŞLEŞEN DÜĞÜM</label>
                            <select
                                value={formData.plantId}
                                onChange={(e) => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setIsPlantModalOpen(true);
                                    } else {
                                        setFormData({ ...formData, plantId: e.target.value });
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono cursor-pointer"
                                required
                            >
                                <option value="">DÜĞÜM SEÇİLEMEDİ</option>
                                {plants.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.plantName.toUpperCase()}</option>
                                ))}
                                <option value="ADD_NEW" className="text-grafana-accent-green font-bold">+ YENİ DÜĞÜM EKLE</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-tech-label block ml-1">PROTOKOL STANDARDI</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['MODBUS', 'IEC104'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, protocolType: type })}
                                    className={cn(
                                        "p-3 rounded-sm border text-[11px] font-bold uppercase tracking-widest transition-all font-mono",
                                        formData.protocolType === type
                                            ? "bg-grafana-accent-blue/10 border-grafana-accent-blue/50 text-grafana-accent-blue"
                                            : "bg-grafana-bg border-grafana-border text-grafana-text-secondary/50 hover:border-grafana-text-secondary/20"
                                    )}
                                >
                                    {type === 'MODBUS' ? 'MODBUS TCP/IP' : 'IEC 60870-5-104'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-grafana-bg/50 border border-grafana-border rounded-sm space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-grafana-border/50">
                            <Zap size={14} className="text-grafana-accent-blue" />
                            <span className="text-[10px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">KATMAN YAPILANDIRMASI</span>
                        </div>

                        {formData.protocolType === 'MODBUS' ? (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">IP ADRESİ</label>
                                    <input
                                        type="text"
                                        value={formData.ipAddress}
                                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono focus:border-grafana-accent-blue/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">PORT</label>
                                    <input
                                        type="number"
                                        value={formData.port}
                                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono focus:border-grafana-accent-blue/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">SLAVE ID</label>
                                    <input
                                        type="number"
                                        value={formData.slaveId}
                                        onChange={(e) => setFormData({ ...formData, slaveId: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">TIMEOUT (MS)</label>
                                    <input
                                        type="number"
                                        value={formData.timeout}
                                        onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">IP ADRESİ</label>
                                    <input
                                        type="text"
                                        value={formData.iecIpAddress}
                                        onChange={(e) => setFormData({ ...formData, iecIpAddress: e.target.value })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono focus:border-grafana-accent-blue/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">PORT</label>
                                    <input
                                        type="number"
                                        value={formData.iecPort}
                                        onChange={(e) => setFormData({ ...formData, iecPort: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono focus:border-grafana-accent-blue/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">ASDU ADRESI</label>
                                    <input
                                        type="number"
                                        value={formData.asduAddr}
                                        onChange={(e) => setFormData({ ...formData, asduAddr: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">T0 BAGLANTI</label>
                                    <input
                                        type="number"
                                        value={formData.t0}
                                        onChange={(e) => setFormData({ ...formData, t0: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">T1 GONDERIM</label>
                                    <input
                                        type="number"
                                        value={formData.t1}
                                        onChange={(e) => setFormData({ ...formData, t1: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-grafana-text-secondary uppercase font-mono ml-1">T3 BOSTA</label>
                                    <input
                                        type="number"
                                        value={formData.t3}
                                        onChange={(e) => setFormData({ ...formData, t3: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-grafana-panel border border-grafana-border rounded-sm text-xs text-grafana-text-primary outline-none font-mono"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-grafana-accent-blue disabled:opacity-50 text-white font-bold tracking-[0.2em] text-[11px] rounded-sm shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono"
                    >
                        {isSubmitting ? 'İŞLENİYOR...' : editingProtocol ? 'KONFİGÜRASYONU KAYDET' : 'YIĞINI BAŞLAT'}
                    </button>
                </form>
            </Modal>

            {/* Silme Onay Modalı */}
            <Modal
                isOpen={!!protocolToDelete}
                onClose={() => setProtocolToDelete(null)}
                title="SİSTEM TEMİZLİĞİ"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-6">
                    <div className="w-20 h-20 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(242,73,92,0.1)]">
                        <AlertTriangle size={36} className="animate-bounce" />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-grafana-text-primary uppercase tracking-widest font-mono">Yapılandırma Silinsin mi?</h4>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed font-mono px-4">
                            Uç noktanın <span className="font-bold text-grafana-accent-red">[{protocolToDelete?.configName}]</span> kalıcı olarak silinmesi. Tüm bağlı cihaz verileri etkilenecektir.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 px-4">
                        <button
                            onClick={() => setProtocolToDelete(null)}
                            disabled={isDeleting}
                            className="py-3 px-4 rounded-sm border border-grafana-border bg-grafana-bg text-grafana-text-secondary font-bold text-[10px] hover:bg-grafana-panel transition-colors disabled:opacity-50 tracking-widest uppercase font-mono"
                        >
                            İPTAL
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-3 px-4 rounded-sm bg-grafana-accent-red text-white font-bold text-[10px] hover:bg-grafana-accent-red/90 shadow-lg shadow-grafana-accent-red/20 transition-all disabled:opacity-50 tracking-widest uppercase font-mono"
                        >
                            {isDeleting ? 'SİLİNİYOR' : 'EVET, SİL'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Inline Düğüm Oluşturma Modalı */}
            <Modal
                isOpen={isPlantModalOpen}
                onClose={() => setIsPlantModalOpen(false)}
                title="DÜĞÜM YÖNETİMİ"
                icon={Factory}
                maxWidth="5xl"
                zIndex={250}
            >
                <div className="p-2">
                    <PlantForm
                        key="inline-plant-form"
                        companies={companies.map(c => ({ id: c.id, name: c.name }))}
                        onSubmit={handlePlantSubmit}
                        isSubmitting={isCreatingPlant}
                        submitLabel="Düğüm Kaydet"
                    />
                </div>
            </Modal>
        </div>
    );
}

export default function ProtocolsPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono text-grafana-text-secondary animate-pulse uppercase tracking-[0.3em]">İletişim Yığını Taranıyor...</div>}>
            <ProtocolsContent />
        </Suspense>
    );
}
