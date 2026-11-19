const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const discordDir = path.join(localAppData, 'Discord');

console.log('====================================================');
console.log('  Discord Auto-Translator Complete Uninstaller');
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

// 1. Очистка пользовательских файлов плагина
const pluginDir = path.join(appData, 'Vencord', 'userplugins', 'discordTranslator');
if (fs.existsSync(pluginDir)) {
    try {
        fs.rmSync(pluginDir, { recursive: true, force: true });
        console.log('[+] Папка плагина удалена из AppData');
    } catch (e) {}
}

// 2. Полная очистка и восстановление стокового core.asar и index.js
const coreDirs = findDiscordCorePaths(discordDir);
let uninstalledCount = 0;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Полная очистка ядра Discord в: ${coreDir}`);

    // А) Восстановление чистого index.js
    const indexJsPath = path.join(coreDir, 'index.js');
    if (fs.existsSync(indexJsPath)) {
        fs.writeFileSync(indexJsPath, "module.exports = require('./core.asar');\n", 'utf8');
        console.log('   [OK] Восстановлен чистый index.js');
    }

    // Б) Восстановление чистого core.asar
    const coreAsarPath = path.join(coreDir, 'core.asar');
    const unpackedDir = path.join(coreDir, 'core_unpacked');

    if (fs.existsSync(coreAsarPath)) {
        try {
            execSync(`npx -y asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'ignore' });

            const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
            if (fs.existsSync(preloadPath)) {
                let preloadContent = fs.readFileSync(preloadPath, 'utf8');

                const splitTag = '/* DISCORD AUTO TRANSLATOR INJECTION */';
                if (preloadContent.includes(splitTag)) {
                    preloadContent = preloadContent.split(splitTag)[0].trim() + '\n';
                    fs.writeFileSync(preloadPath, preloadContent, 'utf8');
                    execSync(`npx -y asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'ignore' });
                    console.log('   [OK] Очищен mainScreenPreload.js внутри core.asar');
                }
            }

            fs.rmSync(unpackedDir, { recursive: true, force: true });
            uninstalledCount++;
        } catch (err) {
            console.error('   [ОШИБКА] Ошибка очистки asar:', err.message);
        }
    }
}

console.log('\n====================================================');
console.log(`[УСПЕХ] Переводчик полностью и без следа удален из Discord!`);
console.log('====================================================\n');
