
import {
    pgTable,
    text,
    boolean,
    timestamp,
    uuid,
    integer,
    decimal,
    real,
    bigint,
    smallint,
    index,
    pgEnum,
    doublePrecision,
    uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const adminTypeEnum = pgEnum('AdminType', ['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']);
export const permissionLevelEnum = pgEnum('PermissionLevel', ['READ', 'WRITE', 'FULL']);
export const plantTypeEnum = pgEnum('PlantType', ['SOLAR', 'WIND', 'HYDRO']);
export const protocolTypeEnum = pgEnum('ProtocolType', ['MODBUS', 'IEC104']);
export const deviceTypeEnum = pgEnum('DeviceType', ['INVERTER', 'ANALYZER', 'RELAY']);
export const communicationAlarmStatusEnum = pgEnum('CommunicationAlarmStatus', ['ACTIVE', 'RESOLVED']);

export const dataTypeEnum = pgEnum('DataType', [
    'BYTE', 'WORD', 'DWORD', 'LWORD',
    'SINT', 'USINT', 'INT', 'UINT',
    'DINT', 'UDINT', 'LINT', 'ULINT',
    'FLOAT32', 'DOUBLE64'
]);

export const measurementTypeEnum = pgEnum('MeasurementType', [
    'NEUTRAL_VOLTAGE',
    'PHASE_VOLTAGE',
    'PHASE_CURRENT',
    'ACTIVE_POWER',
    'TOTAL_ACTIVE_POWER',
    'APPARENT_POWER',
    'TOTAL_APPARENT_POWER',
    'REACTIVE_POWER',
    'TOTAL_REACTIVE_POWER',
    'POWER_FACTOR',
    'FREQUENCY',
    'IMPORT_ACTIVE_ENERGY',
    'EXPORT_ACTIVE_ENERGY',
    'INDUCTIVE_REACTIVE_ENERGY',
    'CAPACITIVE_REACTIVE_ENERGY',
    'HARMONIC_VOLTAGE',
    'HARMONIC_CURRENT',
    'FLICKER_SHORT_TIME',
    'FLICKER_LONG_TIME'
]);

// Tables
export const appUser = pgTable('AppUser', {
    id: uuid('id').primaryKey().defaultRandom(),
    userCode: text('userCode').notNull().unique(),
    firstName: text('firstName').notNull(),
    lastName: text('lastName').notNull(),
    email: text('email').notNull().unique(),
    adminType: adminTypeEnum('adminType').notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
}, (table) => ({
    userCodeIdx: index('AppUser_userCode_idx').on(table.userCode),
    emailIdx: index('AppUser_email_idx').on(table.email),
}));

export const companyProfile = pgTable('CompanyProfile', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    representative: text('representative'),
    taxOffice: text('taxOffice'),
    taxNumber: integer('taxNumber'),
    ytbsUsername: text('ytbsUsername'),
    ytbsPassword: text('ytbsPassword'),
    ytbsApiKey: text('ytbsApiKey'),
    baglantiAnlasmasiSirketiLisansNo: text('baglantiAnlasmasiSirketiLisansNo'),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
}, (table) => ({
    nameIdx: index('CompanyProfile_name_idx').on(table.name),
}));

export const appUserProfile = pgTable('AppUserProfile', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId').notNull().references(() => appUser.id),
    companyId: uuid('companyId').notNull().references(() => companyProfile.id),
    plantId: uuid('plantId').references(() => plant.id),
    deviceId: uuid('deviceId').references(() => device.id),
    permissionLevel: permissionLevelEnum('permissionLevel').notNull(),
    isActive: boolean('isActive').default(true).notNull(),
}, (table) => ({
    userIdIdx: index('AppUserProfile_user_id_idx').on(table.userId),
    companyIdIdx: index('AppUserProfile_company_id_idx').on(table.companyId),
    plantIdIdx: index('AppUserProfile_plant_id_idx').on(table.plantId),
    deviceIdIdx: index('AppUserProfile_device_id_idx').on(table.deviceId),
}));

