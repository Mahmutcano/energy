package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"time"
	"ytbs-platform/internal/config"
)

type Mailer struct {
	cfg *config.Config
}

func NewMailer(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

type AlertDetails struct {
	CompanyName      string
	PlantName        string
	YTBSPlantID      int
	LicenseNo        string
	TransmissionType string
	ReadingDate      string
	ReadingTime      string
	Value            float64
	Unit             string
	ErrorMessage     string
	HTTPStatusCode   int
	RetryCount       int
}

// SendTransmissionFailureAlert sends an immediate HTML notification to ozgancan9@gmail.com.
func (m *Mailer) SendTransmissionFailureAlert(details AlertDetails) error {
	to := m.cfg.AlertEmail
	if to == "" {
		to = "ozgancan9@gmail.com"
	}

	subject := fmt.Sprintf("[ALERT] YTBS Gönderim Hatası - %s (%s)", details.PlantName, details.CompanyName)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
  .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .header { background: #dc2626; color: #ffffff; padding: 20px; font-size: 18px; font-weight: bold; }
  .content { padding: 24px; }
  .info-table { width: 100%%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
  .info-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .info-table td.label { font-weight: bold; color: #4b5563; width: 35%%; }
  .error-box { background: #fef2f2; border: 1px solid #f87171; color: #991b1b; padding: 14px; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
  .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      ⚠️ YTBS Veri Gönderim Hatası Bildirimi
    </div>
    <div class="content">
      <p>Aşağıdaki enerji santraline ait telemetri verisi TEİAŞ YTBS Web Servisi'ne aktarılamadı ve hata aldı:</p>
      
      <table class="info-table">
        <tr>
          <td class="label">Firma:</td>
          <td><strong>%s</strong></td>
        </tr>
        <tr>
          <td class="label">Santral Adı:</td>
          <td>%s (ID: %d)</td>
        </tr>
        <tr>
          <td class="label">Lisans No:</td>
          <td>%s</td>
        </tr>
        <tr>
          <td class="label">Gönderim Türü:</td>
          <td>%s</td>
        </tr>
        <tr>
          <td class="label">Okuma Zamanı:</td>
          <td>%s %s</td>
        </tr>
        <tr>
          <td class="label">Gönderilmek İstenen Değer:</td>
          <td>%.4f %s</td>
        </tr>
        <tr>
          <td class="label">HTTP Durum Kodu:</td>
          <td>%d</td>
        </tr>
        <tr>
          <td class="label">Deneme Sayısı:</td>
          <td>%d. Deneme</td>
        </tr>
      </table>

      <div class="error-box">
<strong>HATA DETAYI:</strong><br>
%s
      </div>
      
      <p style="margin-top: 20px; font-size: 13px; color: #4b5563;">
        Lütfen sisteme giriş yaparak gönderim raporu ekranından ilgili kaydı manuel güncelleyiniz veya TEİAŞ servis bağlantısını kontrol ediniz.
      </p>
    </div>
    <div class="footer">
      YTBS Energy SCADA Platform Automation &bull; %s
    </div>
  </div>
</body>
</html>
`,
		details.CompanyName,
		details.PlantName, details.YTBSPlantID,
		details.LicenseNo,
		details.TransmissionType,
		details.ReadingDate, details.ReadingTime,
		details.Value, details.Unit,
		details.HTTPStatusCode,
		details.RetryCount,
		details.ErrorMessage,
		time.Now().Format("02.01.2006 15:04:05"),
	)

	// If SMTP is not configured, log to console and return nil
	if m.cfg.SMTPUsername == "" || m.cfg.SMTPHost == "" {
		log.Printf("[MAILER-ALERT] [SIMULATION] SMTP bilgileri (.env) henüz tanımlanmadığı için mail konsola yazıldı:")
		log.Printf("[MAILER-ALERT] Kime: %s | Konu: %s", to, subject)
		log.Printf("[MAILER-ALERT] Hata: %s", details.ErrorMessage)
		return nil
	}

	headers := make(map[string]string)
	headers["From"] = m.cfg.SMTPFrom
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", m.cfg.SMTPHost, m.cfg.SMTPPort)

	// Support STARTTLS (standard port 587) or SMTPS (465)
	if m.cfg.SMTPPort == 465 {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         m.cfg.SMTPHost,
		}
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			log.Printf("[MAILER-ERROR] TLS Dial failed: %v", err)
			return err
		}
		c, err := smtp.NewClient(conn, m.cfg.SMTPHost)
		if err != nil {
			return err
		}
		defer c.Close()
		if err = c.Auth(auth); err != nil {
			return err
		}
		if err = c.Mail(m.cfg.SMTPFrom); err != nil {
			return err
		}
		if err = c.Rcpt(to); err != nil {
			return err
		}
		w, err := c.Data()
		if err != nil {
			return err
		}
		_, err = w.Write([]byte(message))
		if err != nil {
			return err
		}
		_ = w.Close()
		return c.Quit()
	}

	err := smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, []byte(message))
	if err != nil {
		log.Printf("[MAILER-ERROR] Failed to send email to %s: %v", to, err)
		return err
	}

	log.Printf("[MAILER-SUCCESS] Alert email successfully sent to %s", to)
	return nil
}
