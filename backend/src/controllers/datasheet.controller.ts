import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

// ============================================================
// Profile Schemas & Controllers
// ============================================================

const createProfileSchema = z.object({
    name: z.string().min(1, "Profil adı zorunludur"),
    protocolType: z.enum(["MODBUS", "IEC104"], {
        message: "Protokol tipi MODBUS veya IEC104 olmalıdır"
    })
});

export const getDatasheetProfiles = async (req: Request, res: Response) => {
    try {
        const profiles = await prisma.datasheetProfile.findMany({
            include: {
                _count: {
                    select: { points: true, devices: true }
                }
            }
        });
        res.json(profiles);
    } catch (error) {
        console.error('getDatasheetProfiles error:', error);
        res.status(500).json({ error: 'Profiller alınamadı' });
    }
};

export const createDatasheetProfile = async (req: Request, res: Response) => {
    try {
        const data = createProfileSchema.parse(req.body);

        // Aynı isimde profil var mı kontrol et
        const existing = await prisma.datasheetProfile.findFirst({
            where: { name: data.name }
        });
        if (existing) {
            res.status(409).json({ error: `"${data.name}" adında bir profil zaten mevcut` });
            return;
        }

        const profile = await prisma.datasheetProfile.create({ data });
        res.status(201).json(profile);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('createDatasheetProfile error:', error);
            res.status(500).json({ error: 'Profil oluşturulamadı' });
        }
    }
};

export const updateDatasheetProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createProfileSchema.partial().parse(req.body);
        const profile = await prisma.datasheetProfile.update({
            where: { id: String(id) },
            data
        });
        res.json(profile);
    } catch (error) {
        console.error('updateDatasheetProfile error:', error);
        res.status(500).json({ error: 'Profil güncellenemedi' });
    }
};

export const deleteDatasheetProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Bağlı cihaz var mı kontrol et
        const linkedDevices = await prisma.device.count({
            where: { datasheet_profile_id: String(id) }
        });
        if (linkedDevices > 0) {
            res.status(400).json({ error: `Bu profile ${linkedDevices} cihaz bağlı. Önce cihazların profil bağlantısını kaldırın.` });
            return;
        }

        await prisma.datasheetProfile.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDatasheetProfile error:', error);
        res.status(500).json({ error: 'Profil silinemedi' });
    }
};

// ============================================================
// DatasheetPoint Schemas & Controllers
// ============================================================

const createDataPointSchema = z.object({
    profile_id: z.string().uuid("Geçersiz Profil ID"),

    // --- Ortak Alanlar ---
    dataName: z.string().min(1, "Data adı zorunludur"),
    dataValue: z.string().optional().nullable(),
    registerAddress: z.number().int("Register adresi tam sayı olmalıdır").min(0, "Register adresi 0 veya daha büyük olmalıdır").optional().nullable(),
    isActive: z.boolean().optional().default(true),

    // --- Modbus'a Özel Alanlar ---
    functionCode: z.number().int().min(1).max(4, "Fonksiyon kodu 1-4 arasında olmalıdır").optional().nullable(),
    multiplier: z.number().optional().nullable(),
    wordSwap: z.boolean().optional().nullable(),

    // --- IEC104'e Özel Alanlar ---
    feederName: z.string().max(100, "Fider/Hücre ismi en fazla 100 karakter olmalıdır").optional().nullable(),
    signalType: z.string().max(100, "Sinyal tipi en fazla 100 karakter olmalıdır").optional().nullable(),
    signalDescription: z.string().max(250, "Sinyal açıklaması en fazla 250 karakter olmalıdır").optional().nullable(),
    dataType: z.string().max(50, "Data tipi en fazla 50 karakter olmalıdır").optional().nullable(),
    signalSource: z.string().max(100, "Sinyal kaynağı en fazla 100 karakter olmalıdır").optional().nullable(),
    componentId: z.string().max(100, "Komponent ID en fazla 100 karakter olmalıdır").optional().nullable(),
    componentText: z.string().max(250, "Komponent metni en fazla 250 karakter olmalıdır").optional().nullable(),
    ioa1ObjectAddress: z.number().int("IOA Obje Adresi tam sayı olmalıdır").min(0, "IOA Obje Adresi 0 veya daha büyük olmalıdır").optional().nullable(),
    ioa2CellNo: z.number().int("IOA2 Hücre No tam sayı olmalıdır").min(0, "IOA2 Hücre No 0 veya daha büyük olmalıdır").optional().nullable(),
    ioa3VoltageLevel: z.number().int("IOA3 Gerilim Seviyesi tam sayı olmalıdır").min(0, "IOA3 Gerilim Seviyesi 0 veya daha büyük olmalıdır").optional().nullable(),
    scadaAddress: z.number().int("SCADA Adresi tam sayı olmalıdır").min(0, "SCADA Adresi 0 veya daha büyük olmalıdır").optional().nullable(),
});

export const getDatasheetPoints = async (req: Request, res: Response) => {
    try {
        const { profileId } = req.query;
        let whereClause = {};
        if (profileId) {
            whereClause = { profile_id: String(profileId) };
        }

        const points = await prisma.datasheetPoint.findMany({
            where: whereClause,
            orderBy: [
                { ioa1ObjectAddress: 'asc' },
                { registerAddress: 'asc' },
                { dataName: 'asc' },
            ]
        });
        res.json(points);
    } catch (error) {
        console.error('getDatasheetPoints error:', error);
        res.status(500).json({ error: 'Veri noktaları alınamadı' });
    }
};

export const createDatasheetPoint = async (req: Request, res: Response) => {
    try {
        const data = createDataPointSchema.parse(req.body);

        // Profil var mı kontrol et
        const profile = await prisma.datasheetProfile.findUnique({
            where: { id: data.profile_id }
        });
        if (!profile) {
            res.status(404).json({ error: 'Profil bulunamadı' });
            return;
        }

        // Aynı profilde aynı dataName var mı kontrol et
        const existingPoint = await prisma.datasheetPoint.findFirst({
            where: {
                profile_id: data.profile_id,
                dataName: data.dataName
            }
        });
        if (existingPoint) {
            res.status(409).json({ error: `"${data.dataName}" adında bir veri noktası bu profilde zaten mevcut` });
            return;
        }

        const point = await prisma.datasheetPoint.create({
            data
        });

        res.status(201).json(point);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('createDatasheetPoint error:', error);
            res.status(500).json({ error: 'Veri noktası oluşturulamadı' });
        }
    }
};

export const updateDatasheetPoint = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDataPointSchema.partial().parse(req.body);

        const point = await prisma.datasheetPoint.update({
            where: { id: String(id) },
            data
        });
        res.json(point);
    } catch (error) {
        console.error('updateDatasheetPoint error:', error);
        res.status(500).json({ error: 'Veri noktası güncellenemedi' });
    }
};

export const deleteDatasheetPoint = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Bağlı telemetri var mı kontrol et
        const telemetryCount = await prisma.telemetryValue.count({
            where: { pointId: String(id) }
        });
        if (telemetryCount > 0) {
            res.status(400).json({ error: `Bu veri noktasına ${telemetryCount} telemetri kaydı bağlı. Önce telemetri verilerini silmeniz gerekir.` });
            return;
        }

        await prisma.datasheetPoint.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDatasheetPoint error:', error);
        res.status(500).json({ error: 'Veri noktası silinemedi' });
    }
};
