$ErrorActionPreference = 'Stop'
$marker = '/* DISCORD TRANSLATOR EASY PRELOAD */'

function Find-CoreDirectories([string]$Root) {
    if (-not (Test-Path $Root)) { return @() }
    $found = New-Object System.Collections.Generic.List[string]
    foreach ($directory in Get-ChildItem -Path $Root -Directory -Recurse -ErrorAction SilentlyContinue) {
        if ($directory.Name -notlike 'discord_desktop_core*') { continue }
        $core = if (Test-Path (Join-Path $directory.FullName 'core.asar')) { $directory.FullName } else { Join-Path $directory.FullName 'discord_desktop_core' }
        $backup = (Join-Path $core 'core.asar') + '.easy-backup.asar'
        if (Test-Path $backup) { [void]$found.Add($core) }
    }
    return @($found | Sort-Object -Unique)
}

try {
    Write-Host 'Discord Translator Easy - uninstall' -ForegroundColor Cyan
    Stop-Process -Name Discord -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    $roots = @("$env:LOCALAPPDATA\Discord", "$env:LOCALAPPDATA\DiscordCanary", "$env:LOCALAPPDATA\DiscordPTB", "$env:APPDATA\Discord")
    $cores = @($roots | ForEach-Object { Find-CoreDirectories $_ } | Sort-Object -Unique)
    if (-not $cores) { Write-Host 'No Easy backup found; nothing to restore.'; exit 0 }

    foreach ($core in $cores) {
        $asarPath = Join-Path $core 'core.asar'
        $backupPath = "$asarPath.easy-backup.asar"
        $tempPath = "$asarPath.easy-restore"
        Copy-Item $backupPath $tempPath -Force
        [System.IO.File]::Copy($tempPath, $asarPath, $true)
        Remove-Item $tempPath -Force
        $indexPath = Join-Path $core 'index.js'
        $indexBackup = "$indexPath.easy-backup"
        if (Test-Path $indexBackup) {
            Copy-Item $indexBackup $indexPath -Force
            Remove-Item $indexBackup -Force
        }
        Remove-Item $backupPath -Force
        Write-Host "Restored original Discord core: $core" -ForegroundColor Green
    }
    $updater = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
    if (Test-Path $updater) { Start-Process -FilePath $updater -ArgumentList '--processStart Discord.exe' }
    Write-Host 'Discord Translator Easy removed.' -ForegroundColor Green
} catch {
    Write-Host "UNINSTALL FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
