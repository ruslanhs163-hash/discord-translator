const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA;
const discordCoreDir = path.join(localAppData, 'Discord', 'app-1.0.9269', 'modules', 'discord_desktop_core-1', 'discord_desktop_core');
const coreAsarPath = path.join(discordCoreDir, 'core.asar');
const unpackedDir = path.join(discordCoreDir, 'core_unpacked');
const pluginFile = path.join(__dirname, 'discordTranslatorVencord.js');

console.log('[Patcher] Начинаем обновление core.asar...');

try {
    // 1. Распаковываем core.asar
    execSync(`npx asar extract "${coreAsarPath}" "${unpackedDir}"`, { stdio: 'inherit' });

    // 2. Читаем плагин
    const pluginCode = fs.readFileSync(pluginFile, 'utf8');

    // 3. Обновляем mainScreenPreload.js
    const preloadPath = path.join(unpackedDir, 'mainScreenPreload.js');
    let preloadContent = fs.readFileSync(preloadPath, 'utf8');

    // Удаляем старый инжект если был
    const splitTag = '/* DISCORD AUTO TRANSLATOR INJECTION */';
    if (preloadContent.includes(splitTag)) {
        preloadContent = preloadContent.split(splitTag)[0];
    }

    // Вставляем свежий код
    preloadContent += `\n\n${splitTag}\n${pluginCode}\n`;
    fs.writeFileSync(preloadPath, preloadContent, 'utf8');
    console.log('[Patcher] Код плагина успешно обновлен в mainScreenPreload.js');

    // 4. Запаковываем обратно в core.asar
    execSync(`npx asar pack "${unpackedDir}" "${coreAsarPath}"`, { stdio: 'inherit' });
    console.log('[Patcher] core.asar успешно упакован!');

} catch (err) {
    console.error('[Patcher Error]:', err);
}
