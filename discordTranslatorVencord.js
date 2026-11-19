// ==UserScript==
// @name         Discord Desktop Auto-Translator Top-Bar Badge
// @namespace    http://tampermonkey.net/
// @version      5.2.0
// @description  Бесшовный переводчик с гарантированным прикреплением к document.documentElement
// ==/UserScript==

(function() {
    'use strict';

    if (window.__DISCORD_TRANSLATOR_ACTIVE__) return;
    window.__DISCORD_TRANSLATOR_ACTIVE__ = true;

    console.log('[Discord Translator] Инициализация модуля с привязкой к documentElement...');

    let isEnabled = localStorage.getItem('discord_translator_enabled') !== 'false';

    let userTargetLang = localStorage.getItem('discord_translator_target_lang');
    if (!userTargetLang) {
        userTargetLang = (navigator.language || navigator.userLanguage || 'ru').split('-')[0].toLowerCase();
    }

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
     * Гарантированная плавающая кнопка в правом верхнем углу (Привязка к document.documentElement)
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
                right: 180px !important;
                z-index: 2147483647 !important;
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
                box-shadow: 0 2px 10px rgba(0,0,0,0.6) !important;
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

    setInterval(scanAndTranslate, 500);
    scanAndTranslate();

    console.log(`[Discord Translator] Плашка 100% привязана к documentElement!`);
})();
