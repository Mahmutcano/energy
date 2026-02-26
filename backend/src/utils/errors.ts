export enum ErrorCode {
    // System & Validation
    VALIDATION_FAILED = 'VAL_001',
    RESOURCE_NOT_FOUND = 'SYS_004',
    INTERNAL_ERROR = 'SYS_500',

    // Authentication
    UNAUTHORIZED = 'AUTH_001',
    INVALID_CREDENTIALS = 'AUTH_002',

    // Company
    COMPANY_NOT_FOUND = 'COMP_001',
    COMPANY_HAS_PLANTS = 'COMP_002',
    COMPANY_HAS_USERS = 'COMP_003',

    // Plant
    PLANT_NOT_FOUND = 'PLANT_001',
    PLANT_HAS_PROTOCOLS = 'PLANT_002',
    PLANT_HAS_USERS = 'PLANT_003',

    // Protocol
    PROTOCOL_NOT_FOUND = 'PROTO_001',
    PROTOCOL_HAS_DEVICES = 'PROTO_002',

    // Device
    DEVICE_NOT_FOUND = 'DEV_001',
    DEVICE_HAS_TELEMETRY = 'DEV_002',

    // Datasheet
    DATASHEET_NOT_FOUND = 'DS_001',
    DATASHEET_HAS_DEVICES = 'DS_002',
    DATASHEET_HAS_POINTS = 'DS_003',

    // User
    USER_NOT_FOUND = 'USR_001',
    USER_EMAIL_EXISTS = 'USR_002',
    USER_CODE_EXISTS = 'USR_003',
}

export class AppError extends Error {
    public readonly errorCode: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(errorCode: ErrorCode, message: string, statusCode: number = 400, details?: any) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export const handleErrorResponse = (res: any, error: any) => {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: error.message,
            errorCode: error.errorCode,
            details: error.details
        });
    }

    if (error?.name === 'ZodError') {
        return res.status(400).json({
            error: 'Doğrulama hatası / Validation error',
            errorCode: ErrorCode.VALIDATION_FAILED,
            details: error.errors || error
        });
    }

    // Prisma specific errors (P2003 = Foreign Key Constraint, P2002 = Unique Constraint)
    if (error?.code === 'P2003') {
        return res.status(400).json({
            error: 'Bu kayıt başka verilerle ilişkili olduğu için silinemez / Cannot delete resource due to existing relations',
            errorCode: 'SYS_005'
        });
    }

    if (error?.code === 'P2002') {
        return res.status(400).json({
            error: 'Bu kayıt zaten mevcut (Benzersiz alan çakışması) / Record already exists (Unique constraint)',
            errorCode: 'SYS_006'
        });
    }

    console.error('Unhandled Error:', error);
    return res.status(500).json({
        error: error.message || 'Sunucu tarafında beklenmeyen bir hata oluştu / Internal Server Error',
        errorCode: ErrorCode.INTERNAL_ERROR,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
};
