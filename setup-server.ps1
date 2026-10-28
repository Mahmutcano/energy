# ==============================================================================
# YTBS Enerji Platformu - Windows Server Otomatik Kurulum ve Dağıtım Scripti
# Sunucu: 85.111.7.170 (Administrator)
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "⚡ YTBS Energy SCADA Platform Kurulumu Başlatılıyor..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. OpenSSH Server Kurulumu ve Güvenlik Duvarı İzni
Write-Host "[1/5] OpenSSH Server kontrol ediliyor..." -ForegroundColor Yellow
try {
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 -ErrorAction SilentlyContinue
    Start-Service sshd -ErrorAction SilentlyContinue
    Set-Service -Name sshd -StartupType 'Automatic'
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -ErrorAction SilentlyContinue
    Write-Host "   -> SSH Servisi (Port 22) başarıyla aktif edildi." -ForegroundColor Green
} catch {
    Write-Host "   -> SSH kurulumu atlandı veya zaten mevcut: $_" -ForegroundColor DarkGray
}

# 2. Güvenlik Duvarı (Firewall) Port İzinleri
Write-Host "[2/5] Güvenlik Duvarı Portları Açılıyor (8080, 5432)..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "YTBS Web UI & API" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "YTBS PostgreSQL DB" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
Write-Host "   -> Port 8080 (Web UI) ve Port 5432 (DB) erişime açıldı." -ForegroundColor Green

# 3. Git ve Docker Kontrolü
Write-Host "[3/5] Git ve Docker kontrol ediliyor..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "   -> Git indiriliyor ve kuruluyor..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "   -> Git zaten kurulu." -ForegroundColor Green
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "   -> Docker Desktop kuruluyor (Bu işlem birkaç dakika sürebilir)..." -ForegroundColor Yellow
    winget install --id Docker.DockerDesktop -e --source winget --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "   -> Docker zaten kurulu." -ForegroundColor Green
}

# 4. Projeyi Klonla veya Güncelle
Write-Host "[4/5] GitHub Deposu Güncelleniyor (Mahmutcano/energy)..." -ForegroundColor Yellow
$deployPath = "C:\energy"

if (-not (Test-Path $deployPath)) {
    git clone https://github.com/Mahmutcano/energy.git $deployPath
} else {
    Set-Location $deployPath
    git fetch origin
    git reset --hard origin/main
}

# 5. Docker Compose ile Başlat
Write-Host "[5/5] Docker Konteynerleri Derleniyor ve Başlatılıyor..." -ForegroundColor Yellow
Set-Location $deployPath
docker compose down --remove-orphans 2>$null
docker compose up -d --build

Write-Host "======================================================" -ForegroundColor Green
Write-Host "✅ KURULUM BAŞARIYLA TAMAMLANDI!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "🌐 Web Arayüzü: http://85.111.7.170:8080" -ForegroundColor Cyan
Write-Host "👤 Varsayılan Yönetici: admin" -ForegroundColor Cyan
Write-Host "🔑 Şifre: Adminpass123!" -ForegroundColor Cyan
Write-Host "📧 Alert Mail Adresi: ozgancan9@gmail.com" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Green
