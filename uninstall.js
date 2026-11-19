const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const discordDir = path.join(localAppData, 'Discord');

console.log('====================================================');
console.log('  Discord Auto-Translator Uninstaller');
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
        console.log('[+] Папка плагина успешно удалена из AppData');
    } catch (e) {}
}

// 2. Очистка модов ядра Discord
const coreDirs = findDiscordCorePaths(discordDir);
let uninstalledCount = 0;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Восстановление ядра Discord в: ${coreDir}`);
    const coreAsarPath = path.join(coreDir, 'core.asar');
    const unpackedDir = path.join(coreDir, 'core_unpacked');

    try {
        // Распаковка
        execSync(`npx -y asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'ignore' });

        const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
        if (fs.existsSync(preloadPath)) {
            let preloadContent = fs.readFileSync(preloadPath, 'utf8');

            const splitTag = '/* DISCORD AUTO TRANSLATOR INJECTION */';
            if (preloadContent.includes(splitTag)) {
                preloadContent = preloadContent.split(splitTag)[0].trim() + '\n';
                fs.writeFileSync(preloadPath, preloadContent, 'utf8');

                // Перепаковка
                execSync(`npx -y asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'ignore' });
                console.log('   [УСПЕХ] Оригинальное ядро полностью восстановлено!');
                uninstalledCount++;
            } else {
                console.log('   [ИНФО] Патч не найден, ядро чистые.');
            }
        }

        // Очистка временных файлов
        fs.rmSync(unpackedDir, { recursive: true, force: true });

    } catch (err) {
        console.error(`   [ОШИБКА] Ошибка удаления из ${coreDir}:`, err.message);
    }
}

console.log('\n====================================================');
console.log(`[ГОТОВО] Переводчик успешно удален из Discord!`);
console.log('Инструкция: Нажмите Ctrl + R в Discord для обновления.');
console.log('====================================================\n');
