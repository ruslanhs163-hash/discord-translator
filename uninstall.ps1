# PowerShell Standalone Uninstaller for Discord Auto-Translator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Uninstaller (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$localAppData = [System.Environment]::GetFolderPath('LocalApplicationData')
$injectionHeader = "/* --- DISCORD AUTO TRANSLATOR NATIVE INJECTOR --- */"

$discordCorePaths = Get-ChildItem -Path "$localAppData\Discord" -Recurse -Filter "index.js" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*discord_desktop_core*\index.js" }

$uninstalledCount = 0
foreach ($coreFile in $discordCorePaths) {
    $content = [System.IO.File]::ReadAllText($coreFile.FullName, [System.Text.Encoding]::UTF8)

    if ($content.Contains($injectionHeader)) {
        $parts = $content -split [regex]::Escape($injectionHeader)
        $cleanContent = $parts[0].Trim()
        if ([string]::IsNullOrWhiteSpace($cleanContent)) {
            $cleanContent = "module.exports = require('./core.asar');"
        }
        [System.IO.File]::WriteAllText($coreFile.FullName, $cleanContent, [System.Text.Encoding]::UTF8)
        $uninstalledCount++
        Write-Host "[OK] Restored Discord Module: $($coreFile.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Uninstallation Complete! ($uninstalledCount Discord core files restored)" -ForegroundColor Green
Write-Host "Instructions: Open Discord Desktop and press Ctrl + R!" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan
