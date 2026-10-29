# ==============================================================================
# YTBS SCADA Enerji Platformu - Windows Server Kurulum & Servis Scripti
# Hedef Sunucu: 85.111.7.170 (Administrator)
# ==============================================================================

# Administrator yetkisi kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Bu script 'Yönetici Olarak Çalıştır' (Run as Administrator) ile başlatılmalıdır!"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "⚡ YTBS Platformu Kurulumu ve Servis Yapılandırması Başlatılıyor..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$AppDir = "C:\ytbs-platform"
if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
}

# 1. OpenSSH Server Kurulumu (Gelecekte RDP'ye gerek kalmadan terminalden uzaktan deploy için)
Write-Host "`n[1/6] OpenSSH Server (Port 22) Yapılandırılıyor..." -ForegroundColor Yellow
try {
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 -ErrorAction SilentlyContinue
    Start-Service sshd -ErrorAction SilentlyContinue
    Set-Service -Name sshd -StartupType 'Automatic'
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -ErrorAction SilentlyContinue
    Write-Host "   -> SSH Servisi (Port 22) aktif edildi." -ForegroundColor Green
} catch {
    Write-Host "   -> SSH kurulumu atlandı veya zaten mevcut." -ForegroundColor DarkGray
}

# 2. Windows Güvenlik Duvarı İzinleri (Port 8080 Web UI, Port 5432 PostgreSQL)
Write-Host "`n[2/6] Güvenlik Duvarı Portları Açılıyor (8080, 5432, 22)..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "YTBS Web UI & API (8080)" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "YTBS PostgreSQL DB (5432)" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "   -> Port 8080 ve Port 5432 dış erişime açıldı." -ForegroundColor Green

# 3. PostgreSQL Kontrolü ve Kurulumu
Write-Host "`n[3/6] PostgreSQL Veritabanı Kontrol Ediliyor..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if (-not $pgService) {
    Write-Host "   -> PostgreSQL winget ile kuruluyor..." -ForegroundColor Yellow
    winget install --id PostgreSQL.PostgreSQL -e --source winget --accept-source-agreements --accept-package-agreements --silent
    Start-Sleep -Seconds 5
} else {
    Write-Host "   -> PostgreSQL servisi tespit edildi: $($pgService.Name)" -ForegroundColor Green
}

# 4. Projeyi GitHub'dan İndir / Klonla
Write-Host "`n[4/6] En Son Binary ve Dosyalar Çekiliyor..." -ForegroundColor Yellow
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

$repoDir = "C:\energy"
if (-not (Test-Path "$repoDir\.git")) {
    git clone https://github.com/Mahmutcano/energy.git $repoDir
} else {
    Push-Location $repoDir
    git fetch origin
    git reset --hard origin/main
    Pop-Location
}

# Binary'yi C:\ytbs-platform dizinine kopyala
Copy-Item "$repoDir\ytbs-server.exe" "$AppDir\ytbs-server.exe" -Force
Write-Host "   -> ytbs-server.exe başarıyla güncellendi ($AppDir\ytbs-server.exe)." -ForegroundColor Green

# 5. .env Dosyasını Oluştur
$envContent = @"
PORT=8080
DATABASE_URL=postgres://postgres:Adminpass123!@localhost:5432/ytbs_db?sslmode=disable
SESSION_SECRET=ytbs-production-session-secret-2026-key!
ALERT_EMAIL=ozgancan9@gmail.com
WORKER_ENABLED=true
"@
Set-Content -Path "$AppDir\.env" -Value $envContent -Force

# 6. Windows Servisi Oluştur (NSSM veya New-Service)
Write-Host "`n[5/6] Windows Arka Plan Servisi Yapılandırılıyor..." -ForegroundColor Yellow

$serviceName = "YTBSEnergyService"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "   -> Mevcut servis durduruluyor..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# NSSM indir (eğer yoksa) - Windows Service wrapper
$nssmPath = "$AppDir\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "   -> NSSM indiriliyor..." -ForegroundColor DarkGray
    Invoke-WebRequest -Uri "https://github.com/kirillkovalenko/nssm/raw/master/nssm-2.24/win64/nssm.exe" -OutFile $nssmPath -UseBasicParsing
}

if (Test-Path $nssmPath) {
    if (-not $existingService) {
        & $nssmPath install $serviceName "$AppDir\ytbs-server.exe"
    }
    & $nssmPath set $serviceName AppDirectory "$AppDir"
    & $nssmPath set $serviceName AppEnvironmentExtra "DATABASE_URL=postgres://postgres:Adminpass123!@localhost:5432/ytbs_db?sslmode=disable" "PORT=8080" "ALERT_EMAIL=ozgancan9@gmail.com"
    & $nssmPath set $serviceName AppRestartDelay 5000
    & $nssmPath set $serviceName Start SERVICE_AUTO_START
    Start-Service -Name $serviceName
    Write-Host "   -> $serviceName servisi NSSM ile otomatik başlatıldı." -ForegroundColor Green
} else {
    # Fallback to Task Scheduler if NSSM fails
    Unregister-ScheduledTask -TaskName "YTBS-Platform" -Confirm:$false -ErrorAction SilentlyContinue
    $action = New-ScheduledTaskAction -Execute "$AppDir\ytbs-server.exe" -WorkingDirectory "$AppDir"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName "YTBS-Platform" -Action $action -Trigger $trigger -Principal $principal -Description "YTBS SCADA Energy Service"
    Start-ScheduledTask -TaskName "YTBS-Platform"
    Write-Host "   -> YTBS-Platform Windows Görevi olarak otomatik başlatıldı." -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ DEPLOY HATTI VE SERVİS KURULUMU TAMAMLANDI!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🌐 Canlı Web Arayüzü: http://85.111.7.170:8080" -ForegroundColor Cyan
Write-Host "👤 Giriş: admin / Adminpass123!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
