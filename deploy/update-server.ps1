# ==============================================================================
# YTBS SCADA Enerji Platformu - Hızlı Güncelleme Scripti
# ==============================================================================

Write-Host "⚡ YTBS Platformu Güncelleniyor..." -ForegroundColor Cyan

$AppDir = "C:\ytbs-platform"
$repoDir = "C:\energy"

# Servisi durdur
$serviceName = "YTBSEnergyService"
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $serviceName -Force
}

# Git pull
if (Test-Path "$repoDir\.git") {
    Push-Location $repoDir
    git fetch origin
    git reset --hard origin/main
    Pop-Location
    Copy-Item "$repoDir\ytbs-server.exe" "$AppDir\ytbs-server.exe" -Force
} else {
    # Direct binary download from GitHub
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Mahmutcano/energy/main/ytbs-server.exe" -OutFile "$AppDir\ytbs-server.exe" -UseBasicParsing
}

# Servisi yeniden başlat
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
    Start-Service -Name $serviceName
} else {
    Start-ScheduledTask -TaskName "YTBS-Platform" -ErrorAction SilentlyContinue
}

Write-Host "✅ YTBS Platformu Başarıyla Güncellendi!" -ForegroundColor Green
Write-Host "🌐 http://85.111.7.170:8080" -ForegroundColor Cyan
