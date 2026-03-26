import { eq, and, lt } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const YTBS_BASE_URL = 'https://ytbsws.teias.gov.tr/ytbs-webservis/rest';
const YTBS_USERNAME = process.env.YTBS_USERNAME || '';
const YTBS_PASSWORD = process.env.YTBS_PASSWORD || '';
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

    /**
     * Get a valid auth token. If expired or near expiry, requests a new one.
     */
    private async getAuthToken(): Promise<string> {
        // If token is valid for the next 5 minutes, use it
        if (this.currentToken && Date.now() < this.tokenExpiry - 5 * 60 * 1000) {
            return this.currentToken;
        }

        console.log('[YTBS] Token expired or not found. Logging in...');
        const response = await this.login();
        if (response.success && response.token) {
            this.currentToken = response.token;
            // Token is valid for 1 hour. We set expiry to 60 minutes from now.
            this.tokenExpiry = Date.now() + 60 * 60 * 1000;
            return this.currentToken;
        }

        throw new Error(`[YTBS] Failed to authenticate: ${response.message}`);
    }

    /**
     * Generic wrapper for YTBS POST requests.
     */
    private async postRequest(endpoint: string, body: any, requiresAuth: boolean = true) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Service-Key': YTBS_SERVICE_KEY
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

        // 401 signifies token expiry, theoretically handled by our cache, but just in case
        if (response.status === 401) {
            console.warn(`[YTBS] Received 401 Unauthorized for ${endpoint}. Clearing token cache.`);
            this.currentToken = null;
            this.tokenExpiry = 0;
            throw new Error('401_UNAUTHORIZED'); // Caller can retry once
        }

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${await response.text()}`);
        }

        return await response.json();
    }

    /**
     * Auth: Login
     * Endpoint: /yetkilendirme/login
     */
    public async login(): Promise<YtbsTokenResponse> {
        try {
            const data = await this.postRequest('/yetkilendirme/login', {
                kullaniciAdi: YTBS_USERNAME,
                sifre: YTBS_PASSWORD
            }, false);
            
            // Note: Update parsing logic according to actual TEİAŞ response schema if different
            return {
                success: true,
                token: data.token || data.jwt || data.accessToken
            };
        } catch (error: any) {
            console.error('[YTBS] Login error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Auth: Logout
     * Endpoint: /yetkilendirme/logout
     */
    public async logout(): Promise<boolean> {
        try {
            await this.postRequest('/yetkilendirme/logout', {});
            this.currentToken = null;
            this.tokenExpiry = 0;
            return true;
        } catch (error) {
            console.error('[YTBS] Logout error:', error);
            return false;
        }
    }

    /**
     * Send 15-Min Instant Production Data (Anlık Arz)
     * Endpoint: /veritoplama/anliklisanssizsantralarz/ekle
     */
    public async sendInstantProduction(payload: any) {
        return await this.postRequest('/veritoplama/anliklisanssizsantralarz/ekle', payload);
    }

    /**
     * Send Hourly Production Data (Saatlik Üretim)
     * Endpoint: /veritoplama/saatliklisanssizsantraluretim/ekle
     */
    public async sendHourlyProduction(payload: any) {
        return await this.postRequest('/veritoplama/saatliklisanssizsantraluretim/ekle', payload);
    }

    /**
     * Start Cron Job manually (Should be executed on app startup)
     */
    public startCronJob() {
        // Run every minute to check if there are pending un-sent records
        setInterval(async () => {
            await this.processPendingRecords();
        }, 60 * 1000);
        console.log('[YTBS] Sync Cron Job Started.');
    }

    /**
     * Finds unsent records in YtbsHourlyProduction and YtbsInstantProduction
     * and attempts to send them to TEİAŞ. 
     */
    private async processPendingRecords() {
        try {
            // Process Hourly Productions
            const pendingHourly = await db.query.ytbsHourlyProduction.findMany({
                where: and(eq(schema.ytbsHourlyProduction.isSent, false), lt(schema.ytbsHourlyProduction.retryCount, 10)),
                with: { ytbsPlant: true },
                limit: 50
            });

            for (const record of pendingHourly) {
                try {
                    await this.sendHourlyProduction({
                        lisanssizSantralId: record.ytbsPlant.ytbsId,
                        tarih: record.readingDate, // Expected format by TEİAŞ
                        saat: record.readingHour,
                        veriDeger: record.valueMwh
                    });
                    
                    // Mark as sent
                    await db.update(schema.ytbsHourlyProduction)
                        .set({ isSent: true, lastAttemptAt: new Date() })
                        .where(eq(schema.ytbsHourlyProduction.id, record.id));
                } catch (error: any) {
                    // If error is 401, clear token and retry on next cron tick
                    if (error.message.includes('401_UNAUTHORIZED')) return;

                    await db.update(schema.ytbsHourlyProduction)
                        .set({ 
                            retryCount: record.retryCount + 1, 
                            lastAttemptAt: new Date() 
                        })
                        .where(eq(schema.ytbsHourlyProduction.id, record.id));
                    console.error(`[YTBS] Failed to send Hourly Record ${record.id}:`, error.message);
                }
            }

            // Process Instant (15-min) Productions
            const pendingInstant = await db.query.ytbsInstantProduction.findMany({
                where: and(eq(schema.ytbsInstantProduction.isSent, false), lt(schema.ytbsInstantProduction.retryCount, 10)),
                with: { ytbsPlant: true },
                limit: 50
            });

            for (const record of pendingInstant) {
                try {
                    await this.sendInstantProduction({
                        lisanssizSantralId: record.ytbsPlant.ytbsId,
                        tarih: record.readingDate, 
                        saat: record.readingTime,
                        veriDeger: record.valueMw
                    });
                    
                    // Mark as sent
                    await db.update(schema.ytbsInstantProduction)
                        .set({ isSent: true, lastAttemptAt: new Date() })
                        .where(eq(schema.ytbsInstantProduction.id, record.id));
                } catch (error: any) {
                    if (error.message.includes('401_UNAUTHORIZED')) return;

                    await db.update(schema.ytbsInstantProduction)
                        .set({ 
                            retryCount: record.retryCount + 1, 
                            lastAttemptAt: new Date() 
                        })
                        .where(eq(schema.ytbsInstantProduction.id, record.id));
                    console.error(`[YTBS] Failed to send Instant Record ${record.id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[YTBS] Error processing pending records:', error);
        }
    }
}

export default YtbsService.getInstance();