export const plant = pgTable('Plant', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('companyId').notNull().references(() => companyProfile.id),
    plantName: text('plantName').notNull(),
    plantType: plantTypeEnum('plantType').notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    isActive: boolean('isActive').default(true).notNull(),
    ytbsCode: text('ytbsCode').default('').notNull(),
    ytbsExternalId: integer('ytbsExternalId'),
    ytbsPlantName: text('ytbsPlantName'),
    canSendYtbs: boolean('canSendYtbs').default(false).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
}, (table) => ({
    companyIdIdx: index('Plant_company_id_idx').on(table.companyId),
}));


export const protocolConfig = pgTable('ProtocolConfig', {
    id: uuid('id').primaryKey().defaultRandom(),
    plantId: uuid('plantId').notNull().references(() => plant.id),
    protocolType: protocolTypeEnum('protocolType').notNull(),
    configName: text('configName').notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
}, (table) => ({
    plantIdIdx: index('ProtocolConfig_plant_id_idx').on(table.plantId),
}));

export const modbusConfig = pgTable('ModbusConfig', {
    id: uuid('id').primaryKey().defaultRandom(),
    protocolId: uuid('protocolId').notNull().unique().references(() => protocolConfig.id),
    ipAddress: text('ipAddress').notNull(),
    port: integer('port').notNull(),
    slaveId: integer('slaveId').notNull(),
    timeout: integer('timeout').notNull(),
    retryCount: integer('retryCount').notNull(),
}, (table) => ({
    ipAddressIdx: index('ModbusConfig_ipAddress_idx').on(table.ipAddress),
}));

export const iec104Config = pgTable('IEC104Config', {
    id: uuid('id').primaryKey().defaultRandom(),
    protocolId: uuid('protocolId').notNull().unique().references(() => protocolConfig.id),
    ipAddress: text('ipAddress').notNull(),
    port: integer('port').notNull(),
    asduAddr: integer('asduAddr').notNull(),
    t0: integer('t0').notNull(),
    t1: integer('t1').notNull(),
    t2: integer('t2').notNull(),
    t3: integer('t3').notNull(),
    k: integer('k').notNull(),
    w: integer('w').notNull(),
}, (table) => ({
    ipAddressIdx: index('IEC104Config_ipAddress_idx').on(table.ipAddress),
}));

export const device = pgTable('Device', {
    id: uuid('id').primaryKey().defaultRandom(),
    protocolConfigId: uuid('protocolConfigId').notNull().references(() => protocolConfig.id),
    deviceName: text('deviceName').notNull(),
    deviceType: deviceTypeEnum('deviceType').notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    isRecording: boolean('isRecording').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
    datasheetProfileId: uuid('datasheetProfileId').references(() => datasheetProfile.id),
}, (table) => ({
    protocolConfigIdIdx: index('Device_protocol_config_id_idx').on(table.protocolConfigId),
    deviceNameIdx: index('Device_deviceName_idx').on(table.deviceName),
}));
export const datasheetProfile = pgTable('DatasheetProfile', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    protocolType: protocolTypeEnum('protocolType').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
});

export const datasheetPoint = pgTable('DatasheetPoint', {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profileId').notNull().references(() => datasheetProfile.id, { onDelete: 'cascade' }),
    dataName: text('dataName').notNull(),
    dataExplanation: text('dataExplanation'),  
    address: integer('address'),               
    isActive: boolean('isActive').default(true).notNull(),
    functionCode: integer('functionCode'),     
    multiplier: doublePrecision('multiplier'),
    wordSwap: boolean('wordSwap').default(false),
    feederName: text('feederName'),
    signalType: text('signalType'),
    dataType: dataTypeEnum('dataType'),
    signalSource: text('signalSource'),
    componentId: text('componentId'),
    unit: text('unit'),                        
    ioa2CellNo: integer('ioa2CellNo'),         
    ioa3VoltageLevel: integer('ioa3VoltageLevel'), 
    recordingInterval: integer('recordingInterval').default(1),
    measurementType: measurementTypeEnum('measurementType'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    createdBy: uuid('createdBy'),
    updatedBy: uuid('updatedBy'),
}, (table) => ({
    profileIdIdx: index('DatasheetPoint_profile_id_idx').on(table.profileId),
    dataIdx: index('DatasheetPoint_data_idx').on(table.dataName),
    addressIdx: index('DatasheetPoint_address_idx').on(table.address),
}));



export const telemetryValue = pgTable('TelemetryValue', {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    deviceId: uuid('deviceId').notNull().references(() => device.id),
    pointId: uuid('pointId').notNull().references(() => datasheetPoint.id),
    measurementTime: timestamp('measurementTime', { withTimezone: true }).notNull(),
    valueNumeric: doublePrecision('valueNumeric'),
    quality: smallint('quality'),
    rawPayload: text('rawPayload'),
}, (table) => ({
    pointIdTimeIdx: index('tv_point_time_idx').on(table.pointId, table.measurementTime),
    deviceIdTimeIdx: index('tv_device_time_idx').on(table.deviceId, table.measurementTime),
    timeIdx: index('tv_time_idx').on(table.measurementTime),
}));

export const communicationAlarm = pgTable('CommunicationAlarm', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: uuid('deviceId').notNull().references(() => device.id),
    status: communicationAlarmStatusEnum('status').default('ACTIVE').notNull(),
    startTime: timestamp('startTime', { withTimezone: true }).defaultNow().notNull(),
    endTime: timestamp('endTime', { withTimezone: true }),
    lastSeenAt: timestamp('lastSeenAt', { withTimezone: true }),
    message: text('message'),
}, (table) => ({
    deviceIdIdx: index('CommunicationAlarm_device_id_idx').on(table.deviceId),
    statusIdx: index('CommunicationAlarm_status_idx').on(table.status),
}));

