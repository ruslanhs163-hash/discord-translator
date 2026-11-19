const TranslatorEngine = require('./translatorEngine.js');

async function test() {
    console.log('--- Тестирование TranslatorEngine ---');
    const engine = new TranslatorEngine();

    // Тест 1: Определение языка
    console.log('Is "Hello world" Russian?:', engine.isRussianText('Hello world'));
    console.log('Is "Привет мир" Russian?:', engine.isRussianText('Привет мир'));

    // Тест 2: Перевод входящего сообщения (с английского на русский)
    const incomingTest = await engine.translateIncoming('Hello my friend, welcome to the server!');
    console.log('Входящее (EN -> RU):', incomingTest);

    // Тест 3: Перевод исходящего сообщения (с русского на английский)
    const outgoingTest = await engine.translateOutgoing('Спасибо, рад присоединиться к сообществу!');
    console.log('Исходящее (RU -> EN):', outgoingTest);

    console.log('--- Тест завершен успешно ---');
}

test().catch(err => {
    console.error('Ошибка в тесте:', err);
    process.exit(1);
});
