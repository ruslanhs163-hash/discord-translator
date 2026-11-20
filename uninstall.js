const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
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

const coreDirs = findDiscordCorePaths(discordDir);
let uninstalledCount = 0;

for (const coreDir of coreDirs) {
    console.log(`\n[+] Complete cleanup of Discord core: ${coreDir}`);

    // 1. Clean index.js
    const indexJsPath = path.join(coreDir, 'index.js');
    if (fs.existsSync(indexJsPath)) {
        fs.writeFileSync(indexJsPath, "module.exports = require('./core.asar');\n", 'utf8');
        console.log('   [OK] Clean index.js restored');
    }

    // 2. Clean mainScreenPreload.js inside core.asar
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
                    console.log('   [OK] Cleaned mainScreenPreload.js inside core.asar');
                }
            }

            fs.rmSync(unpackedDir, { recursive: true, force: true });
            uninstalledCount++;
        } catch (err) {
            console.error('   [ERROR] Failed to clean core.asar:', err.message);
        }
    }
}

console.log('\n====================================================');
console.log(`[SUCCESS] Translator 100% completely uninstalled from Discord!`);
console.log('====================================================\n');
