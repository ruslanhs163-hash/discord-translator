const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const userProfile = process.env.USERPROFILE || 'C:\\Users\\' + (process.env.USERNAME || '');

console.log('====================================================');
console.log('  Discord Auto-Translator Complete Uninstaller');
console.log('====================================================');

const searchFolders = [
    path.join(localAppData, 'Discord'),
    path.join(appData, 'Discord'),
    path.join(userProfile, 'AppData', 'Local', 'Discord'),
    path.join(localAppData, 'DiscordCanary'),
    path.join(localAppData, 'DiscordPTB'),
    'C:\\Program Files\\Discord',
    'C:\\Program Files (x86)\\Discord'
];

function findDiscordCorePaths(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (item.name === 'discord_desktop_core' && (fs.existsSync(path.join(fullPath, 'core.asar')) || fs.existsSync(path.join(fullPath, 'index.js')))) {
                    results.push(fullPath);
                } else {
                    results = results.concat(findDiscordCorePaths(fullPath));
                }
            }
        }
    } catch (e) {}
    return results;
}

let coreDirs = [];
for (const folder of searchFolders) {
    coreDirs = coreDirs.concat(findDiscordCorePaths(folder));
}

// Удаление уникальных дубликатов путей
coreDirs = Array.from(new Set(coreDirs));

let uninstalledCount = 0;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Полное удаление плагина из ядра: ${coreDir}`);

    // 1. Восстановление абсолютно чистого index.js
    const indexJsPath = path.join(coreDir, 'index.js');
    if (fs.existsSync(indexJsPath)) {
        fs.writeFileSync(indexJsPath, "module.exports = require('./core.asar');\n", 'utf8');
        console.log('   [OK] Восстановлен чистый стоковый index.js');
    }

    // 2. Распаковка core.asar и полная очистка mainScreenPreload.js
    const coreAsarPath = path.join(coreDir, 'core.asar');
    const unpackedDir = path.join(coreDir, 'core_unpacked');

    if (fs.existsSync(coreAsarPath)) {
        try {
            execSync(`npx -y asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'ignore' });

            const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
            if (fs.existsSync(preloadPath)) {
                let preloadContent = fs.readFileSync(preloadPath, 'utf8');

                // Поиск ЛЮБЫХ вариантов внедрения перевода (DISCORD AUTO TRANSLATOR / TRANSLATOR INJECTION)
                const tags = [
                    '/* DISCORD AUTO TRANSLATOR INJECTION */',
                    '/* --- DISCORD AUTO TRANSLATOR',
                    'DISCORD AUTO TRANSLATOR',
                    'window.__DISCORD_TRANSLATOR_ACTIVE__'
                ];

                let needsClean = false;
                for (const tag of tags) {
                    if (preloadContent.includes(tag)) {
                        preloadContent = preloadContent.split(tag)[0].trim() + '\n';
                        needsClean = true;
                    }
                }

                if (needsClean) {
                    fs.writeFileSync(preloadPath, preloadContent, 'utf8');
                    execSync(`npx -y asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'ignore' });
                    console.log('   [OK] Вырезан код плагина из mainScreenPreload.js и перепакован core.asar');
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
console.log(`[УСПЕХ] Переводчик на 100% удален из Discord! (Очищено ядер: ${uninstalledCount})`);
console.log('====================================================\n');
