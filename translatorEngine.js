/**
 * Discord Desktop Auto-Translator Engine
 * Модуль автоматического перевода с поддержкой кэширования и авто-определения языка.
 */

class TranslatorEngine {
    constructor() {
        this.cache = new Map();
        this.targetLang = 'ru'; // Язык, на который переводим входящие сообщения
        this.defaultOutgoingLang = 'en'; // Язык, на который переводим исходящие сообщения
    }

    /**
     * Определение, нужно ли переводить входящее сообщение
     * @param {string} text
     * @returns {boolean}
     */
    isRussianText(text) {
        if (!text || typeof text !== 'string') return false;
        // Проверка на наличие кириллицы (более 30% текста)
        const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
        const letterMatches = text.match(/[a-zA-Z\u0400-\u04FF]/g) || [];
        if (letterMatches.length === 0) return true; // если цифры/эмодзи
        return (cyrillicMatches.length / letterMatches.length) > 0.3;
    }

    /**
     * Выполнение запроса на перевод через бесплатный Google Translate API
     * @param {string} text Текст для перевода
     * @param {string} target  Целевой язык ('ru', 'en', etc.)
     * @param {string} source Исходный язык ('auto' по умолчанию)
     * @returns {Promise<{translatedText: string, detectedSourceLang: string}>}
     */
    async translate(text, target = this.targetLang, source = 'auto') {
        if (!text || !text.trim()) return { translatedText: text, detectedSourceLang: source };

        const cacheKey = `${source}:${target}:${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();

            let translatedText = '';
            if (data && data[0]) {
                for (const sentence of data[0]) {
                    if (sentence && sentence[0]) {
                        translatedText += sentence[0];
                    }
                }
            }

            const detectedSourceLang = data && data[2] ? data[2] : source;
            const result = {
                translatedText: translatedText || text,
                detectedSourceLang: detectedSourceLang
            };

            // Кэшируем результат
            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[TranslatorEngine] Ошибка перевода:', error);
            return { translatedText: text, detectedSourceLang: source };
        }
    }

    /**
     * Перевод входящего сообщения (с иностранного на русский)
     * @param {string} text
     * @returns {Promise<string>}
     */
    async translateIncoming(text) {
        if (this.isRussianText(text)) {
            return text; // Уже на русском
        }
        const res = await this.translate(text, this.targetLang, 'auto');
        return res.translatedText;
    }

    /**
     * Перевод исходящего сообщения (с русского на английский/целевой)
     * @param {string} text
     * @param {string} targetLang
     * @returns {Promise<string>}
     */
    async translateOutgoing(text, targetLang = this.defaultOutgoingLang) {
        if (!this.isRussianText(text)) {
            return text; // Уже не на русском
        }
        const res = await this.translate(text, targetLang, 'ru');
        return res.translatedText;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslatorEngine;
} else {
    window.TranslatorEngine = TranslatorEngine;
}