// Relations
export const appUserRelations = relations(appUser, ({ many }) => ({
    profiles: many(appUserProfile),
}));

export const companyProfileRelations = relations(companyProfile, ({ many }) => ({
    plants: many(plant),
    userProfiles: many(appUserProfile),
}));

export const appUserProfileRelations = relations(appUserProfile, ({ one }) => ({
    user: one(appUser, { fields: [appUserProfile.userId], references: [appUser.id] }),
    company: one(companyProfile, { fields: [appUserProfile.companyId], references: [companyProfile.id] }),
    plant: one(plant, { fields: [appUserProfile.plantId], references: [plant.id] }),
    device: one(device, { fields: [appUserProfile.deviceId], references: [device.id] }),
}));

export const plantRelations = relations(plant, ({ one, many }) => ({
    company: one(companyProfile, { fields: [plant.companyId], references: [companyProfile.id] }),
    protocols: many(protocolConfig),
    userProfiles: many(appUserProfile),
}));

export const protocolConfigRelations = relations(protocolConfig, ({ one, many }) => ({
    plant: one(plant, { fields: [protocolConfig.plantId], references: [plant.id] }),
    devices: many(device),
    modbusConfig: one(modbusConfig, { fields: [protocolConfig.id], references: [modbusConfig.protocolId] }),
    iec104Config: one(iec104Config, { fields: [protocolConfig.id], references: [iec104Config.protocolId] }),
}));

export const modbusConfigRelations = relations(modbusConfig, ({ one }) => ({
    protocol: one(protocolConfig, { fields: [modbusConfig.protocolId], references: [protocolConfig.id] }),
}));

export const iec104ConfigRelations = relations(iec104Config, ({ one }) => ({
    protocol: one(protocolConfig, { fields: [iec104Config.protocolId], references: [protocolConfig.id] }),
}));

export const deviceRelations = relations(device, ({ one, many }) => ({
    protocol: one(protocolConfig, { fields: [device.protocolConfigId], references: [protocolConfig.id] }),
    datasheetProfile: one(datasheetProfile, { fields: [device.datasheetProfileId], references: [datasheetProfile.id] }),
    userProfiles: many(appUserProfile),
    telemetryValues: many(telemetryValue),
    communicationAlarms: many(communicationAlarm),
}));

export const datasheetProfileRelations = relations(datasheetProfile, ({ many }) => ({
    points: many(datasheetPoint),
    devices: many(device),
}));

export const datasheetPointRelations = relations(datasheetPoint, ({ one, many }) => ({
    profile: one(datasheetProfile, { fields: [datasheetPoint.profileId], references: [datasheetProfile.id] }),
    telemetryValues: many(telemetryValue),
}));

export const telemetryValueRelations = relations(telemetryValue, ({ one }) => ({
    device: one(device, { fields: [telemetryValue.deviceId], references: [device.id] }),
    point: one(datasheetPoint, { fields: [telemetryValue.pointId], references: [datasheetPoint.id] }),
}));

