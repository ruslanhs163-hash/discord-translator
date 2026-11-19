# PowerShell Universal Dual-Coverage Installer for Discord Auto-Translator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Discord Auto-Translator Universal Installer" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Завершаем все процессы Discord для снятия файловых блокировок Windows
Write-Host "[1/3] Closing Discord processes..." -ForegroundColor Yellow
Stop-Process -Name "Discord" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "discordTranslatorVencord.js"

if (-not (Test-Path $sourceFile)) {
    Write-Host "[ERROR] Plugin file discordTranslatorVencord.js not found!" -ForegroundColor Red
    Exit 1
}

$pluginCode = [System.IO.File]::ReadAllText($sourceFile, [System.Text.Encoding]::UTF8)
$injectionHeader = "/* --- DISCORD AUTO TRANSLATOR NATIVE INJECTOR --- */"
$preloadInjectionHeader = "/* --- DISCORD AUTO TRANSLATOR PRELOAD INJECTOR --- */"
$encodedJS = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pluginCode))
$preloadInjection = @"

$preloadInjectionHeader
try {
  const { webFrame } = require('electron');
  const pluginJS = Buffer.from('$encodedJS', 'base64').toString('utf8');
  const injectTranslator = () => {
    const code = 'try { if (!window.__DISCORD_TRANSLATOR_ACTIVE__) { ' + pluginJS + '\\n } } catch (error) { console.error('[Discord Translator] Preload injection failed:', error); }';
    webFrame.executeJavaScript(code, true).catch((error) => {
      console.error('[Discord Translator] Preload renderer injection failed:', error.message);
    });
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', injectTranslator, { once: true });
  } else {
    injectTranslator();
  }
} catch (error) {
  console.error('[Discord Translator] Preload setup failed:', error);
}
"@

$indexJsCode = @"
module.exports = require('./core.asar');

$injectionHeader
try {
  const electron = require('electron');
  const pluginJS = Buffer.from('$encodedJS', 'base64').toString('utf8');

  if (electron && electron.app) {
    const injectedContents = new WeakSet();
    const injectIntoContents = (contents) => {
      if (!contents || contents.isDestroyed()) return;
      if (injectedContents.has(contents)) return;
      injectedContents.add(contents);

      const runJS = () => {
        if (contents.isDestroyed()) return;
        const script = 'try { if (!window.__DISCORD_TRANSLATOR_ACTIVE__) { ' + pluginJS + '\n } } catch (error) { console.error("[Discord Translator] Injection failed", error); }';
        contents.executeJavaScript(script, true).catch((error) => {
          console.error('[Discord Translator] Renderer injection failed:', error.message);
        });
      };

      contents.on('dom-ready', runJS);
      contents.on('did-finish-load', runJS);
      contents.on('did-navigate', runJS);
      contents.on('did-navigate-in-page', runJS);

      if (!contents.isLoading()) runJS();
    };

    const injectWindow = (win) => {
      if (win && !win.isDestroyed()) injectIntoContents(win.webContents);
    };

    // Discord creates the main application renderer separately from its bootstrap window.
    electron.app.on('web-contents-created', (event, contents) => injectIntoContents(contents));
    electron.app.on('browser-window-created', (event, win) => injectWindow(win));

    if (electron.webContents && electron.webContents.getAllWebContents) {
      electron.webContents.getAllWebContents().forEach(injectIntoContents);
    }

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

      if (electron.ipcMain && !electron.ipcMain.listenerCount('TRANSLATE_TEXT')) {
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

      // Cover a window created before the readiness callback ran.
      if (electron.BrowserWindow && electron.BrowserWindow.getAllWindows) {
        electron.BrowserWindow.getAllWindows().forEach(injectWindow);
      }
      if (electron.webContents && electron.webContents.getAllWebContents) {
        electron.webContents.getAllWebContents().forEach(injectIntoContents);
      }
    });
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

# 2. Поиск модулей discord_desktop_core
Write-Host "[2/3] Searching for Discord installation modules..." -ForegroundColor Yellow
$discordCorePaths = @()
foreach ($folder in $searchFolders) {
    if (Test-Path $folder) {
        $found = Get-ChildItem -Path $folder -Recurse -Filter "index.js" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*discord_desktop_core*\index.js" }
        if ($found) {
            $discordCorePaths += $found
        }
    }
}

$discordCorePaths = @($discordCorePaths | Sort-Object -Property FullName -Unique)

if (-not $discordCorePaths) {
    Write-Host ""
    Write-Host "[ATTENTION] Discord core modules not found on disk yet!" -ForegroundColor Yellow
    Write-Host "If you just freshly installed Discord, please:" -ForegroundColor White
    Write-Host "1. Launch Discord ONCE so it completes downloading its modules." -ForegroundColor White
    Write-Host "2. Close Discord." -ForegroundColor White
    Write-Host "3. Run install.bat again." -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Cyan
    Exit 1
}

# 3. Патчинг модулей ядра
Write-Host "[3/3] Patching Discord core modules..." -ForegroundColor Yellow
$patchedCount = 0
foreach ($coreFile in $discordCorePaths) {
    $coreDir = Split-Path -Parent $coreFile.FullName
    $coreAsarPath = Join-Path $coreDir "core.asar"
    $unpackedDir = Join-Path $coreDir "core_unpacked_installer"

    try {
        if (-not (Test-Path $coreAsarPath)) {
            throw "core.asar not found"
        }

        if (Test-Path $unpackedDir) {
            Remove-Item $unpackedDir -Recurse -Force
        }

        Write-Host "   Extracting core.asar..." -ForegroundColor DarkGray
        npx -y asar extract "$coreAsarPath" "$unpackedDir" | Out-Null
        $preloadPath = Join-Path $unpackedDir "mainScreenPreload.js"

        if (-not (Test-Path $preloadPath)) {
            throw "mainScreenPreload.js not found inside core.asar"
        }

        $preloadContent = [System.IO.File]::ReadAllText($preloadPath, [System.Text.Encoding]::UTF8)
        if ($preloadContent.Contains($preloadInjectionHeader)) {
            $preloadContent = $preloadContent.Split($preloadInjectionHeader)[0].TrimEnd() + "`n"
        }
        $preloadContent += $preloadInjection
        [System.IO.File]::WriteAllText($preloadPath, $preloadContent, [System.Text.Encoding]::UTF8)

        Write-Host "   Packing core.asar with main-window preload..." -ForegroundColor DarkGray
        npx -y asar pack "$unpackedDir" "$coreAsarPath" | Out-Null
        [System.IO.File]::WriteAllText($coreFile.FullName, $indexJsCode, [System.Text.Encoding]::UTF8)
        $patchedCount++
        Write-Host "[SUCCESS] Patched main window: $($coreFile.FullName)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not patch $($coreFile.FullName): $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        if (Test-Path $unpackedDir) {
            Remove-Item $unpackedDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Installation Complete! ($patchedCount Discord core modules patched)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 4. Автоматический перезапуск Discord
$discordUpdater = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
if (Test-Path $discordUpdater) {
    Write-Host "[INFO] Launching Discord Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $discordUpdater -ArgumentList "--processStart Discord.exe"
}
