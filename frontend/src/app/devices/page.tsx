"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Cpu, Plus, Search, X, HardDrive, Tag, ToggleLeft, ToggleRight, Network, Pencil, Trash2, FileText, FileJson, AlertTriangle, Activity, Database, Shield, Layout } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

interface ProtocolConfig {
    id: string;
    configName: string;
    protocolType: string;
    plant?: { plantName: string };
}

interface DatasheetProfile {
    id: string;
    name: string;
    protocolType: string;
}

interface Device {
    id: string;
    protocolConfigId: string;
    datasheetProfileId?: string;
    deviceName: string;
    deviceType: 'INVERTER' | 'ANALYZER' | 'RELAY';
    isActive: boolean;
    protocol?: ProtocolConfig;
    datasheetProfile?: DatasheetProfile;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
}

function DevicesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialProtocolId = searchParams?.get('protocolId') || '';

    const [devices, setDevices] = useState<Device[]>([]);
    const [protocols, setProtocols] = useState<ProtocolConfig[]>([]);
    const [profiles, setProfiles] = useState<DatasheetProfile[]>([]);
    const [plants, setPlants] = useState<{ id: string; plantName: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        protocolConfigId: initialProtocolId,
        datasheetProfileId: '',
        deviceName: '',
        deviceType: 'INVERTER' as 'INVERTER' | 'ANALYZER' | 'RELAY',
        isActive: true,
        createdAt: ''
    });
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline Modals State
    const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
    const [iscreatingProtocol, setIsCreatingProtocol] = useState(false);
    const [newProtocolData, setNewProtocolData] = useState({
        plantId: '',
        configName: '',
        protocolType: 'MODBUS',
        ipAddress: '127.0.0.1',
        port: 502,
        slaveId: 1
    });

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [newProfileData, setNewProfileData] = useState({
        name: '',
        protocolType: 'MODBUS'
    });

    const submittingRef = React.useRef(false);

    const fetchDevices = async () => {
        try {
            const res = await apiRequest('/api/devices');
            if (res.ok) {
                const result = await res.json();
                let data = result.success ? result.data : result;
                if (!Array.isArray(data)) data = [];

                if (initialProtocolId) {
                    data = data.filter((d: Device) => d.protocolConfigId === initialProtocolId);
                }
                setDevices(data);
            }
        }
        catch (err) {
            console.error('Cihazlar çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProtocols = async () => {
        try {
            const res = await apiRequest('/api/comm-protocols');
            if (res.ok) {
                const result = await res.json();
                const data = result.success ? result.data : result;
                setProtocols(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Protokoller çekilemedi:', err);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await apiRequest('/api/datasheet-profiles');
            if (res.ok) {
                const result = await res.json();
                const data = result.success ? result.data : result;
                setProfiles(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Profiller çekilemedi:', err);
        }
    };

    const fetchPlants = async () => {
        try {
            const res = await apiRequest('/api/plants');
            if (res.ok) {
                const result = await res.json();
                const data = result.success ? result.data : result;
                setPlants(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Santraller çekilemedi:', err);
        }
    };

    useEffect(() => {
        Promise.all([fetchDevices(), fetchProtocols(), fetchProfiles(), fetchPlants()]);
    }, [initialProtocolId]);


    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({
            protocolConfigId: initialProtocolId || (protocols.length > 0 ? protocols[0].id : ''),
            datasheetProfileId: '',
            deviceName: '',
            deviceType: 'INVERTER',
            isActive: true,
            createdAt: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (device: Device) => {
        setEditingDevice(device);
        setFormData({
            protocolConfigId: device.protocolConfigId || '',
            datasheetProfileId: device.datasheetProfileId || '',
            deviceName: device.deviceName || '',
            deviceType: device.deviceType || 'INVERTER',
            isActive: device.isActive,
            createdAt: device.createdAt ? new Date(device.createdAt).toISOString().slice(0, 16) : ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (device: Device) => {
        setDeviceToDelete(device);
    };

    const confirmDelete = async () => {
        if (!deviceToDelete) return;
        setIsDeleting(true);
        try {
            const res = await apiRequest(`/api/devices/${deviceToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Cihaz devreden çıkarıldı');
                setDeviceToDelete(null);
                fetchDevices();
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Silme hatası';
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Silme hatası:', err);
            toast.error('Bir hata oluştu');
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
            if (!formData.protocolConfigId || !formData.datasheetProfileId || !formData.deviceName) {
                toast.error('Protokol, Profil ve İsim gereklidir');
                setIsSubmitting(false);
                submittingRef.current = false;
                return;
            }

            const body: any = {
                protocolConfigId: formData.protocolConfigId,
                datasheetProfileId: formData.datasheetProfileId,
                deviceName: formData.deviceName,
                deviceType: formData.deviceType,
                isActive: formData.isActive
            };
            if (editingDevice && formData.createdAt) {
                body.createdAt = new Date(formData.createdAt).toISOString();
            }

            const url = editingDevice ? `/api/devices/${editingDevice.id}` : '/api/devices';
            const method = editingDevice ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success(editingDevice ? 'Cihaz güncellendi' : 'Cihaz devreye alındı');
                setIsModalOpen(false);
                setFormData({
                    protocolConfigId: initialProtocolId,
                    datasheetProfileId: '',
                    deviceName: '',
                    deviceType: 'INVERTER',
                    isActive: true,
                    createdAt: ''
                });
                setEditingDevice(null);
                fetchDevices();
            } else {
                let errorMessage = 'İşlem başarısız';
                try {
                    const result = await res.json();
                    errorMessage = result.error?.message || result.error || result.message || errorMessage;
                } catch (e) { }
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Oluşturma/Güncelleme hatası:', err);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleCreateProtocol = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingProtocol(true);
        try {
            const body = {
                plantId: newProtocolData.plantId,
                configName: newProtocolData.configName,
                protocolType: newProtocolData.protocolType,
                ...(newProtocolData.protocolType === 'MODBUS' ? {
                    modbusConfig: {
                        ipAddress: newProtocolData.ipAddress,
                        port: Number(newProtocolData.port),
                        slaveId: Number(newProtocolData.slaveId),
                    }
                } : {
                    iec104Config: {
                        ipAddress: newProtocolData.ipAddress,
                        port: Number(newProtocolData.port),
                        asduAddr: Number(newProtocolData.slaveId),
                    }
                })
            };
            const res = await apiRequest('/api/comm-protocols', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const result = await res.json();
                const newProto = result.success ? result.data : result;
                toast.success('Protokol oluşturuldu');
                await fetchProtocols();
                setFormData({ ...formData, protocolConfigId: newProto.id });
                setIsProtocolModalOpen(false);
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Protokol oluşturulamadı';
                toast.error(errorMessage);
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
        } finally {
            setIsCreatingProtocol(false);
        }
    };

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingProfile(true);
        try {
            const res = await apiRequest('/api/datasheet-profiles', {
                method: 'POST',
                body: JSON.stringify(newProfileData)
            });
            if (res.ok) {
                const result = await res.json();
                const newProf = result.success ? result.data : result;
                toast.success('Profil oluşturuldu');
                await fetchProfiles();
                setFormData({ ...formData, datasheetProfileId: newProf.id });
                setIsProfileModalOpen(false);
                setNewProfileData({ name: '', protocolType: 'MODBUS' });
            } else {
                const result = await res.json();
                const errorMessage = result.error?.message || result.error || 'Profil oluşturulamadı';
                toast.error(errorMessage);
            }
        } catch (err) {
            toast.error('Bir hata oluştu');
        } finally {
            setIsCreatingProfile(false);
        }
    };

    const filteredDevices = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.protocol?.configName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-16 font-sans">
            <PageHeader 
                title="CİHAZ" 
                highlightedTitle="ENVANTERİ"
                subtitle="Operasyonel varlık yönetimi ve ağ devreye alma"
                icon={Cpu}
            >
                <div className="relative flex-1 md:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grafana-text-secondary group-focus-within:text-grafana-accent-blue transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="VARLIK ARA..."
                        className="w-full pl-10 pr-4 py-2 bg-grafana-bg border border-grafana-border rounded-sm text-[11px] text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono placeholder:text-grafana-text-secondary/30 transition-all uppercase"
                    />
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-3 px-6 py-2.5 bg-grafana-accent-blue hover:bg-grafana-accent-blue/90 text-white rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(87,148,242,0.2)] font-mono whitespace-nowrap"
                >
                    <Plus size={14} /> CİHAZI DEVREYE AL
                </button>
            </PageHeader>

            {/* Cihaz Tablosu */}
            <div className="bg-grafana-panel/50 border border-grafana-border rounded-sm overflow-hidden">
                <div className="p-4 border-b border-grafana-border bg-grafana-bg/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">Kayıt Matrisi</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-sm bg-grafana-accent-blue/10 border border-grafana-accent-blue/20 text-grafana-accent-blue font-mono font-bold">
                            {filteredDevices.length} DÜĞÜM ÇEVRİMİÇİ
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="scada-table">
                        <thead>
                            <tr>
                                <th>CİHAZ TANIMLAYICI</th>
                                <th>SINIF</th>
                                <th>İLETİŞİM YIĞINI</th>
                                <th>PROFİL</th>
                                <th>ZAMAN DAMGALARI</th>
                                <th className="text-center">DURUM</th>
                                <th className="text-right">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 font-mono text-grafana-text-secondary animate-pulse uppercase tracking-widest">Varlık kaydı sorgulanıyor...</td>
                                </tr>
                            ) : filteredDevices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 font-mono text-grafana-text-secondary uppercase tracking-widest">Mevcut sektörde devreye alınmış varlık bulunamadı</td>
                                </tr>
                            ) : filteredDevices.map((device) => (
                                <tr key={device.id} className="group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary/50 group-hover:text-grafana-accent-blue transition-colors">
                                                <HardDrive size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-grafana-text-primary uppercase tracking-wide">{device.deviceName}</span>
                                                <span className="text-[9px] font-mono text-grafana-text-secondary uppercase tracking-tighter">ID: {device.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-sm border font-mono uppercase tracking-widest",
                                            device.deviceType === 'INVERTER' ? "bg-grafana-accent-orange/10 border-grafana-accent-orange/30 text-grafana-accent-orange" :
                                            device.deviceType === 'ANALYZER' ? "bg-grafana-accent-blue/10 border-grafana-accent-blue/30 text-grafana-accent-blue" :
                                            "bg-grafana-accent-green/10 border-grafana-accent-green/30 text-grafana-accent-green"
                                        )}>
                                            {device.deviceType === 'INVERTER' ? 'EVİRİCİ' : device.deviceType === 'ANALYZER' ? 'ANALİZÖR' : 'RÖLE'}
                                        </span>
                                    </td>
                                    <td>
                                        {device.protocol ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-grafana-text-primary">
                                                    <Shield size={10} className="text-grafana-accent-blue" />
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">{device.protocol.configName}</span>
                                                </div>
                                                <span className="text-[9px] font-mono text-grafana-text-secondary uppercase tracking-tighter ml-4">
                                                    {device.protocol.plant?.plantName} / {device.protocol.protocolType}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-mono text-grafana-text-secondary/30 uppercase tracking-widest italic">Yığın Atanmadı</span>
                                        )}
                                    </td>
                                    <td>
                                        {device.datasheetProfile ? (
                                            <div className="flex items-center gap-2">
                                                <FileJson size={12} className="text-grafana-accent-green/50" />
                                                <span className="text-[11px] font-mono text-grafana-text-primary uppercase tracking-tight">{device.datasheetProfile.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-mono text-grafana-accent-red/30 uppercase tracking-widest italic">Profil Eksik</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex flex-col font-mono">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-grafana-text-primary tabular-nums">
                                                <Activity size={10} className="text-grafana-accent-blue" />
                                                {device.createdAt ? new Date(device.createdAt).toLocaleDateString('tr-TR') : '-'}
                                            </div>
                                            <span className="text-[9px] text-grafana-text-secondary uppercase tracking-tighter ml-4">
                                                {device.createdAt ? new Date(device.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                device.isActive ? "bg-grafana-accent-green shadow-[0_0_8px_rgba(115,191,105,0.4)]" : "bg-grafana-text-secondary/20"
                                            )} />
                                            <span className={cn(
                                                "text-[9px] font-bold font-mono uppercase tracking-tighter",
                                                device.isActive ? "text-grafana-accent-green" : "text-grafana-text-secondary/40"
                                            )}>
                                                {device.isActive ? 'AKTİF' : 'ÇEVRİMDIŞI'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                title="Yapılandır" 
                                                onClick={() => openEditModal(device)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-blue hover:border-grafana-accent-blue/50 transition-all"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                title="Devreden Çıkar" 
                                                onClick={() => handleDeleteClick(device)} 
                                                className="p-2 rounded-sm bg-grafana-bg border border-grafana-border text-grafana-text-secondary hover:text-grafana-accent-red hover:border-grafana-accent-red/50 transition-all"
                                            >
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

            {/* Oluştur / Düzenle Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDevice ? 'CİHAZ YAPILANDIRMA' : 'CİHAZ DEVREYE ALMA'}
                icon={Cpu}
                maxWidth="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">İletişim Standardı</label>
                            <select
                                value={formData.protocolConfigId}
                                onChange={(e) => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setIsProtocolModalOpen(true);
                                        setNewProtocolData({ ...newProtocolData, plantId: plants.length > 0 ? plants[0].id : '' });
                                    } else {
                                        setFormData({ ...formData, protocolConfigId: e.target.value });
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                                required
                            >
                                <option value="" disabled>YIĞIN SEÇ</option>
                                {protocols.map(p => (
                                    <option key={p.id} value={p.id}>{p.configName.toUpperCase()} ({p.plant?.plantName.toUpperCase()})</option>
                                ))}
                                <option value="ADD_NEW" className="font-bold text-grafana-accent-green">+ YENİ YIĞIN BAŞLAT</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Varlık Sınıfı</label>
                            <select
                                value={formData.deviceType}
                                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                                required
                            >
                                <option value="INVERTER">EVİRİCİ</option>
                                <option value="ANALYZER">ANALİZÖR</option>
                                <option value="RELAY">RÖLE</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Veri Modeli Profili</label>
                        <select
                            value={formData.datasheetProfileId}
                            onChange={(e) => {
                                if (e.target.value === 'ADD_NEW') {
                                    setIsProfileModalOpen(true);
                                } else {
                                    setFormData({ ...formData, datasheetProfileId: e.target.value });
                                }
                            }}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                            required
                        >
                            <option value="" disabled>PROFİL SEÇ</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name.toUpperCase()} ({p.protocolType})</option>
                            ))}
                            <option value="ADD_NEW" className="font-bold text-grafana-accent-green">+ YENİ PROFİL OLUŞTUR</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Operasyonel Kimlik</label>
                        <input
                            type="text"
                            value={formData.deviceName}
                            onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono uppercase placeholder:opacity-20"
                            placeholder="DÜĞÜM TR 01"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-grafana-bg border border-grafana-border rounded-sm">
                        <div className="flex items-center gap-3">
                            <Activity size={16} className="text-grafana-text-secondary" />
                            <span className="text-[10px] font-bold text-grafana-text-primary uppercase tracking-[0.2em] font-mono">Operasyonel Durum</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                            className="transition-all hover:scale-110 active:scale-95"
                        >
                            {formData.isActive ? 
                                <ToggleRight size={32} className="text-grafana-accent-green" /> : 
                                <ToggleLeft size={32} className="text-grafana-text-secondary/20" />
                            }
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-grafana-accent-blue disabled:opacity-50 text-white font-bold tracking-[0.2em] text-[11px] rounded-sm shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono"
                    >
                        {isSubmitting ? 'DEVREYE ALINIYOR...' : editingDevice ? 'YAPILANDIRMAYI UYGULA' : 'VARLIK GİRİŞİNİ ONAYLA'}
                    </button>
                </form>
            </Modal>

            {/* Silme Onay Modalı */}
            <Modal
                isOpen={!!deviceToDelete}
                onClose={() => setDeviceToDelete(null)}
                title="VARLIĞI SİL"
                icon={AlertTriangle}
                maxWidth="sm"
            >
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 rounded-sm bg-grafana-accent-red/10 border border-grafana-accent-red/20 text-grafana-accent-red flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-grafana-text-primary uppercase tracking-widest font-mono">Cihazı Devreden Çıkar</h4>
                        <p className="text-[11px] text-grafana-text-secondary leading-relaxed font-mono">
                            <span className="font-bold text-grafana-accent-red">[{deviceToDelete?.deviceName}]</span> için silme protokolü başlatılıyor. Geçmiş telemetri verileri kalacaktır ancak aktif sorgulama duracaktır.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setDeviceToDelete(null)}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm border border-grafana-border bg-grafana-bg text-grafana-text-secondary font-bold text-[10px] hover:bg-grafana-panel transition-colors disabled:opacity-50 tracking-widest uppercase font-mono"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="py-2.5 px-4 rounded-sm bg-grafana-accent-red text-white font-bold text-[10px] hover:bg-grafana-accent-red/90 shadow-lg shadow-grafana-accent-red/20 transition-all disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2 font-mono"
                        >
                            {isDeleting ? 'SİLİNİYOR...' : 'Silmeyi Onayla'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Inline Protokol Oluşturma Modalı */}
            <Modal
                isOpen={isProtocolModalOpen}
                onClose={() => setIsProtocolModalOpen(false)}
                title="YIĞIN BAŞLATMA"
                icon={Network}
                maxWidth="lg"
                zIndex={250}
            >
                <form onSubmit={handleCreateProtocol} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Üst Düğüm</label>
                        <select
                            value={newProtocolData.plantId}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, plantId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                            required
                        >
                            {plants.length === 0 && <option value="">ÖNCE DÜĞÜM EKLE</option>}
                            {plants.map(p => <option key={p.id} value={p.id}>{p.plantName.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Yığın Etiketi</label>
                        <input
                            type="text"
                            value={newProtocolData.configName}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, configName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono uppercase"
                            placeholder="OPERASYONEL ETİKET"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Standart</label>
                        <select
                            value={newProtocolData.protocolType}
                            onChange={(e) => setNewProtocolData({ ...newProtocolData, protocolType: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                        >
                            <option value="MODBUS">MODBUS TCP</option>
                            <option value="IEC104">IEC 60870-5-104</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Ağ IP</label>
                            <input
                                type="text"
                                value={newProtocolData.ipAddress}
                                onChange={(e) => setNewProtocolData({ ...newProtocolData, ipAddress: e.target.value })}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono"
                                placeholder="0.0.0.0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Port</label>
                            <input
                                type="number"
                                value={newProtocolData.port}
                                onChange={(e) => setNewProtocolData({ ...newProtocolData, port: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono tabular-nums"
                                placeholder="502"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={iscreatingProtocol}
                        className="w-full py-3.5 bg-grafana-accent-blue disabled:opacity-50 text-white font-bold tracking-[0.2em] text-[11px] rounded-sm shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono"
                    >
                        {iscreatingProtocol ? 'KOMUT ÇALIŞTIRILIYOR...' : 'YIĞINI BAŞLAT'}
                    </button>
                </form>
            </Modal>

            {/* Inline Profil Oluşturma Modalı */}
            <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="PROFİL BAŞLATMA"
                icon={FileJson}
                maxWidth="sm"
                zIndex={250}
            >
                <form onSubmit={handleCreateProfile} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">Profil Tanımlayıcı</label>
                        <input
                            type="text"
                            value={newProfileData.name}
                            onChange={(e) => setNewProfileData({ ...newProfileData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono uppercase"
                            placeholder="PROFİL ADI"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-grafana-text-secondary uppercase tracking-widest font-mono ml-1">İletişim Protokolü</label>
                        <select
                            value={newProfileData.protocolType}
                            onChange={(e) => setNewProfileData({ ...newProfileData, protocolType: e.target.value })}
                            className="w-full px-4 py-2.5 bg-grafana-bg border border-grafana-border rounded-sm text-xs text-grafana-text-primary focus:border-grafana-accent-blue/50 outline-none font-mono appearance-none"
                        >
                            <option value="MODBUS">MODBUS TCP</option>
                            <option value="IEC104">IEC 60870-5-104</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isCreatingProfile}
                        className="w-full py-3.5 bg-grafana-accent-blue disabled:opacity-50 text-white font-bold tracking-[0.2em] text-[11px] rounded-sm shadow-lg shadow-grafana-accent-blue/20 hover:bg-grafana-accent-blue/90 transition-all uppercase font-mono"
                    >
                        {isCreatingProfile ? 'KOMUT ÇALIŞTIRILIYOR...' : 'PROFİLİ BAŞLAT'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}

export default function DevicesPage() {
    return (
        <Suspense fallback={<div className="p-10 font-mono text-grafana-text-secondary animate-pulse">Cihaz Deposu Başlatılıyor...</div>}>
            <DevicesContent />
        </Suspense>
    );
}