export const communicationAlarmRelations = relations(communicationAlarm, ({ one }) => ({
    device: one(device, { fields: [communicationAlarm.deviceId], references: [device.id] }),
}));

// --- YTBS Integration Tables ---

export const ytbsPlant = pgTable('YtbsPlant', {
    id: uuid('id').primaryKey().defaultRandom(),
    plantId: uuid('plantId').notNull().references(() => plant.id, { onDelete: 'cascade' }),
    ytbsId: integer('ytbsId').notNull(),
    licenseNo: text('license_no').notNull(),
    plantName: text('plant_name').notNull(),
    capacityAc: doublePrecision('capacity_ac').notNull(),
    isActive: boolean('isActive').default(true).notNull(),
}, (table) => ({
    plantIdIdx: index('YtbsPlant_plant_id_idx').on(table.plantId),
    ytbsIdIdx: index('YtbsPlant_ytbs_id_idx').on(table.ytbsId),
}));

export const ytbsHourlyProduction = pgTable('YtbsHourlyProduction', {
    id: uuid('id').primaryKey().defaultRandom(),
    plantId: uuid('plantId').notNull().references(() => plant.id, { onDelete: 'cascade' }),
    externalPlantId: integer('externalPlantId').notNull(),
    ytbsPlantId: uuid('ytbsPlantId').notNull().references(() => ytbsPlant.id, { onDelete: 'cascade' }),
    readingDate: text('readingDate').notNull(),
    readingHour: text('readingHour').notNull(),
    valueMwh: doublePrecision('valueMwh').notNull(),
    isSent: boolean('isSent').default(false).notNull(),
    lastAttemptAt: timestamp('lastAttemptAt', { withTimezone: true }),
    retryCount: integer('retryCount').default(0).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
    ytbsPlantIdIdx: index('YtbsHourlyProduction_ytbs_plant_id_idx').on(table.ytbsPlantId),
    readingDateIdx: index('YtbsHourlyProduction_reading_date_idx').on(table.readingDate),
    isSentIdx: index('YtbsHourlyProduction_is_sent_idx').on(table.isSent),
    uniqueIdx: uniqueIndex('YtbsHourlyProduction_unique_idx').on(table.ytbsPlantId, table.readingDate, table.readingHour),
}));

export const ytbsInstantProduction = pgTable('YtbsInstantProduction', {
    id: uuid('id').primaryKey().defaultRandom(),
    plantId: uuid('plantId').notNull().references(() => plant.id, { onDelete: 'cascade' }),
    externalPlantId: integer('externalPlantId').notNull(),
    ytbsPlantId: uuid('ytbsPlantId').notNull().references(() => ytbsPlant.id, { onDelete: 'cascade' }),
    readingDate: text('readingDate').notNull(),
    readingTime: text('readingTime').notNull(),
    valueMw: doublePrecision('valueMw').notNull(),
    isSent: boolean('isSent').default(false).notNull(),
    lastAttemptAt: timestamp('lastAttemptAt', { withTimezone: true }),
    retryCount: integer('retryCount').default(0).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
    ytbsPlantIdIdx: index('YtbsInstantProduction_ytbs_plant_id_idx').on(table.ytbsPlantId),
    readingDateIdx: index('YtbsInstantProduction_reading_date_idx').on(table.readingDate),
    isSentIdx: index('YtbsInstantProduction_is_sent_idx').on(table.isSent),
    uniqueIdx: uniqueIndex('YtbsInstantProduction_unique_idx').on(table.ytbsPlantId, table.readingDate, table.readingTime),
}));

export const ytbsPlantRelations = relations(ytbsPlant, ({ one, many }) => ({
    plant: one(plant, { fields: [ytbsPlant.plantId], references: [plant.id] }),
    hourlyProductions: many(ytbsHourlyProduction),
    instantProductions: many(ytbsInstantProduction),
}));

export const ytbsHourlyProductionRelations = relations(ytbsHourlyProduction, ({ one }) => ({
    ytbsPlant: one(ytbsPlant, { fields: [ytbsHourlyProduction.ytbsPlantId], references: [ytbsPlant.id] }),
}));

export const ytbsInstantProductionRelations = relations(ytbsInstantProduction, ({ one }) => ({
    ytbsPlant: one(ytbsPlant, { fields: [ytbsInstantProduction.ytbsPlantId], references: [ytbsPlant.id] }),
}));

