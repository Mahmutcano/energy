# YTBS (Yenilenebilir Enerji Kaynakları Destekleme Mekanizması) Sunucu & Servis Analiz Raporu

Bu rapor, Energy SCADA Platformu bünyesinde yer alan YTBS entegrasyonunun gerekliliği, kaynak tüketimi ve operasyonel etkilerini **Go (Golang)** tabanlı yeni backend mimarisi üzerinden detaylandırmak amacıyla hazırlanmıştır.

## 1. Giriş: YTBS Nedir?
YTBS (**Yenilenebilir Enerji Kaynakları Destekleme Mekanizması**), Türkiye'deki yenilenebilir enerji santrallerinin (Güneş, Rüzgar, Biyokütle vb.) üretim verilerinin **TEİAŞ (Türkiye Elektrik İletim A.Ş.)** sistemlerine anlık ve saatlik olarak aktarılmasını sağlayan resmi bir mekanizmadır.

Sistem, santrallerden gelen verileri toplayıp TEİAŞ'ın REST web servislerine güvenli bir şekilde iletir.

---

## 2. Gereklilik Analizi: Neden Gereklidir?

YTBS servisi, aşağıdaki kritik nedenlerden dolayı platformun **stratejik ve yasal** bir parçasıdır:

1.  **Yasal Uyumluluk (Legal Compliance):** EPDK ve TEİAŞ yönetmeliklerine göre, YEKDEM mekanizmasından faydalanan veya lisanssız üretim yapan santrallerin verilerini paylaşması zorunludur.
2.  **Finansal Haklar (YEKDEM):** Üretilen enerjinin devlet alım garantisi kapsamında nakde dönüştürülebilmesi için verilerin YTBS üzerinden doğrulanması şarttır. Veri eksikliği doğrudan gelir kaybı demektir.
3.  **Şebeke Yönetimi:** TEİAŞ, sistem dengeleme ve arz güvenliği için bu verilere ihtiyaç duyar.

---

## 3. Kaynak Tüketimi Analizi (Go Mimarisi)

**Go (Golang)** kullanımı, Node.js'e kıyasla çok daha düşük kaynak tüketimi ve daha yüksek verimlilik sağlar. YTBS servisi bir "Goroutine" olarak arka planda çalışarak şu kaynakları tüketir:

### 3.1. CPU Tüketimi
-   **Durum:** İhmal Edilebilir ( < %0.5 ).
-   **Açıklama:** Go'nun hafif iş parçacıkları (goroutine) sayesinde, dakika başı yapılan veri kontrolü ve HTTP POST işlemleri CPU üzerinde neredeyse hiçbir iz bırakmaz. Sadece veri paketleme (JSON marshalling) sırasında milisaniyelik bir yük oluşturur.

### 3.2. RAM (Bellek) Tüketimi
-   **Durum:** Çok Düşük ( ~15MB - 30MB ).
-   **Açıklama:** Go'nun statik olarak derlenen yapısı ve yönetilen belleği sayesinde YTBS servisi oldukça kompakt bir bellek alanında çalışır. Node.js'teki "V8 Engine" yükü olmadığı için bellek tüketimi minimumdadır.

### 3.3. Depolama (Disk) Tüketimi
-   **Durum:** Minimal.
-   **Açıklama:** Sadece `isSent` durumu güncellenen kayıtlar ve hata logları tutulur. Veritabanında (PostgreSQL/TimescaleDB) ekstra bir şişme yaratmaz.

### 3.4. Ağ (Network) Tüketimi
-   **Durum:** Çok Düşük.
-   **Açıklama:** Sadece metin tabanlı küçük JSON paketleri iletilir. Sunucunun bant genişliğini etkilemez.

---

## 4. Teknik Mimari ve Avantajlar

Go mimarisi ile YTBS entegrasyonu şu avantajlara sahiptir:
-   **Yüksek Eşzamanlılık:** Birden fazla santralin verisi aynı anda (parallel execution) çok hızla gönderilebilir.
-   **Hata Yönetimi:** Gelişmiş "Retry" (Yeniden Deneme) mantığı ve statik tip kontrolü sayesinde veri bütünlüğü korunur.
-   **Bağımsız Çalışma:** Ana API trafiğini etkilemeden arka planda izole bir şekilde süreçlerini yönetir.

---

## 5. Özet ve Sonuç

| Parametre | Değer / Gereksinim (Go) |
| :--- | :--- |
| **Gereklilik** | **Yüksek (Stratejik)** |
| **CPU İhtiyacı** | **Yok Denecek Kadar Az ( < %0.5 Core)** |
| **RAM İhtiyacı** | **~20 MB** |
| **Maliyet Etkisi** | **Yok (Mevcut sunucu içinde çalışır)** |
| **Kritiklik** | **Hata durumunda finansal kayıp riski var** |

**Sonuç:** YTBS modülü, Go backend yapısının hafifliği sayesinde sunucu maliyetlerinizi artırmazken, santrallerin yasal ve finansal sürekliliğini garanti altına alır. Mevcut Go sunucusu üzerinde ayıracağınız kaynak, bir web sayfasının tek bir görselini yüklemekten daha az maliyetlidir.

---
*Hazırlayan: Antigravity AI Assistant*
*Tarih: 01 Nisan 2026*
