# PowerShell script for Official Discord Desktop (resources/app Injection)
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Official Discord Desktop Native Auto-Translator Setup" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$appData = [System.Environment]::GetFolderPath('ApplicationData')
$localAppData = [System.Environment]::GetFolderPath('LocalApplicationData')

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "discordTranslatorVencord.js"

if (-not (Test-Path $sourceFile)) {
    Write-Host "[ERROR] Plugin file not found!" -ForegroundColor Red
    Exit 1
}

# 1. Save plugin file
$targetDir = Join-Path $appData "Vencord\userplugins\discordTranslator"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}
$targetFile = Join-Path $targetDir "index.js"
Copy-Item -Path $sourceFile -Destination $targetFile -Force
Write-Host "[OK] Plugin saved to: $targetFile" -ForegroundColor Green

# 2. Patch Official Discord Desktop resources/app
$discordAppPaths = Get-ChildItem -Path "$localAppData\Discord" -Recurse -Filter "resources" -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer }

$patchedCount = 0
foreach ($resFolder in $discordAppPaths) {
    $appFolder = Join-Path $resFolder.FullName "app"
    if (-not (Test-Path $appFolder)) {
        New-Item -ItemType Directory -Path $appFolder -Force | Out-Null
    }

    $packageJsonPath = Join-Path $appFolder "package.json"
    $packageJsonContent = '{"name": "discord", "main": "index.js"}'
    Set-Content -Path $packageJsonPath -Value $packageJsonContent -Encoding ASCII

    $indexJsPath = Join-Path $appFolder "index.js"
    $indexJsContent = @"
const path = require('path');
const fs = require('fs');
const electron = require('electron');

// 1. Load Original Discord app.asar
try {
  require('../app.asar');
} catch (e) {
  console.error('[Discord Orig Load Error]:', e);
}

// 2. Setup Auto-Translator Injection & CSP Bypass
const pluginPath = path.join(process.env.APPDATA, 'Vencord', 'userplugins', 'discordTranslator', 'index.js');

try {
  if (electron && electron.app) {
    electron.app.whenReady().then(() => {
      // Disable CSP headers for translation requests
      if (electron.session && electron.session.defaultSession) {
        electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
          if (details.responseHeaders) {
            delete details.responseHeaders['content-security-policy'];
            delete details.responseHeaders['Content-Security-Policy'];
          }
          callback({ cancel: false, responseHeaders: details.responseHeaders });
        });
      }

      // IPC Main Process Translator
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

    // Inject Script Tag into Main World
    electron.app.on('browser-window-created', (evt, win) => {
      if (!win || !win.webContents) return;
      const inject = () => {
        if (fs.existsSync(pluginPath)) {
          const js = fs.readFileSync(pluginPath, 'utf8');
          const scriptInjector = 'try { const scr = document.createElement("script"); scr.textContent = ' + JSON.stringify(js) + '; (document.head || document.documentElement).appendChild(scr); } catch(e) {}';
          win.webContents.executeJavaScript(scriptInjector).catch(() => {});
        }
      };
      win.webContents.on('did-finish-load', inject);
      win.webContents.on('dom-ready', inject);
      win.webContents.on('did-navigate', inject);
    });
  }
} catch (err) {
  console.error('[Discord Translator Error]:', err);
}
"@

    Set-Content -Path $indexJsPath -Value $indexJsContent -Encoding ASCII
    $patchedCount++
    Write-Host "[OK] Created Native Override in: $appFolder" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Official Discord Desktop Patched Successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
