# PowerShell Complete Uninstaller for Discord Auto-Translator Fresh Edition
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Complete Uninstaller" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Close Discord processes
Write-Host "[1/3] Closing Discord processes..." -ForegroundColor Yellow
Stop-Process -Name "Discord" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Run deep cleanup via Node or PowerShell
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$uninstallJs = Join-Path $scriptDir "uninstall.js"

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "[2/3] Executing deep core cleanup via Node..." -ForegroundColor Yellow
    node $uninstallJs
} else {
    Write-Host "[2/3] Restoring clean index.js..." -ForegroundColor Yellow
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

    foreach ($coreFile in $discordCorePaths) {
        $cleanContent = "module.exports = require('./core.asar');`r`n"
        [System.IO.File]::WriteAllText($coreFile.FullName, $cleanContent, [System.Text.Encoding]::UTF8)
        Write-Host "[SUCCESS] Restored Clean Index: $($coreFile.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Uninstallation Complete!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 3. Relaunch Discord Desktop
$discordUpdater = "$env:LOCALAPPDATA\Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
