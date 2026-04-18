import { eq, and, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const YTBS_BASE_URL = 'https://ytbs.teias.gov.tr/api';
const YTBS_SERVICE_KEY = process.env.YTBS_SERVICE_KEY || '';

interface YtbsTokenResponse {
    token?: string;
    success: boolean;
    message?: string;
}

export class YtbsService {
    private static instance: YtbsService;
    private currentToken: string | null = null;
    private tokenExpiry: number = 0; // Epoch ms

    private constructor() { }

    public static getInstance(): YtbsService {
        if (!YtbsService.instance) {
            YtbsService.instance = new YtbsService();
        }
        return YtbsService.instance;
    }

    private async getAuthToken(): Promise<string> {
        if (this.currentToken && Date.now() < this.tokenExpiry - 5 * 60 * 1000) {
            return this.currentToken;
        }

        console.log('[YTBS] Token expired. Authenticating via Service Key...');
        const response = await this.login();
        if (response.success && response.token) {
            this.currentToken = response.token;
            this.tokenExpiry = Date.now() + 60 * 60 * 1000;
            return this.currentToken;
        }

        throw new Error(`[YTBS] Authentication failed: ${response.message}`);
    }

    private async postRequest(endpoint: string, body: any, requiresAuth: boolean = true) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'SERVICE_KEY': YTBS_SERVICE_KEY
        };

        if (requiresAuth) {
            const token = await this.getAuthToken();
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${YTBS_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (response.status === 401) {
            this.currentToken = null;
            this.tokenExpiry = 0;
            throw new Error('401_UNAUTHORIZED');
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.json();
    }

    /**
     * Auth: Login via Service Key
     */
    public async login(): Promise<YtbsTokenResponse> {
        try {
            const data = await this.postRequest('/yetkilendirme/login', {}, false);
            return {
                success: true,
                token: data.jeton || data.token
            };
        } catch (error: any) {
            console.error('[YTBS] Login error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Modelling: Trafo Merkezi Listele
     */
    public async listTrafoMerkezleri(date: string = new Date().toISOString().split('T')[0]) {
        return await this.postRequest('/modelleme/salt/trafomerkezi/listele', { tarih: date });
    }

    /**
     * Data Collection: Send Instant Production (Anlık Arz) - BATCH FORMAT 
     */
    public async sendInstantProductionBatch(licenseNo: string, records: any[]) {
        const payload = {
            baglantiAnlasmasiSirketLisansNo: licenseNo,
            veri: records.map(r => ({
                tarih: r.date,
                saat: r.hour,
                lisanssizSantralId: r.ytbsId,
                veriDeger: r.value
            }))
        };
        return await this.postRequest('/veritoplama/anliklisanssizsantralarz/ekle', payload);
    }

    /**
     * Data Collection: Send Hourly Production (Saatlik Üretim) - BATCH FORMAT
     */
    public async sendHourlyProductionBatch(licenseNo: string, records: any[]) {
        const payload = {
            baglantiAnlasmasiSirketLisansNo: licenseNo,
            veri: records.map(r => ({
                tarih: r.date,
                saat: r.hour,
                lisanssizSantralId: r.ytbsId,
                veriDeger: r.value
            }))
        };
        return await this.postRequest('/veritoplama/saatliklisanssizsantraluretim/ekle', payload);
    }

    public startCronJob() {
        setInterval(async () => {
            await this.processPendingRecords();
        }, 15 * 60 * 1000); 
        console.log('[YTBS] Sync Cron Job Started (15-min interval).');
    }

    public async triggerSync() {
        return await this.processPendingRecords();
    }

    private async processPendingRecords() {
        try {
            // 1. Process Hourly Productions
            const pendingHourly = await db.query.ytbsHourlyProduction.findMany({
                where: and(eq(schema.ytbsHourlyProduction.isSent, false), lt(schema.ytbsHourlyProduction.retryCount, 5)),
                with: { ytbsPlant: true },
                limit: 200
            });

            if (pendingHourly.length > 0) {
                // Group by License Number
                const grouped = pendingHourly.reduce((acc: any, curr) => {
                    const ln = curr.ytbsPlant.licenseNo;
                    if (!acc[ln]) acc[ln] = [];
                    acc[ln].push(curr);
                    return acc;
                }, {});

                for (const licenseNo of Object.keys(grouped)) {
                    const records = grouped[licenseNo];
                    try {
                        console.log(`[YTBS] Sending batch of ${records.length} hourly production records for license: ${licenseNo}`);
                        await this.sendHourlyProductionBatch(licenseNo, records.map((r:any) => ({
                            date: r.readingDate,
                            hour: r.readingHour,
                            ytbsId: r.ytbsPlant.ytbsId,
                            value: r.valueMwh
                        })));
                        
                        const ids = records.map((r:any) => r.id);
                        await db.update(schema.ytbsHourlyProduction)
                            .set({ isSent: true, lastAttemptAt: new Date() })
                            .where(sql`${schema.ytbsHourlyProduction.id} IN ${ids}`);
                    } catch (err: any) {
                        console.error(`[YTBS] Failed to send Hourly Batch for ${licenseNo}:`, err.message);
                        // Increment retry count for all in this batch
                        const ids = records.map((r:any) => r.id);
                        await db.update(schema.ytbsHourlyProduction)
                            .set({ retryCount: sql`${schema.ytbsHourlyProduction.retryCount} + 1`, lastAttemptAt: new Date() })
                            .where(sql`${schema.ytbsHourlyProduction.id} IN ${ids}`);
                    }
                }
            }

            // 2. Process Instant (15-min) Productions
            const pendingInstant = await db.query.ytbsInstantProduction.findMany({
                where: and(eq(schema.ytbsInstantProduction.isSent, false), lt(schema.ytbsInstantProduction.retryCount, 5)),
                with: { ytbsPlant: true },
                limit: 200
            });

            if (pendingInstant.length > 0) {
                // Group by License Number
                const grouped = pendingInstant.reduce((acc: any, curr) => {
                    const ln = curr.ytbsPlant.licenseNo;
                    if (!acc[ln]) acc[ln] = [];
                    acc[ln].push(curr);
                    return acc;
                }, {});

                for (const licenseNo of Object.keys(grouped)) {
                    const records = grouped[licenseNo];
                    try {
                        console.log(`[YTBS] Sending batch of ${records.length} instant production records for license: ${licenseNo}`);
                        await this.sendInstantProductionBatch(licenseNo, records.map((r:any) => ({
                            date: r.readingDate,
                            hour: r.readingTime,
                            ytbsId: r.ytbsPlant.ytbsId,
                            value: r.valueMw
                        })));

                        const ids = records.map((r:any) => r.id);
                        await db.update(schema.ytbsInstantProduction)
                            .set({ isSent: true, lastAttemptAt: new Date() })
                            .where(sql`${schema.ytbsInstantProduction.id} IN ${ids}`);
                    } catch (err: any) {
                        console.error(`[YTBS] Failed to send Instant Batch for ${licenseNo}:`, err.message);
                        const ids = records.map((r:any) => r.id);
                        await db.update(schema.ytbsInstantProduction)
                            .set({ retryCount: sql`${schema.ytbsInstantProduction.retryCount} + 1`, lastAttemptAt: new Date() })
                            .where(sql`${schema.ytbsInstantProduction.id} IN ${ids}`);
                    }
                }
            }
        } catch (error) {
            console.error('[YTBS] Critical error in background sync process:', error);
        }
    }
}

export default YtbsService.getInstance();
