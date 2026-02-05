# Endüstriyel Enerji İzleme ve SCADA Platformu - Proje Dökümantasyonu

Bu döküman, geliştirilen SCADA (Veri Tabanlı Kontrol ve Gözetleme) platformunun yeteneklerini, teknik altyapısını, maliyet analizini ve gelecek vizyonunu içermektedir.

---

## 1. Yalnızca Bir Yazılım Değil, Tesisin Dijital Nabzı
Bu platform, enerji üretim ve tüketim noktalarındaki karmaşık cihaz dillerini (Protokolleri) anlaşılır verilere dönüştürür. Teknik olmayan bir dille; tesisinizdeki her bir cihazın "kalp atışını" saniyelik olarak takip eden, hafızasına kaydeden ve bir düzensizlik olduğunda sizi uyaran dijital bir yönetim merkezidir.

---

## 2. Temel Sistem Özellikleri
Platform, modern endüstrinin ihtiyaç duyduğu en kritik özellikleri bünyesinde barındırır:

*   **Çoklu Protokol Desteği:** 
    *   **IEC 60870-5-104:** Uzak RTU ve trafo merkezleri için standart haberleşme.
    *   **Modbus TCP:** Sayaçlar, analizörler ve PLC'ler için yaygın endüstriyel haberleşme.
*   **Gerçek Zamanlı (Canlı) Dashboard:** Socket.io teknolojisi ile veriler sayfayı yenilemeden milisaniyelik hızla ekrana akar.
*   **Mesaj Aracı (Message Broker - Redis):** Verilerin kaybolmasını önleyen, 'Collector' (Toplayıcı) ve 'Worker' (İşleyici) katmanlarını birbirinden ayıran tampon bölge.
*   **Zaman Serisi Veri Arşivi:** InfluxDB entegrasyonu sayesinde saniyelik veriler yıllarca saklanabilir ve geçmişe dönük analiz yapılabilir.
*   **Akıllı Alarm Motoru:** Kritik eşik değerleri aşıldığında görsel ve sistemsel uyarılar üretilir.
*   **Cihaz Simülasyonu:** Gerçek donanım olmadığında bile sistemin çalışmasını test eden "Dijital İkiz" simülatörleri.

---

## 3. Teknik Mimari (Yazılım Mimarisi)
Sistem, hız ve ölçeklenebilirlik odaklı modern bir teknoloji yığını üzerine kurulmuştur:

*   **Frontend (Arayüz):** Next.js & React (Hızlı, SEO dostu ve mobil uyumlu).
*   **Backend (Sunucu):** Node.js & TypeScript (Yüksek performanslı ve asenkron veri işleme).
*   **Veritabanları:**
    *   **PostgreSQL:** Kullanıcı yönetimi, cihaz tanımları ve alarm kayıtları.
    *   **InfluxDB:** Milyarlarca satırlık telemetri (voltaj, akım vb.) verisi.
*   **Haberleşme Katmanı:** `jsmodbus` ve özelleştirilmiş `iec104-protocol` kütüphaneleri.

---

## 4. Profesyonel Maliyet Analizi (Aylık Tahmini)

Sistemin kurulum kapasitesine göre maliyetler 3 ana faza ayrılmıştır:

| Maliyet Kalemi | Faz 1: Launch (1-5 Cihaz) | Faz 2: Growth (5-50 Cihaz) | Faz 3: Enterprise (50+ Cihaz) |
| :--- | :--- | :--- | :--- |
| **Uygulama Sunucusu** | $24 | $60 | $120+ |
| **Zaman Serisi DB (Influx)** | $20 | $75 | $250+ |
| **İlişkisel DB (PostgreSQL)** | $15 | $30 | $60 |
| **Güvenlik & Firewall** | $0 | $20 | $100+ |
| **Bant Genişliği & Diğer** | Dahil | $40 | $130 |
| **Mesaj Aracı (Redis)** | $10 | $30 | $80 |
| **TOPLAM (Aylık)** | **~$69** | **~$255** | **~$740+** |

---

## 5. Uygulama ve Geliştirme Süreçleri
Projenin hayata geçirilme aşamaları şu şekildedir:

1.  **Analiz:** Cihazların IOA (Veri Adresi) ve IP bilgilerinin toplanması.
2.  **Haberleşme Katmanı:** Protokollerin (104 ve Modbus) sunucu tarafında yapılandırılması.
3.  **Veri Normalizasyonu:** Farklı cihazlardan gelen ham verilerin ortak bir dile çevrilmesi.
4.  **Arayüz Tasarımı:** Kullanıcı dostu, karanlık mod destekli dashboard tasarımı.
5.  **Otomasyon & Alarm:** Eşik değerlerin tanımlanması ve bildirim sisteminin kurulması.
6.  **Canlıya Alım (Deployment):** Bulut sunucuların (AWS/DigitalOcean) kurulumu ve güvenliğin sağlanması.

---

## 6. Gelecek Vizyonu ve Genişletilebilirlik
Platform, modüler yapısı sayesinde ileride şu özelliklere kolayca adapte edilebilir:
*   **Yapay Zeka Destekli Tahminleme:** Enerji tüketim trendlerine göre gelecek ayın faturasını tahmin etme.
*   **Mobil Uygulama:** iOS ve Android üzerinden push-bildirimli izleme.
*   **Raporlama Modülü:** Günlük, haftalık ve aylık otomatik PDF raporlama.

---
**Hazırlayan:** Antigravity AI SCADA Assistant
**Tarih:** 04.02.2026
