import { eq, and, lt, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const YTBS_BASE_URL = 'https://ytbsws.teias.gov.tr/ytbs-webservis/rest';
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
    private companyTokens: Map<string, { token: string, expiry: number }> = new Map();

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

        console.log('[YTBS] Token expired or not found. Authenticating...');
        const response = await this.login();
        if (response.success && response.token) {
            this.currentToken = response.token;
            this.tokenExpiry = Date.now() + 60 * 60 * 1000;
            return this.currentToken;
        }

        throw new Error(`[YTBS] Authentication failed: ${response.message}`);
    }

    private async postRequest(endpoint: string, body: any, companyId?: string, requiresAuth: boolean = true) {
        let serviceKey = YTBS_SERVICE_KEY;
        let authToken = this.currentToken;

        // If companyId is provided, we should ideally use that company's specific credentials
        // But for common/global requests, we use the default service key.
        if (companyId) {
            const company = await db.query.companyProfile.findFirst({
                where: eq(schema.companyProfile.id, companyId)
            });
            if (company?.ytbsApiKey) {
                serviceKey = company.ytbsApiKey;
            }
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'SERVICE_KEY': serviceKey
        };

        if (requiresAuth) {
            const token = companyId ? (await this.loginWithCompany(companyId)).token : await this.getAuthToken();
            if (token) headers['AUTH_TOKEN'] = token;
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
            const errorText = await response.text();
            throw new Error(`YTBS API Error (HTTP ${response.status}): ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Auth: Login via Global Credentials (from .env)
     */
    public async login(): Promise<YtbsTokenResponse> {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'SERVICE_KEY': YTBS_SERVICE_KEY
            };
            const body = {
                kullaniciAdi: process.env.YTBS_USERNAME,
                sifre: process.env.YTBS_PASSWORD
            };

            const response = await fetch(`${YTBS_BASE_URL}/yetkilendirme/login`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`Login failed: ${response.status}`);
            const data = await response.json();
            
            return {
                success: true,
                token: data?.veri?.jeton || data?.jeton
            };
        } catch (error: any) {
            console.error('[YTBS] Login error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Auth: Login via Company Specific Credentials
     */
    public async loginWithCompany(companyId: string): Promise<YtbsTokenResponse> {
        try {
            // Check cache first
            const cached = this.companyTokens.get(companyId);
            if (cached && Date.now() < cached.expiry - 5 * 60 * 1000) {
                return { success: true, token: cached.token };
            }

            const company = await db.query.companyProfile.findFirst({
                where: eq(schema.companyProfile.id, companyId)
            });

            if (!company) {
                throw new Error('Firma bulunamadı.');
            }

            const kullaniciAdi = company.ytbsUsername;
            const sifre = company.ytbsPassword;

            if (!kullaniciAdi || !sifre || !company.ytbsApiKey) {
                throw new Error(`Firma (${company.name}) YTBS bilgileri eksik.`);
            }

            const response = await fetch(`${YTBS_BASE_URL}/yetkilendirme/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SERVICE_KEY': company.ytbsApiKey
                },
                body: JSON.stringify({
                    kullaniciAdi,
                    sifre
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(`401 Yetkisiz Erişim: Firmanın YTBS kullanıcı adı, şifre veya SERVICE_KEY bilgisi hatalı. (Firma: ${company.name})`);
                }
                throw new Error(`Login failed: ${response.status}`);
            }
            
            const data = await response.json();
            const token = data?.veri?.jeton || data?.jeton;

            if (token) {
                // Cache for 1 hour
                this.companyTokens.set(companyId, {
                    token,
                    expiry: Date.now() + 60 * 60 * 1000
                });
            }

            return {
                success: true,
                token
            };
        } catch (error: any) {
            console.error('[YTBS] Company Login error:', error);
            return { success: false, message: error.message };
        }
    }

    /** 
     * --- MODELLEME (MODELING) ---
     */

    // Lisanssız Santral
    public async listLisanssizSantral(companyId?: string, date: string = new Date().toISOString().split('T')[0]) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantral/listele', { tarih: date }, companyId);
    }

    public async addLisanssizSantral(companyId: string, data: any) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantral/ekle', data, companyId);
    }

    public async updateLisanssizSantral(companyId: string, data: any) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantral/guncelle', data, companyId);
    }

    public async deleteLisanssizSantral(companyId: string, id: number) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantral/sil', { id }, companyId);
    }

    // Trafo Merkezi
    public async listTrafoMerkezleri(companyId?: string, date: string = new Date().toISOString().split('T')[0]) {
        return await this.postRequest('/modelleme/salt/trafomerkezi/listele', { tarih: date }, companyId);
    }

    // Dağıtım Hattı
    public async listDagitimHatti(companyId?: string, date: string = new Date().toISOString().split('T')[0], fider: boolean = true) {
        return await this.postRequest('/modelleme/iletim/dagitimhatti/listele', { tarih: date, fider }, companyId);
    }

    // Lisanssız Santral Tarihçe
    public async listSantralTarihce(companyId?: string, date: string = new Date().toISOString().split('T')[0]) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantraltarihce/listele', { tarih: date }, companyId);
    }

    // Çağrı Mektubu
    public async listCagriMektubu(companyId?: string, date: string = new Date().toISOString().split('T')[0]) {
        return await this.postRequest('/modelleme/uretim/lisanssizsantralcagrimektubu/listele', { tarih: date }, companyId);
    }

    /** 
     * --- VERİ TOPLAMA (DATA COLLECTION) ---
     */

    // Anlık Arz (Instant Production) - 100% Postman Uyumu
    public async sendInstantProductionBatch(companyId: string, licenseNo: string, records: any[]) {
        const payload = {
            baglantiAnlasmasiSirketiLisansNo: licenseNo,
            veri: records.map(r => ({
                tarih: r.date,
                saat: r.hour,
                lisanssizSantralId: r.ytbsId,
                veriDeger: r.value
            }))
        };
        return await this.postRequest('/veritoplama/anliklisanssizsantralarz/ekle', payload, companyId);
    }

    public async queryInstantProduction(companyId: string, licenseNo: string, date: string, hour: string, plantId: number) {
        return await this.postRequest('/veritoplama/anliklisanssizsantralarz/sorgula', {
            baglantiAnlasmasiSirketiLisansNo: licenseNo,
            tarih: date,
            saat: hour,
            lisanssizSantralId: plantId
        }, companyId);
    }

    // Saatlik Üretim (Hourly Production) - 100% Postman Uyumu
    public async sendHourlyProductionBatch(companyId: string, licenseNo: string, records: any[]) {
        const payload = {
            baglantiAnlasmasiSirketiLisansNo: licenseNo,
            veri: records.map(r => ({
                tarih: r.date,
                saat: r.hour,
                lisanssizSantralId: r.ytbsId,
                veriDeger: r.value
            }))
        };
        return await this.postRequest('/veritoplama/saatliklisanssizsantraluretim/ekle', payload, companyId);
    }

    public async queryHourlyProduction(companyId: string, licenseNo: string, date: string, hour: string, plantId: number) {
        return await this.postRequest('/veritoplama/saatliklisanssizsantraluretim/sorgula', {
            baglantiAnlasmasiSirketiLisansNo: licenseNo,
            tarih: date,
            saat: hour,
            lisanssizSantralId: plantId
        }, companyId);
    }

    /** 
     * --- DOSYA SERVİSLERİ (FILE SERVICES) ---
     */

    public async uploadFile(companyId: string, tur: number, fileName: string, objectId: number, base64Content: string, mimeType: string = 'application/pdf') {
        const payload = {
            tur,
            icerikTuru: mimeType,
            dosyaAdi: fileName,
            nesneId: objectId,
            icerik: base64Content
        };
        return await this.postRequest('/yardim/dokumantasyon/dosya/ekle', payload, companyId);
    }

    public async deleteFile(companyId: string, fileId: number) {
        return await this.postRequest('/yardim/dokumantasyon/dosya/sil', { id: fileId }, companyId);
    }

    public async queryFile(companyId: string, fileId: number) {
        return await this.postRequest('/yardim/dokumantasyon/dosya/sorgula', { id: fileId }, companyId);
    }

    /**
     * --- BACKGROUND SYNC LOGIC ---
     */

    public startCronJob() {
        // Hourly Sync every 4 hours
        setInterval(async () => {
            console.log('[YTBS] Starting 4-hour Hourly Sync Job...');
            await this.processPendingHourlyRecords();
        }, 4 * 60 * 60 * 1000);

        // Instant Sync every 15 minutes
        setInterval(async () => {
            console.log('[YTBS] Starting 15-min Instant Sync Job...');
            await this.processPendingInstantRecords();
        }, 15 * 60 * 1000);

        console.log('[YTBS] Advanced Sync Jobs Initialized (Hourly: 4h, Instant: 15m).');
    }

    public async triggerSync() {
        console.log('[YTBS] Manual sync triggered.');
        await this.processPendingHourlyRecords();
        await this.processPendingInstantRecords();
    }

    /**
     * Adım 4.1: Saatlik Lisanssız Santral Üretim (Toplu Gönderim)
     */
    private async processPendingHourlyRecords() {
        try {
            const pending = await db.query.ytbsHourlyProduction.findMany({
                where: and(eq(schema.ytbsHourlyProduction.isSent, false), lt(schema.ytbsHourlyProduction.retryCount, 10)),
                with: { 
                    ytbsPlant: { with: { plant: { with: { company: true } } } } 
                },
                limit: 1000
            });

            if (pending.length === 0) return;

            // Group by Company and License
            const groups = new Map<string, { company: any, licenseNo: string, records: any[] }>();
            
            for (const r of pending) {
                const company = r.ytbsPlant.plant.company;
                const license = r.ytbsPlant.licenseNo;
                const groupKey = `${company.id}:${license}`;
                
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, { company, licenseNo: license, records: [] });
                }
                groups.get(groupKey)!.records.push(r);
            }

            for (const group of groups.values()) {
                console.log(`[YTBS] Sending batch of ${group.records.length} hourly records for license ${group.licenseNo}`);
                
                try {
                    const res = await this.sendHourlyProductionBatch(
                        group.company.id, 
                        group.licenseNo, 
                        group.records.map(r => ({
                            date: r.readingDate,
                            hour: r.readingHour,
                            ytbsId: r.ytbsPlant.ytbsId,
                            value: r.valueMwh
                        }))
                    );

                    if (res && res.success) {
                        const ids = group.records.map(r => r.id);
                        await db.update(schema.ytbsHourlyProduction)
                            .set({ isSent: true, lastAttemptAt: new Date() })
                            .where(inArray(schema.ytbsHourlyProduction.id, ids));
                        console.log(`[YTBS] Successfully sent ${ids.length} hourly records.`);
                    } else {
                        throw new Error(res?.message || 'YTBS response not successful');
                    }
                } catch (err: any) {
                    console.error(`[YTBS] Hourly batch failed for ${group.licenseNo}:`, err.message);
                    const ids = group.records.map(r => r.id);
                    await db.update(schema.ytbsHourlyProduction)
                        .set({ retryCount: sql`${schema.ytbsHourlyProduction.retryCount} + 1`, lastAttemptAt: new Date() })
                        .where(inArray(schema.ytbsHourlyProduction.id, ids));
                }
            }
        } catch (error) {
            console.error('[YTBS] Hourly background sync error:', error);
        }
    }

    /**
     * Adım 4.2: Anlık Lisanssız Santral Arz (Toplu Gönderim)
     */
    private async processPendingInstantRecords() {
        try {
            const pending = await db.query.ytbsInstantProduction.findMany({
                where: and(eq(schema.ytbsInstantProduction.isSent, false), lt(schema.ytbsInstantProduction.retryCount, 10)),
                with: { 
                    ytbsPlant: { with: { plant: { with: { company: true } } } } 
                },
                limit: 1000
            });

            if (pending.length === 0) return;

            // Group by Company and License
            const groups = new Map<string, { company: any, licenseNo: string, records: any[] }>();
            
            for (const r of pending) {
                const company = r.ytbsPlant.plant.company;
                const license = r.ytbsPlant.licenseNo;
                const groupKey = `${company.id}:${license}`;
                
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, { company, licenseNo: license, records: [] });
                }
                groups.get(groupKey)!.records.push(r);
            }

            for (const group of groups.values()) {
                console.log(`[YTBS] Sending batch of ${group.records.length} instant records for license ${group.licenseNo}`);
                
                try {
                    const res = await this.sendInstantProductionBatch(
                        group.company.id, 
                        group.licenseNo, 
                        group.records.map(r => ({
                            date: r.readingDate,
                            hour: r.readingTime,
                            ytbsId: r.ytbsPlant.ytbsId,
                            value: r.valueMw
                        }))
                    );

                    if (res && res.success) {
                        const ids = group.records.map(r => r.id);
                        await db.update(schema.ytbsInstantProduction)
                            .set({ isSent: true, lastAttemptAt: new Date() })
                            .where(inArray(schema.ytbsInstantProduction.id, ids));
                        console.log(`[YTBS] Successfully sent ${ids.length} instant records.`);
                    } else {
                        throw new Error(res?.message || 'YTBS response not successful');
                    }
                } catch (err: any) {
                    console.error(`[YTBS] Instant batch failed for ${group.licenseNo}:`, err.message);
                    const ids = group.records.map(r => r.id);
                    await db.update(schema.ytbsInstantProduction)
                        .set({ retryCount: sql`${schema.ytbsInstantProduction.retryCount} + 1`, lastAttemptAt: new Date() })
                        .where(inArray(schema.ytbsInstantProduction.id, ids));
                }
            }
        } catch (error) {
            console.error('[YTBS] Instant background sync error:', error);
        }
    }
}

export default YtbsService.getInstance();
