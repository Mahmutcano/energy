import ytbsService from '../services/ytbs.service';
import * as dotenv from 'dotenv';
import path from 'path';

// .env dosyasını manuel olarak yüklüyoruz
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runTest() {
    console.log('=================================================');
    console.log('🚀 [YTBS] TEİAŞ Bağlantı Testi Başlatılıyor...');
    console.log(`URL: https://ytbs.teias.gov.tr/api`);
    console.log(`Key: ${process.env.YTBS_SERVICE_KEY ? 'AYARLANDI' : 'EKSIK'}`);
    console.log(`Lisans: ${process.env.YTBS_LICENSE_NO || 'AYARLANMADI'}`);
    console.log('=================================================');

    // 1. LOGIN TESTİ
    console.log('\n[1/2] Yetkilendirme (Login) Test Ediliyor...');
    try {
        const auth = await ytbsService.login();
        if (auth.success) {
            console.log('✅ LOGIN BAŞARILI!');
            console.log(`Jeton (Token): ${auth.token?.substring(0, 50)}...`);
        } else {
            console.error('❌ LOGIN HATTASI:', auth.message);
            return;
        }
    } catch (err: any) {
        console.error('❌ KRITIK HATA (Login):', err.message);
        return;
    }

    // 2. MODELLING TESTİ
    console.log('\n[2/2] Trafo Merkezi Listeleme Sorgulanıyor...');
    try {
        const data = await ytbsService.listTrafoMerkezleri();
        if (data && Array.isArray(data)) {
            console.log(`✅ VERI GELDİ: ${data.length} adet trafo merkezi bulundu.`);
            if (data.length > 0) {
                console.log('Örnek İlk Kayıt:', JSON.stringify(data[0], null, 2));
            }
        } else {
             // Bazı API'ler boş obje dönebilir
            console.log('⚠️ API CEVAP VERDİ ANCAK BEKLENEN LİSTE FORMATINDA DEĞİL.');
            console.log('Ham Cevap:', JSON.stringify(data, null, 2));
        }
    } catch (err: any) {
        console.error('❌ KRITIK HATA (Modelleme):', err.message);
    }

    console.log('\n=================================================');
    console.log('🏁 Test Tamamlandı.');
    console.log('=================================================');
}

runTest().catch(console.error);
