/**
 * Discord Desktop Auto-Translator Plugin (Seamless UI Edition)
 * Автоматический переводчик для десктопной версии Discord на Windows.
 */

(function () {
    'use strict';

    // Подгрузка движка перевода
    const engine = new (window.TranslatorEngine || class {
        async translateIncoming(t) { return t; }
        async translateOutgoing(t) { return t; }
        isRussianText(t) { return true; }
    })();

    console.log('[Discord Auto-Translator] Плагин успешно загружен');

    // Настройки плагина
    const config = {
        autoTranslateIncoming: true,
        autoTranslateOutgoing: true,
        badgeStyle: 'background: rgba(88, 101, 242, 0.2); color: #5865F2; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 6px; cursor: pointer; user-select: none;'
    };

    /**
     * Обработка DOM элементов входящих сообщений
     */
    async function processMessageNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

        // Поиск текстового содержимого сообщения Discord
        const messageContents = node.querySelectorAll ? node.querySelectorAll('[class*="messageContent"]') : [];

        for (const contentEl of messageContents) {
            if (contentEl.dataset.autoTranslated) continue;

            const originalText = contentEl.innerText.trim();
            if (!originalText || engine.isRussianText(originalText)) {
                contentEl.dataset.autoTranslated = 'skip';
                continue;
            }

            contentEl.dataset.autoTranslated = 'processing';

            try {
                const translatedText = await engine.translateIncoming(originalText);
                if (translatedText && translatedText !== originalText) {
                    contentEl.dataset.originalText = originalText;
                    contentEl.dataset.translatedText = translatedText;

                    // Создание значка [RU]
                    const badge = document.createElement('span');
                    badge.innerText = 'RU';
                    badge.title = 'Кликните, чтобы показать оригинал';
                    badge.style.cssText = config.badgeStyle;

                    let showingOriginal = false;

                    badge.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showingOriginal = !showingOriginal;
                        contentEl.childNodes[0].nodeValue = showingOriginal ? originalText : translatedText;
                        badge.innerText = showingOriginal ? 'ORIGINAL' : 'RU';
                        badge.style.color = showingOriginal ? '#faa81a' : '#5865F2';
                    });

                    // Вставка переведенного текста
                    contentEl.innerHTML = '';
                    contentEl.appendChild(document.createTextNode(translatedText + ' '));
                    contentEl.appendChild(badge);

                    contentEl.dataset.autoTranslated = 'true';
                }
            } catch (err) {
                console.error('[Discord Auto-Translator] Ошибка перевода сообщения:', err);
                contentEl.dataset.autoTranslated = 'error';
            }
        }
    }

    /**
     * Наблюдатель изменения DOM (Мутации чата Discord)
     */
    function startDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const addedNode of mutation.addedNodes) {
                    processMessageNode(addedNode);
                }
            }
        });

        const targetNode = document.querySelector('#app-mount') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
        console.log('[Discord Auto-Translator] Наблюдатель DOM чата активен');
    }

    /**
     * Перехват ввода в поле текста Discord (Исходящий авто-перевод)
     */
    function setupOutgoingInterceptor() {
        document.addEventListener('keydown', async (e) => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            if (!config.autoTranslateOutgoing) return;

            const activeEl = document.activeElement;
            if (!activeEl || !activeEl.matches('[role="textbox"]')) return;

            const text = activeEl.innerText.trim();
            if (!text || !engine.isRussianText(text)) return; // Уже на английском или пустой

            // Переводим только если текст на русском
            e.preventDefault();
            e.stopPropagation();

            try {
                const translated = await engine.translateOutgoing(text);

                // Вставка переведенного текста в редактор Slate Discord
                activeEl.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, translated);

                // Имитируем нажатие Enter для отправки
                setTimeout(() => {
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    activeEl.dispatchEvent(enterEvent);
                }, 50);
            } catch (err) {
                console.error('[Discord Auto-Translator] Ошибка перевода исходящего сообщения:', err);
            }
        }, true);
    }

    // Инициализация при старте
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        startDOMObserver();
        setupOutgoingInterceptor();
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            startDOMObserver();
            setupOutgoingInterceptor();
        });
    }

})();
