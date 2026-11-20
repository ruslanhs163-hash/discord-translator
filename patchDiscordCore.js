const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const discordDir = path.join(localAppData, 'Discord');

console.log('====================================================');
console.log('  Discord Auto-Translator Core Patcher v5');
console.log('====================================================');

function findDiscordCorePaths(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (item.name === 'discord_desktop_core' && fs.existsSync(path.join(fullPath, 'core.asar'))) {
                    results.push(fullPath);
                } else {
                    results = results.concat(findDiscordCorePaths(fullPath));
                }
            }
        }
    } catch (e) {}
    return results;
}

const coreDirs = findDiscordCorePaths(discordDir);

if (coreDirs.length === 0) {
    console.error('[ERROR] Discord installation not found!');
    process.exit(1);
}

let patchedCount = 0;

const indexJsCode = `module.exports = require('./core.asar');

/* --- DISCORD AUTO TRANSLATOR IPC HANDLER --- */
try {
  const electron = require('electron');
  if (electron && electron.app) {
    electron.app.whenReady().then(() => {
      if (electron.ipcMain) {
        try {
          electron.ipcMain.handle('TRANSLATE_TEXT', async (event, { text, target, source }) => {
            return new Promise((resolve) => {
              try {
                const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + (source || 'auto') + '&tl=' + (target || 'ru') + '&dt=t&q=' + encodeURIComponent(text);
                const req = electron.net.request({ method: 'GET', url: url });
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
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
        } catch(e) {}
      }
    });
  }
} catch(e) {}
`;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Found Discord core folder: ${coreDir}`);
    const coreAsarPath = path.join(coreDir, 'core.asar');
    const unpackedDir = path.join(coreDir, 'core_unpacked');
    const pluginFile = path.join(__dirname, 'discordTranslator.js');

    try {
        // 1. Write IPC handler to index.js
        const indexJsPath = path.join(coreDir, 'index.js');
        fs.writeFileSync(indexJsPath, indexJsCode, 'utf8');
        console.log('   [OK] Registered IPC handler in index.js');

        // 2. Unpack core.asar
        console.log('   Unpacking core.asar...');
        execSync(`npx -y asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'ignore' });

        // 3. Read plugin code
        const pluginCode = fs.readFileSync(pluginFile, 'utf8');

        // 4. Inject into mainScreenPreload.js
        const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
        let preloadContent = fs.readFileSync(preloadPath, 'utf8');

        const splitTag = '/* DISCORD AUTO TRANSLATOR INJECTION */';
        if (preloadContent.includes(splitTag)) {
            preloadContent = preloadContent.split(splitTag)[0];
        }

        preloadContent += `\n\n${splitTag}\n${pluginCode}\n`;
        fs.writeFileSync(preloadPath, preloadContent, 'utf8');

        // 5. Pack back to core.asar
        console.log('   Packing patched core.asar...');
        execSync(`npx -y asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'ignore' });

        // 6. Clean unpacked folder
        fs.rmSync(unpackedDir, { recursive: true, force: true });

        patchedCount++;
        console.log(`   [SUCCESS] Successfully patched: ${coreDir}`);

    } catch (err) {
        console.error(`   [ERROR] Failed to patch ${coreDir}:`, err.message);
    }
}

console.log('\n====================================================');
console.log(`[DONE] Patched Discord installations: ${patchedCount}`);
console.log('====================================================\n');
