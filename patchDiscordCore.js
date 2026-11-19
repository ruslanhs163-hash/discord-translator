const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const discordDir = path.join(localAppData, 'Discord');

console.log('====================================================');
console.log('  Discord Auto-Translator Universal Auto-Patcher');
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
    console.error('[ОШИБКА] Установка Discord не найдена на этом ПК!');
    console.error('Пожалуйста, убедитесь, что официальный Discord Desktop установлен.');
    process.exit(1);
}

let patchedCount = 0;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Найдена папка ядра Discord: ${coreDir}`);
    const coreAsarPath = path.join(coreDir, 'core.asar');
    const unpackedDir = path.join(coreDir, 'core_unpacked');
    const pluginFile = path.join(__dirname, 'discordTranslatorVencord.js');

    try {
        // 1. Распаковка core.asar
        console.log('   Распаковка core.asar...');
        execSync(`npx -y asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'ignore' });

        // 2. Чтение кода плагина
        const pluginCode = fs.readFileSync(pluginFile, 'utf8');

        // 3. Внедрение в mainScreenPreload.js
        const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
        let preloadContent = fs.readFileSync(preloadPath, 'utf8');

        const splitTag = '/* DISCORD AUTO TRANSLATOR INJECTION */';
        if (preloadContent.includes(splitTag)) {
            preloadContent = preloadContent.split(splitTag)[0];
        }

        preloadContent += `\n\n${splitTag}\n${pluginCode}\n`;
        fs.writeFileSync(preloadPath, preloadContent, 'utf8');

        // 4. Запаковка обратно в core.asar
        console.log('   Упаковка пропатченного ядра...');
        execSync(`npx -y asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'ignore' });

        // 5. Очистка временной папки
        fs.rmSync(unpackedDir, { recursive: true, force: true });

        patchedCount++;
        console.log(`   [УСПЕХ] Успешно пропатчена версия: ${coreDir}`);

    } catch (err) {
        console.error(`   [ОШИБКА] Не удалось пропатчить ${coreDir}:`, err.message);
    }
}

console.log('\n====================================================');
console.log(`[ГОТОВО] Пропатчено версий Discord: ${patchedCount}`);
console.log('Инструкция: Откройте Discord и нажмите Ctrl + R!');
console.log('====================================================\n');
