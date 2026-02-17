import { z } from 'zod';

export const CompanyProfileSchema = z.object({
    name: z.string().min(2, "Şirket adı en az 2 karakter olmalıdır"),
    address: z.string().optional(),
    isActive: z.boolean().default(true)
});

export const PlantSchema = z.object({
    companyId: z.string().uuid("Geçerli bir Şirket ID'si (UUID) gereklidir"),
    plantName: z.string().min(2, "Santral adı en az 2 karakter olmalıdır"),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable()
});

export const DeviceCategorySchema = z.object({
    categoryName: z.string().min(2, "Kategori adı en az 2 karakter olmalıdır"),
    isActive: z.boolean().default(true)
});

export const DeviceSchema = z.object({
    categoryId: z.string().uuid("Geçerli bir Kategori ID'si (UUID) gereklidir"),
    deviceName: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır"),
    isActive: z.boolean().default(true)
});

export const CommProtocolSchema = z.object({
    deviceId: z.string().uuid("Geçerli bir Cihaz ID'si gereklidir"),
    plantId: z.string().uuid("Geçerli bir Santral ID'si gereklidir"),
    protocolType: z.enum(['MODBUS', 'IEC104']),
    ipAddress: z.string().optional().nullable(),
});

export const ModbusConfigSchema = z.object({
    commProtocolId: z.string().uuid(),
    slaveId: z.number().int().min(1).max(255),
    regAddress: z.number().int().min(0),
    dataType: z.enum(['INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'BOOLEAN'])
});

export const IEC104ConfigSchema = z.object({
    commProtocolId: z.string().uuid(),
    asduAddress: z.number().int().min(1),
    t0_timeout: z.number().int().min(1),
    k_window: z.number().int().min(1)
});

// For backward compatibility or internal use during migration
export const TelemetrySchema = z.object({
    commProtocolId: z.string().uuid(),
    value: z.number(),
    timestamp: z.date().optional()
});
