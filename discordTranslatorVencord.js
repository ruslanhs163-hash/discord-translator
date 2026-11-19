// ==UserScript==
// @name         Discord Desktop Auto-Translator Universal Global Edition
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @description  Глобальный международный авто-переводчик с автоматическим определением родного языка пользователя
// ==/UserScript==

(function() {
    'use strict';

    if (window.__DISCORD_TRANSLATOR_ACTIVE__) return;
    window.__DISCORD_TRANSLATOR_ACTIVE__ = true;

    console.log('[Discord Translator] Запуск международного авто-переводчика...');

    let isEnabled = localStorage.getItem('discord_translator_enabled') !== 'false';

    // 1. Авто-определение родного языка ПК/браузера пользователя (ru, fr, de, es, en, ja и т.д.)
    let userTargetLang = localStorage.getItem('discord_translator_target_lang');
    if (!userTargetLang) {
        userTargetLang = (navigator.language || navigator.userLanguage || 'ru').split('-')[0].toLowerCase();
    }

    const translationCache = new Map();
    const MAX_CACHE_SIZE = 3000;

    /**
     * Проверка, написан ли текст уже на родном языке пользователя
     */
    function isNativeUserLanguageText(text, userLang = userTargetLang) {
        if (!text || typeof text !== 'string') return false;

        if (userLang === 'ru') {
            const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
            const letterMatches = text.match(/[a-zA-Z\u0400-\u04FF]/g) || [];
            if (letterMatches.length === 0) return true;
            return (cyrillicMatches.length / letterMatches.length) > 0.2;
        }

        // Для латиницы (en, fr, de, es, it)
        if (['en', 'fr', 'de', 'es', 'it', 'pt'].includes(userLang)) {
            const latinMatches = text.match(/[a-zA-Z\u00C0-\u024F]/g) || [];
            const allLetters = text.match(/[\p{L}]/gu) || [];
            if (allLetters.length === 0) return true;
            return (latinMatches.length / allLetters.length) > 0.5;
        }

        return false;
    }

    function saveToCache(key, value) {
        if (translationCache.size >= MAX_CACHE_SIZE) {
            const keysToDelete = Array.from(translationCache.keys()).slice(0, 1000);
            for (const oldKey of keysToDelete) {
                translationCache.delete(oldKey);
            }
        }
        translationCache.set(key, value);
    }

    async function requestTranslation(text, target = userTargetLang, source = 'auto') {
        if (!text || !text.trim()) return text;
        const key = `${source}:${target}:${text.trim()}`;
        if (translationCache.has(key)) return translationCache.get(key);

        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                if (ipcRenderer && ipcRenderer.invoke) {
                    const res = await ipcRenderer.invoke('TRANSLATE_TEXT', { text, target, source });
                    if (res && res !== text) {
                        saveToCache(key, res);
                        return res;
                    }
                }
            } catch (e) {}
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                let translated = '';
                if (data && data[0]) {
                    for (const s of data[0]) {
                        if (s && s[0]) translated += s[0];
                    }
                }
                const result = translated || text;
                saveToCache(key, result);
                return result;
            }
        } catch (err) {}

        return text;
    }

    /**
     * Плавающая кнопка переключателя
     */
    function renderFloatingButton() {
        let btn = document.getElementById('discord-translator-floating-btn');
        if (!btn) {
            btn = document.createElement('div');
            btn.id = 'discord-translator-floating-btn';
            btn.title = 'Click to toggle auto-translator';

            btn.style.cssText = `
                position: fixed !important;
                top: 8px !important;
                right: 280px !important;
                z-index: 999999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 4px 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                font-weight: bold !important;
                cursor: pointer !important;
                user-select: none !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
                transition: all 0.2s ease !important;
                -webkit-app-region: no-drag !important;
                pointer-events: auto !important;
            `;

            function toggleState(e) {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                isEnabled = !isEnabled;
                localStorage.setItem('discord_translator_enabled', isEnabled ? 'true' : 'false');

                if (!isEnabled) {
                    translationCache.clear();
                }

                updateBtnState();
            }

            btn.addEventListener('click', toggleState, true);
            btn.addEventListener('mousedown', (e) => e.stopPropagation(), true);

            (document.body || document.documentElement).appendChild(btn);
        }

        function updateBtnState() {
            const langLabel = userTargetLang.toUpperCase();
            if (isEnabled) {
                btn.innerText = `🌐 Translate (${langLabel}): ON`;
                btn.style.setProperty('background', '#2D7D46', 'important');
                btn.style.setProperty('color', '#FFFFFF', 'important');
                btn.style.setProperty('border', '1px solid #3BA55C', 'important');
            } else {
                btn.innerText = `🌐 Translate (${langLabel}): OFF`;
                btn.style.setProperty('background', '#C03537', 'important');
                btn.style.setProperty('color', '#FFFFFF', 'important');
                btn.style.setProperty('border', '1px solid #ED4245', 'important');
            }
        }

        updateBtnState();
    }

    /**
     * Перевод сообщений на родной язык пользователя
     */
    async function processElement(el) {
        if (!isEnabled) return;
        if (!el || el.dataset.autoTranslated) return;

        if (el.getAttribute('contenteditable') === 'true' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;

        const originalText = el.innerText ? el.innerText.trim() : '';
        if (!originalText || isNativeUserLanguageText(originalText)) {
            el.dataset.autoTranslated = 'skip';
            return;
        }

        el.dataset.autoTranslated = 'processing';

        try {
            const translatedText = await requestTranslation(originalText, userTargetLang, 'auto');
            if (translatedText && translatedText !== originalText) {
                el.dataset.originalText = originalText;
                el.dataset.translatedText = translatedText;

                const langBadgeText = userTargetLang.toUpperCase();
                const badge = document.createElement('span');
                badge.innerText = langBadgeText;
                badge.title = 'Click to show original message';
                badge.style.cssText = 'background: rgba(88, 101, 242, 0.3) !important; color: #5865F2 !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 11px !important; margin-left: 6px !important; cursor: pointer !important; user-select: none !important; font-weight: bold !important; display: inline-block !important; vertical-align: middle !important; -webkit-app-region: no-drag !important; pointer-events: auto !important;';

                let showingOriginal = false;
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showingOriginal = !showingOriginal;

                    const textNode = el.firstChild;
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        textNode.nodeValue = (showingOriginal ? originalText : translatedText) + ' ';
                    } else {
                        el.innerText = (showingOriginal ? originalText : translatedText) + ' ';
                        el.appendChild(badge);
                    }
                    badge.innerText = showingOriginal ? 'ORIGINAL' : langBadgeText;
                    badge.style.color = showingOriginal ? '#faa81a' : '#5865F2';
                }, true);

                el.innerText = translatedText + ' ';
                el.appendChild(badge);
                el.dataset.autoTranslated = 'true';
            } else {
                el.dataset.autoTranslated = 'done';
            }
        } catch (err) {
            el.dataset.autoTranslated = 'error';
        }
    }

    function scanAndTranslate() {
        renderFloatingButton();

        if (!isEnabled) return;

        const selectors = [
            '[class*="messageContent"]',
            '[id^="message-content-"]',
            '[class*="markup-"]',
            '[class*="embedDescription"]',
            '[class*="embedTitle"]'
        ];

        const elements = document.querySelectorAll(selectors.join(', '));
        for (const el of elements) {
            processElement(el);
        }
    }

    setInterval(scanAndTranslate, 800);
    scanAndTranslate();

    console.log(`[Discord Translator] Международный плагин запущен! Целевой язык: ${userTargetLang.toUpperCase()}`);
})();
