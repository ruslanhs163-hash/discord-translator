// ==UserScript==
// @name         Discord Auto-Translator Container Engine v8
// @namespace    http://tampermonkey.net/
// @version      8.0.0
// @description  Глобальный авто-переводчик с единым точным определением языка для всего сообщения и полной поддержкой многострочного корейского текста
// ==/UserScript==

(function() {
    'use strict';

    // Подавление вызовов Passkey
    try {
        if (typeof navigator !== 'undefined' && navigator.credentials) {
            Object.defineProperty(navigator.credentials, 'get', {
                value: function() {
                    return Promise.reject(new DOMException('Passkey prompt suppressed', 'NotAllowedError'));
                },
                writable: false,
                configurable: true
            });
        }
    } catch (e) {}

    if (window.__DISCORD_TRANSLATOR_ACTIVE__) return;
    window.__DISCORD_TRANSLATOR_ACTIVE__ = true;

    console.log('[Discord Auto-Translator v8] Запуск концептуально нового контейнерного модуля...');

    let electronIPC = null;
    try {
        if (typeof require !== 'undefined') {
            electronIPC = require('electron').ipcRenderer;
        }
    } catch(e) {}

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

    const translationCache = new Map();
    const MAX_CACHE_SIZE = 4000;

    const ISO_LANG_MAP = {
        'de': 'DE', 'fr': 'FR', 'es': 'ES', 'it': 'IT', 'pl': 'PL', 'uk': 'UK',
        'pt': 'PT', 'nl': 'NL', 'sv': 'SV', 'fi': 'FI', 'da': 'DA', 'no': 'NO',
        'cs': 'CS', 'sk': 'SK', 'hu': 'HU', 'ro': 'RO', 'tr': 'TR', 'el': 'EL',
        'he': 'HE', 'iw': 'HE', 'ar': 'AR', 'ja': 'JA', 'zh': 'ZH', 'zh-cn': 'ZH',
        'zh-tw': 'ZH', 'ko': 'KO', 'hi': 'HI', 'th': 'TH', 'vi': 'VI', 'id': 'ID',
        'bg': 'BG', 'hr': 'HR', 'sr': 'SR', 'sl': 'SL', 'et': 'ET', 'lv': 'LV',
        'lt': 'LT', 'en': 'EN'
    };

    /**
     * Точный анализ единого исходного языка всего блока сообщения
     */
    function detectLanguageCode(text, apiCode) {
        if (apiCode && typeof apiCode === 'string') {
            const cleanCode = apiCode.toLowerCase().trim();
            if (cleanCode !== 'auto' && ISO_LANG_MAP[cleanCode]) {
                return ISO_LANG_MAP[cleanCode];
            }
            const prefix = cleanCode.split('-')[0];
            if (prefix !== 'auto' && ISO_LANG_MAP[prefix]) {
                return ISO_LANG_MAP[prefix];
            }
        }

        if (!text || typeof text !== 'string') return 'EN';

        // 1. Корейский (Korean Hangul)
        if (/[\uAC00-\uD7AF\u1100-\u11FF]/u.test(text)) return 'KO';

        // 2. Японский (Japanese Kana/Kanji)
        if (/[\u3040-\u30FF\u31F0-\u31FF]/u.test(text)) return 'JA';

        // 3. Китайский (Chinese CJK)
        if (/[\u4E00-\u9FFF]/u.test(text)) return 'ZH';

        // 4. Испанский (Spanish)
        if (/[ñ¿¡áéíóúÑÁÉÍÓÚ]/i.test(text) || /\b(el|los|las|del|por|para|como|pero|con|una|unos|este|esta|quien|somos|tamo|tengo)\b/i.test(text)) return 'ES';

        // 5. Немецкий (German)
        if (/[äöüßÄÖÜ]/i.test(text) || /\b(der|die|das|und|ist|nicht|mit|auf|ich|wir|sie|eine|dem|den|dass)\b/i.test(text)) return 'DE';

        // 6. Французский (French)
        if (/[éèêëàâçœÉÈÊËÀÂÇ]/i.test(text) || /\b(le|la|les|des|est|une|nous|vous|pour|dans|avec|cette|sont)\b/i.test(text)) return 'FR';

        // 7. Итальянский (Italian)
        if (/[ìòùÌÒÙ]/i.test(text) || /\b(del|della|delle|degli|sono|con|per|questo|questa|anche|come|tutto)\b/i.test(text)) return 'IT';

        // 8. Польский (Polish)
        if (/[ąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/i.test(text) || /\b(jest|nie|dla|tak|jak|ale|oraz|tylko|przez|bardzo|może)\b/i.test(text)) return 'PL';

        // 9. Украинский (Ukrainian)
        if (/[іїєґІЇЄҐ]/i.test(text)) return 'UK';

        // 10. Арабский (Arabic)
        if (/[\u0600-\u06FF]/u.test(text)) return 'AR';

        // 11. Турецкий (Turkish)
        if (/[ğşıİĞŞ]/i.test(text) || /\b(ve|bir|için|bu|da|de|oldu)\b/i.test(text)) return 'TR';

        return 'EN';
    }

    function isNativeUserLanguageText(text, userLang = userTargetLang) {
        if (!text || typeof text !== 'string') return false;

        if (userLang === 'ru') {
            const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
            const letterMatches = text.match(/[\p{L}]/gu) || [];
            if (letterMatches.length === 0) return true;
            return (cyrillicMatches.length / letterMatches.length) > 0.2;
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
        if (!text || !text.trim()) return { translated: text, detectedSource: 'EN' };
        const key = `${source}:${target}:${text.trim()}`;
        if (translationCache.has(key)) return translationCache.get(key);

        let detectedLang = detectLanguageCode(text, null);

        // 1. Попытка IPC перевода через Electron
        if (electronIPC && electronIPC.invoke) {
            try {
                const res = await electronIPC.invoke('TRANSLATE_TEXT', { text, target, source });
                if (res && typeof res === 'object' && res.translated) {
                    const finalLang = detectLanguageCode(text, res.detectedSource || detectedLang);
                    const finalObj = { translated: res.translated, detectedSource: finalLang };
                    saveToCache(key, finalObj);
                    return finalObj;
                } else if (typeof res === 'string' && res !== text) {
                    const finalObj = { translated: res, detectedSource: detectedLang };
                    saveToCache(key, finalObj);
                    return finalObj;
                }
            } catch (e) {}
        }

        // 2. Google Translate GTX API
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                let transText = '';
                if (data && data[0]) {
                    for (const s of data[0]) {
                        if (s && typeof s[0] === 'string') transText += s[0];
                    }
                }
                let rawDetected = (data && data[2]) ? data[2] : null;
                if (!rawDetected && data && data[8] && data[8][0] && data[8][0][0]) {
                    rawDetected = data[8][0][0];
                }
                const finalLang = detectLanguageCode(text, rawDetected || detectedLang);
                const resultText = (typeof transText === 'string' && transText.trim()) ? transText.trim() : text;
                const resultObj = { translated: resultText, detectedSource: finalLang };
                if (resultText && resultText !== text) {
                    saveToCache(key, resultObj);
                    return resultObj;
                }
            }
        } catch (err) {}

        return { translated: text, detectedSource: detectedLang };
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
                right: 220px !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 4px 12px !important;
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

            function toggleState(e) {
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
            }

            btn.addEventListener('click', toggleState, true);
            btn.addEventListener('mousedown', (e) => e.stopPropagation(), true);
        }

        const root = document.documentElement || document.body;
        if (root && !root.contains(btn)) {
            root.appendChild(btn);
        }

        function updateBtnState() {
            const langLabel = userTargetLang.toUpperCase();
            if (isEnabled) {
                btn.innerText = `🌐 Translate (➔ ${langLabel}): ON`;
                btn.style.setProperty('background', '#2D7D46', 'important');
                btn.style.setProperty('color', '#FFFFFF', 'important');
                btn.style.setProperty('border', '1px solid #3BA55C', 'important');
            } else {
                btn.innerText = `🌐 Translate (➔ ${langLabel}): OFF`;
                btn.style.setProperty('background', '#C03537', 'important');
                btn.style.setProperty('color', '#FFFFFF', 'important');
                btn.style.setProperty('border', '1px solid #ED4245', 'important');
            }
        }

        updateBtnState();
    }

    /**
     * Поиск всех текстовых узлов внутри элемента
     */
    function collectTextNodes(element, list = []) {
        if (!element) return list;
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.nodeValue ? child.nodeValue.trim() : '';
                if (text && !isNativeUserLanguageText(text)) {
                    if (child.parentElement && !(
                        child.parentElement.tagName === 'SCRIPT' ||
                        child.parentElement.tagName === 'STYLE' ||
                        child.parentElement.tagName === 'CODE' ||
                        child.parentElement.classList.contains('mention') ||
                        child.parentElement.classList.contains('emoji') ||
                        child.parentElement.classList.contains('translator-lang-badge') ||
                        child.parentElement.getAttribute('contenteditable') === 'true'
                    )) {
                        list.push(child);
                    }
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                if (child.getAttribute('contenteditable') === 'true' || child.tagName === 'INPUT' || child.tagName === 'TEXTAREA') continue;
                if (child.classList && (child.classList.contains('mention') || child.classList.contains('emoji') || child.classList.contains('translator-lang-badge'))) continue;
                collectTextNodes(child, list);
            }
        }
        return list;
    }

    /**
     * ЕДИНЫЙ КОНТЕЙНЕРНЫЙ ОБРАБОТЧИК СООБЩЕНИЯ (Единый язык на весь блок + 100% перевод корейского)
     */
    async function processMessageContainer(el) {
        if (!isEnabled) return;
        if (!el || el.dataset.autoTranslated === 'true') return;

        const fullRawText = el.textContent ? el.textContent.trim() : '';
        if (!fullRawText || isNativeUserLanguageText(fullRawText)) return;

        // 1. Определение ЕДИНОГО языка для всего блока сообщения целиком
        const overallLang = detectLanguageCode(fullRawText, null);

        // 2. Сбор всех текстовых узлов сообщения
        const textNodes = collectTextNodes(el);
        if (textNodes.length === 0) return;

        el.dataset.autoTranslated = 'processing';
        let didTranslateAny = false;
        let originalPairs = [];

        // 3. Параллельный перевод всех текстовых узлов (включая многострочный корейский)
        await Promise.all(textNodes.map(async (node) => {
            const originalVal = node.nodeValue;
            const textToTranslate = originalVal ? originalVal.trim() : '';
            if (!textToTranslate || isNativeUserLanguageText(textToTranslate)) return;

            const res = await requestTranslation(textToTranslate, userTargetLang, 'auto');
            if (res && res.translated && res.translated !== textToTranslate && node.nodeValue === originalVal) {
                node.nodeValue = originalVal.replace(textToTranslate, res.translated);
                originalPairs.push({ node, originalText: textToTranslate, translatedText: res.translated });
                didTranslateAny = true;
            }
        }));

        if (didTranslateAny) {
            el.dataset.autoTranslated = 'true';

            // 4. Добавляем ЕДИНСТВЕННУЮ стильную плашку языка [KO ➔ RU], [ES ➔ RU], [DE ➔ RU] в начало сообщения
            if (!el.querySelector('.translator-lang-badge')) {
                const badge = document.createElement('span');
                badge.className = 'translator-lang-badge';
                const srcLang = overallLang.toUpperCase();
                const targetLang = userTargetLang.toUpperCase();
                badge.innerText = `[${srcLang} ➔ ${targetLang}] `;
                badge.title = 'Нажмите для показа оригинала всего сообщения';
                badge.style.cssText = `
                    font-size: 10px !important;
                    font-weight: bold !important;
                    color: #00AFF0 !important;
                    background: rgba(0, 175, 240, 0.15) !important;
                    padding: 1px 5px !important;
                    border-radius: 4px !important;
                    margin-right: 6px !important;
                    cursor: pointer !important;
                    user-select: none !important;
                    display: inline-block !important;
                `;

                let showingOriginal = false;

                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showingOriginal = !showingOriginal;
                    if (showingOriginal) {
                        for (const pair of originalPairs) {
                            if (pair.node && pair.node.nodeValue) {
                                pair.node.nodeValue = pair.node.nodeValue.replace(pair.translatedText, pair.originalText);
                            }
                        }
                        badge.innerText = `[ORIGINAL ${srcLang}] `;
                        badge.style.color = '#FEE75C';
                        badge.style.background = 'rgba(254, 231, 92, 0.2)';
                    } else {
                        for (const pair of originalPairs) {
                            if (pair.node && pair.node.nodeValue) {
                                pair.node.nodeValue = pair.node.nodeValue.replace(pair.originalText, pair.translatedText);
                            }
                        }
                        badge.innerText = `[${srcLang} ➔ ${targetLang}] `;
                        badge.style.color = '#00AFF0';
                        badge.style.background = 'rgba(0, 175, 240, 0.15)';
                    }
                });

                el.insertBefore(badge, el.firstChild);
            }
        } else {
            delete el.dataset.autoTranslated;
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
            '[class*="embedTitle"]',
            '[class*="embedField"]',
            '[class*="embedFieldValue"]',
            '[class*="embedFieldName"]',
            '[class*="embedFooterText"]',
            '[class*="embedText"]',
            '[class*="embedFull"]',
            '[class*="topic-"]',
            '[class*="heading-"]',
            '[class*="description-"]'
        ];

        const elements = document.querySelectorAll(selectors.join(', '));
        for (const el of elements) {
            processMessageContainer(el);
        }
    }

    setInterval(scanAndTranslate, 500);
    scanAndTranslate();

    console.log(`[Discord Auto-Translator Container v8] Запуск завершен!`);
})();
