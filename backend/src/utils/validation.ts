import { z } from 'zod';

export const PowerPlantSchema = z.object({
    name: z.string().min(2, "Santral adı en az 2 karakter olmalıdır"),
    description: z.string().optional(),
    customerId: z.string().min(1, "Geçerli bir müşteri ID'si gereklidir")
});

export const DeviceSchema = z.object({
    name: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır"),
    protocol: z.enum(['IEC104', 'MODBUS_TCP']),
    ipAddress: z.string().min(1, "Geçerli bir IP adresi giriniz"),
    port: z.number().int().min(1).max(65535, "Port 1-65535 arasında olmalıdır"),
    slaveId: z.number().int().min(0).max(255).optional().default(1),
    powerPlantId: z.string().min(1, "Geçerli bir santral ID'si gereklidir")
});

export const IOAMappingSchema = z.object({
    deviceId: z.string().min(1),
    name: z.string().min(1, "Etiket adı gereklidir"),
    unit: z.string().optional(),
    description: z.string().optional(),

    // IEC104 fields
    ioa: z.number().int().optional(),

    // Modbus fields
    registerAddress: z.number().int().optional(),
    functionCode: z.number().int().min(1).max(255).optional().default(3),
    registerType: z.string().optional(),
    dataType: z.string().optional(),

    scale: z.number().default(1.0),
    offset: z.number().default(0.0)
}).refine((data: any) => {
    return data.ioa !== undefined || data.registerAddress !== undefined;
}, {
    message: "IEC104 (ioa) veya Modbus (registerAddress) adreslerinden en az biri tanımlanmalıdır",
    path: ["registerAddress"]
});
