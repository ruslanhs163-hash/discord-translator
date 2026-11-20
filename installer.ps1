# PowerShell Standalone Installer for Discord Auto-Translator Fresh Edition
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Fresh Installer (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Завершаем все процессы Discord
Write-Host "[1/3] Closing Discord processes..." -ForegroundColor Yellow
Stop-Process -Name "Discord" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 2. Вызов патчера mainScreenPreload.js внутри core.asar
Write-Host "[2/3] Patching Discord core.asar..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node "$scriptDir\patchDiscordCore.js"
} else {
    Write-Host "[WARNING] Node.js not found, fallback to index.js injector..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Installation Complete!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 3. Перезапуск Discord
$discordUpdater = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
