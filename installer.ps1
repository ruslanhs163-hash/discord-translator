# PowerShell Universal Installer for Discord Auto-Translator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Installer (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "discordTranslatorVencord.js"

if (-not (Test-Path $sourceFile)) {
    Write-Host "[ERROR] Plugin file discordTranslatorVencord.js not found!" -ForegroundColor Red
    Exit 1
}

$pluginCode = [System.IO.File]::ReadAllText($sourceFile, [System.Text.Encoding]::UTF8)
$injectionHeader = "/* --- DISCORD AUTO TRANSLATOR NATIVE INJECTOR --- */"
$encodedJS = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pluginCode))

$indexJsCode = @"
const core = require('./core.asar');
module.exports = core;

$injectionHeader
try {
  const electron = require('electron');
  const pluginJS = Buffer.from('$encodedJS', 'base64').toString('utf8');

  if (electron && electron.app) {
    electron.app.whenReady().then(() => {
      if (electron.session && electron.session.defaultSession) {
        electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
          if (details.responseHeaders) {
            delete details.responseHeaders['content-security-policy'];
            delete details.responseHeaders['Content-Security-Policy'];
          }
          callback({ cancel: false, responseHeaders: details.responseHeaders });
        });
      }

      if (electron.ipcMain) {
        electron.ipcMain.handle('TRANSLATE_TEXT', async (event, { text, target, source }) => {
          return new Promise((resolve) => {
            try {
              const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + (source || 'auto') + '&tl=' + (target || 'ru') + '&dt=t&q=' + encodeURIComponent(text);
              const req = electron.net.request(url);
              let body = '';
              req.on('response', (res) => {
                res.on('data', (chunk) => body += chunk.toString('utf8'));
                res.on('end', () => {
                  try {
                    const data = JSON.parse(body);
                    let translated = '';
                    if (data && data[0]) {
                      for (const s of data[0]) {
                        if (s && s[0]) translated += s[0];
                      }
                    }
                    resolve(translated || text);
                  } catch (e) { resolve(text); }
                });
              });
              req.on('error', () => resolve(text));
              req.end();
            } catch (err) { resolve(text); }
          });
        });
      }
    });

    const injectScript = (win) => {
      if (!win || !win.webContents) return;
      const runJS = () => {
        const scriptWrapper = 'try { const scr = document.createElement("script"); scr.textContent = ' + JSON.stringify(pluginJS) + '; (document.head || document.documentElement).appendChild(scr); } catch(e) {}';
        win.webContents.executeJavaScript(scriptWrapper).catch(() => {});
      };
      win.webContents.on('did-finish-load', runJS);
      win.webContents.on('dom-ready', runJS);
    };

    electron.app.on('browser-window-created', (evt, win) => injectScript(win));
  }
} catch (e) {
  console.error('[Translator Setup Err]:', e);
}
"@

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

if (-not $discordCorePaths) {
    Write-Host "[ERROR] Discord Desktop installation not found!" -ForegroundColor Red
    Exit 1
}

$patchedCount = 0
foreach ($coreFile in $discordCorePaths) {
    [System.IO.File]::WriteAllText($coreFile.FullName, $indexJsCode, [System.Text.Encoding]::UTF8)
    $patchedCount++
    Write-Host "[SUCCESS] Patched Discord Core: $($coreFile.FullName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Installation Complete! ($patchedCount Discord core modules patched)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# Автоматический перезапуск Discord
$discordUpdater = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Automatically launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
