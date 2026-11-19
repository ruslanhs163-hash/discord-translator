# PowerShell Universal Uninstaller for Discord Auto-Translator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Uninstaller (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Close Discord if running
Write-Host "[1/3] Closing Discord processes..." -ForegroundColor Yellow
Stop-Process -Name "Discord" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Restore clean stock discord_desktop_core index.js
$searchFolders = @(
    "$env:LOCALAPPDATA\Discord",
    "$env:APPDATA\Discord",
    "$env:USERPROFILE\AppData\Local\Discord",
    "$env:LOCALAPPDATA\DiscordCanary",
    "$env:LOCALAPPDATA\DiscordPTB",
    "C:\Program Files\Discord",
    "C:\Program Files (x86)\Discord"
)

$discordCorePaths = @()
foreach ($folder in $searchFolders) {
    if (Test-Path $folder) {
        $found = Get-ChildItem -Path $folder -Recurse -Filter "index.js" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*discord_desktop_core*\index.js" }
        if ($found) {
            $discordCorePaths += $found
        }
    }
}

Write-Host "[2/3] Restoring original Discord core files..." -ForegroundColor Yellow
$uninstalledCount = 0
foreach ($coreFile in $discordCorePaths) {
    $cleanContent = "module.exports = require('./core.asar');`r`n"
    [System.IO.File]::WriteAllText($coreFile.FullName, $cleanContent, [System.Text.Encoding]::UTF8)
    $uninstalledCount++
    Write-Host "[SUCCESS] Restored Clean Discord Core: $($coreFile.FullName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Uninstallation Complete! ($uninstalledCount Discord core modules restored)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 3. Relaunch Discord Desktop safely
$discordUpdater = "$env:LOCALAPPDATA\Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Automatically launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
