// Content Script for Chrome/Yandex/Edge Extension
(function() {
    'use strict';

    if (window.__DISCORD_TRANSLATOR_EXT_ACTIVE__) return;
    window.__DISCORD_TRANSLATOR_EXT_ACTIVE__ = true;

    console.log('[Discord Translator Extension] Расширение успешно загружено!');

    let isEnabled = localStorage.getItem('discord_translator_enabled') !== 'false';
    const cache = new Map();

    function isRussianText(text) {
        if (!text || typeof text !== 'string') return false;
        const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
        const letterMatches = text.match(/[a-zA-Z\u0400-\u04FF]/g) || [];
        if (letterMatches.length === 0) return true;
        return (cyrillicMatches.length / letterMatches.length) > 0.3;
    }

    function requestTranslation(text, target = 'ru', source = 'auto') {
        if (!text || !text.trim()) return Promise.resolve(text);
        const key = `${source}:${target}:${text}`;
        if (cache.has(key)) return Promise.resolve(cache.get(key));

        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'TRANSLATE_TEXT', text, target, source }, (response) => {
                const res = (response && response.translatedText) ? response.translatedText : text;
                cache.set(key, res);
                resolve(res);
            });
        });
    }

    function renderFloatingButton() {
        let btn = document.getElementById('discord-translator-floating-btn');
        if (!btn) {
            btn = document.createElement('div');
            btn.id = 'discord-translator-floating-btn';
            btn.title = 'Кликните для включения/выключения авто-переводчика';
            btn.style.cssText = `
                position: fixed;
                top: 12px;
                right: 240px;
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-family: system-ui, -apple-system, sans-serif;
                font-weight: bold;
                cursor: pointer;
                user-select: none;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                transition: all 0.2s ease;
            `;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isEnabled = !isEnabled;
                localStorage.setItem('discord_translator_enabled', isEnabled ? 'true' : 'false');
                updateBtnState();
            });

            document.body.appendChild(btn);
        }

        function updateBtnState() {
            if (isEnabled) {
                btn.innerText = '🌐 Перевод: ВКЛ';
                btn.style.background = '#2D7D46';
                btn.style.color = '#FFFFFF';
                btn.style.border = '1px solid #3BA55C';
            } else {
                btn.innerText = '🌐 Перевод: ВЫКЛ';
                btn.style.background = '#C03537';
                btn.style.color = '#FFFFFF';
                btn.style.border = '1px solid #ED4245';
            }
        }

        updateBtnState();
    }

    async function processElement(el) {
        if (!isEnabled) return;
        if (!el || el.dataset.autoTranslated) return;

        if (el.getAttribute('contenteditable') === 'true' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;

        const originalText = el.innerText ? el.innerText.trim() : '';
        if (!originalText || isRussianText(originalText)) {
            el.dataset.autoTranslated = 'skip';
            return;
        }

        el.dataset.autoTranslated = 'processing';

        try {
            const translatedText = await requestTranslation(originalText, 'ru', 'auto');
            if (translatedText && translatedText !== originalText) {
                el.dataset.originalText = originalText;
                el.dataset.translatedText = translatedText;

                const badge = document.createElement('span');
                badge.innerText = 'RU';
                badge.title = 'Кликните, чтобы показать оригинал';
                badge.style.cssText = 'background: rgba(88, 101, 242, 0.3); color: #5865F2; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 6px; cursor: pointer; user-select: none; font-weight: bold; display: inline-block; vertical-align: middle;';

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
                    badge.innerText = showingOriginal ? 'ORIGINAL' : 'RU';
                    badge.style.color = showingOriginal ? '#faa81a' : '#5865F2';
                });

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

    document.addEventListener('keydown', async (e) => {
        if (!isEnabled) return;
        if (e.key !== 'Enter' || e.shiftKey) return;

        const activeEl = document.activeElement;
        if (!activeEl || !activeEl.matches('[role="textbox"]')) return;

        const text = activeEl.innerText ? activeEl.innerText.trim() : '';
        if (!text || !isRussianText(text)) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            const translated = await requestTranslation(text, 'en', 'ru');
            activeEl.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, translated);

            setTimeout(() => {
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
                });
                activeEl.dispatchEvent(enterEvent);
            }, 50);
        } catch (err) {}
    }, true);

    setInterval(scanAndTranslate, 800);
    scanAndTranslate();
})();
