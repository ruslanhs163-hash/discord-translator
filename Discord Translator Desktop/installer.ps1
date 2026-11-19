$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginPath = Join-Path $scriptRoot 'discordTranslatorVencord.js'
$indexMarker = '/* DISCORD TRANSLATOR EASY MAIN-WORLD INJECTOR */'

function Find-CoreDirectories([string]$Root) {
    if (-not (Test-Path $Root)) { return @() }
    $found = New-Object System.Collections.Generic.List[string]
    foreach ($directory in Get-ChildItem -Path $Root -Directory -Recurse -ErrorAction SilentlyContinue) {
        if ($directory.Name -notlike 'discord_desktop_core*') { continue }
        $core = if (Test-Path (Join-Path $directory.FullName 'core.asar')) { $directory.FullName } else { Join-Path $directory.FullName 'discord_desktop_core' }
        if ((Test-Path (Join-Path $core 'index.js')) -and (Test-Path (Join-Path $core 'core.asar'))) { [void]$found.Add($core) }
    }
    return @($found | Sort-Object -Unique)
}

function New-IndexContent([string]$PluginBase64) {
    return @"
module.exports = require('./core.asar');

$indexMarker
try {
  const electron = require('electron');
  const pluginJS = Buffer.from('$PluginBase64', 'base64').toString('utf8');
  const injectedContents = new WeakSet();
  const injectIntoContents = (contents) => {
    if (!contents || contents.isDestroyed() || injectedContents.has(contents)) return;
    injectedContents.add(contents);
    const runTranslator = () => {
      if (contents.isDestroyed()) return;
      const script = '(function(){const start=()=>{if(!document.querySelector("#app-mount")||window.innerWidth<500||typeof localStorage==="undefined")return false;try{if(!window.__DISCORD_TRANSLATOR_ACTIVE__){' + pluginJS + '\n}}catch(error){console.error("[Discord Translator] Injection failed",error);return true}return true};if(!start()){let attempts=0;const timer=setInterval(()=>{if(start()||++attempts>=40)clearInterval(timer)},250)}})();';
      contents.executeJavaScript(script, true).catch(error => console.error('[Discord Translator] Renderer injection failed:', error.message));
    };
    contents.on('dom-ready', runTranslator);
    contents.on('did-finish-load', runTranslator);
    if (!contents.isLoading()) runTranslator();
  };

  if (electron && electron.app) {
    electron.app.on('web-contents-created', (event, contents) => injectIntoContents(contents));
    electron.app.whenReady().then(() => {
      if (electron.webContents && electron.webContents.getAllWebContents) {
        electron.webContents.getAllWebContents().forEach(injectIntoContents);
      }
      if (electron.ipcMain && !electron.ipcMain.listenerCount('TRANSLATE_TEXT')) {
        electron.ipcMain.handle('TRANSLATE_TEXT', async (event, { text, target, source }) => new Promise(resolve => {
          try {
            const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + (source || 'auto') + '&tl=' + (target || 'ru') + '&dt=t&q=' + encodeURIComponent(text);
            const request = electron.net.request(url);
            let body = '';
            request.on('response', response => {
              response.on('data', chunk => body += chunk.toString('utf8'));
              response.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const translated = data && data[0] ? data[0].map(part => part && part[0] || '').join('') : '';
                  resolve(translated || text);
                } catch (_) { resolve(text); }
              });
            });
            request.on('error', () => resolve(text));
            request.end();
          } catch (_) { resolve(text); }
        }));
      }
    });
  }
} catch (error) { console.error('[Discord Translator Easy] Main-process setup failed:', error); }
"@
}

try {
    Write-Host 'Discord Translator Easy - install' -ForegroundColor Cyan
    if (-not (Test-Path $pluginPath)) { throw 'Translator script is missing.' }
    Stop-Process -Name Discord -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 1000

    $roots = @("$env:LOCALAPPDATA\Discord", "$env:LOCALAPPDATA\DiscordCanary", "$env:LOCALAPPDATA\DiscordPTB", "$env:APPDATA\Discord")
    $cores = @($roots | ForEach-Object { Find-CoreDirectories $_ } | Sort-Object -Unique)
    if (-not $cores) { throw 'Discord Desktop was not found. Run Discord once, close it, then retry.' }

    $plugin = [IO.File]::ReadAllText($pluginPath, [Text.Encoding]::UTF8)
    $pluginBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($plugin))
    $indexContent = New-IndexContent $pluginBase64

    foreach ($core in $cores) {
        $asarPath = Join-Path $core 'core.asar'
        $indexPath = Join-Path $core 'index.js'
        $asarBackup = "$asarPath.easy-backup.asar"
        $indexBackup = "$indexPath.easy-backup"
        if (-not (Test-Path $asarBackup)) { Copy-Item $asarPath $asarBackup }
        if (-not (Test-Path $indexBackup)) { Copy-Item $indexPath $indexBackup }

        Copy-Item $asarBackup $asarPath -Force
        [IO.File]::WriteAllText($indexPath, $indexContent, (New-Object Text.UTF8Encoding($false)))
        Write-Host "Installed main-world translator injector: $core" -ForegroundColor Green
    }

    $updater = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
    if (Test-Path $updater) { Start-Process -FilePath $updater -ArgumentList '--processStart Discord.exe' }
    Write-Host 'Done. Discord is restarting.' -ForegroundColor Green
} catch {
    Write-Host "INSTALL FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
