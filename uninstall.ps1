# PowerShell Universal Uninstaller for Discord Auto-Translator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Uninstaller (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

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

# Автоматический перезапуск Discord
$discordUpdater = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Automatically launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
