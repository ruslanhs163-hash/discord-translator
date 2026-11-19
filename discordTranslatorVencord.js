// ==UserScript==
// @name         Discord Desktop Auto-Translator License & Free Edition
// @namespace    http://tampermonkey.net/
// @version      6.0.0
// @description  Глобальный авто-переводчик с поддержкой бесплатного режима и опциональных PRO-ключей доступа
// ==/UserScript==

(function() {
    'use strict';

    if (window.__DISCORD_TRANSLATOR_ACTIVE__) return;
    window.__DISCORD_TRANSLATOR_ACTIVE__ = true;

    console.log('[Discord Translator] Запуск модуля с поддержкой ключей доступа...');

    let isEnabled = true;
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem) {
            isEnabled = localStorage.getItem('discord_translator_enabled') !== 'false';
        }
    } catch (e) {
        isEnabled = true;
    }

    let userTargetLang = 'ru';
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem) {
            userTargetLang = localStorage.getItem('discord_translator_target_lang') || '';
        }
        if (!userTargetLang && typeof navigator !== 'undefined') {
            userTargetLang = (navigator.language || navigator.userLanguage || 'ru').split('-')[0].toLowerCase();
        }
    } catch (e) {
        userTargetLang = 'ru';
    }

    // Система ключей доступа (По умолчанию бесплатный доступ FREE)
    let licenseKey = '';
    try {
        if (typeof localStorage !== 'undefined') {
            licenseKey = localStorage.getItem('discord_translator_license_key') || 'FREE-ACCESS';
        }
    } catch(e) {}

    const translationCache = new Map();
    const MAX_CACHE_SIZE = 4000;

    function isNativeUserLanguageText(text, userLang = userTargetLang) {
        if (!text || typeof text !== 'string') return false;

        if (userLang === 'ru') {
            const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
            const letterMatches = text.match(/[a-zA-Z\u0400-\u04FF]/g) || [];
            if (letterMatches.length === 0) return true;
            return (cyrillicMatches.length / letterMatches.length) > 0.2;
        }

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

        if (typeof window !== 'undefined' && window.require) {
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
     * Плавающая кнопка переключателя с поддержкой ввода ключей доступа
     */
    function renderFloatingButton() {
        if (typeof window === 'undefined' || window.innerWidth < 500 || !document.querySelector('#app-mount')) return;

        let btn = document.getElementById('discord-translator-floating-btn');
        if (!btn) {
            btn = document.createElement('div');
            btn.id = 'discord-translator-floating-btn';
            btn.title = 'ЛКМ - Включить/Выключить | ПКМ - Ввести ключ доступа';

            btn.style.cssText = `
                position: fixed !important;
                top: 6px !important;
                right: 215px !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 3px 10px !important;
                border-radius: 6px !important;
                font-size: 11px !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                font-weight: bold !important;
                cursor: pointer !important;
                user-select: none !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.6) !important;
                transition: all 0.2s ease !important;
                -webkit-app-region: no-drag !important;
                pointer-events: auto !important;
            `;

            // Левый клик - ВКЛ/ВЫКЛ
            btn.addEventListener('click', (e) => {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                isEnabled = !isEnabled;
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('discord_translator_enabled', isEnabled ? 'true' : 'false');
                    }
                } catch(err) {}

                if (!isEnabled) {
                    translationCache.clear();
                }

                updateBtnState();
            }, true);

            // Правый клик - Ввод ключа доступа (License Key)
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = prompt('Введите ключ доступа / PRO-ключ (по умолчанию доступ БЕСПЛАТНЫЙ):', licenseKey);
                if (key !== null) {
                    licenseKey = key.trim() || 'FREE-ACCESS';
                    try {
                        localStorage.setItem('discord_translator_license_key', licenseKey);
                    } catch(err) {}
                    alert('Ключ доступа сохранен: ' + licenseKey);
                }
            }, true);

            btn.addEventListener('mousedown', (e) => e.stopPropagation(), true);

            const root = document.documentElement || document.body;
            if (root) {
                root.appendChild(btn);
            }
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
     * РЕКУРСИВНЫЙ ПЕРЕВОД УЗЛОВ ТЕКСТА
     */
    async function translateTextNodes(node) {
        if (!node) return;

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue ? node.nodeValue.trim() : '';
            if (!text || isNativeUserLanguageText(text)) return;

            if (node.parentElement && (
                node.parentElement.tagName === 'SCRIPT' ||
                node.parentElement.tagName === 'STYLE' ||
                node.parentElement.tagName === 'CODE' ||
                node.parentElement.classList.contains('mention') ||
                node.parentElement.classList.contains('emoji') ||
                node.parentElement.getAttribute('contenteditable') === 'true'
            )) return;

            const translated = await requestTranslation(text, userTargetLang, 'auto');
            if (translated && translated !== text && node.nodeValue.trim() === text) {
                node.nodeValue = node.nodeValue.replace(text, translated);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute('contenteditable') === 'true' || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') return;
            if (node.classList && (node.classList.contains('mention') || node.classList.contains('emoji'))) return;

            for (const child of node.childNodes) {
                translateTextNodes(child);
            }
        }
    }

    function processMessageContainer(el) {
        if (!isEnabled) return;
        if (!el || el.dataset.autoTranslated) return;

        el.dataset.autoTranslated = 'processing';

        translateTextNodes(el).then(() => {
            el.dataset.autoTranslated = 'true';
        }).catch(() => {
            el.dataset.autoTranslated = 'error';
        });
    }

    function scanAndTranslate() {
        if (typeof window === 'undefined' || window.innerWidth < 500 || !document.querySelector('#app-mount')) return;

        renderFloatingButton();

        if (!isEnabled) return;

        const selectors = [
            '[class*="messageContent"]',
            '[id^="message-content-"]',
            '[class*="markup-"]',
            '[class*="embedDescription"]',
            '[class*="embedTitle"]',
            '[class*="embedField"]',
            '[class*="embedFieldValue"]',
            '[class*="embedFieldName"]',
            '[class*="embedFooterText"]',
            '[class*="embedText"]',
            '[class*="embedFull"]'
        ];

        const elements = document.querySelectorAll(selectors.join(', '));
        for (const el of elements) {
            processMessageContainer(el);
        }
    }

    setInterval(scanAndTranslate, 600);
    scanAndTranslate();

    console.log(`[Discord Translator] Модуль доступа активен! Ключ: ${licenseKey}`);
})();
