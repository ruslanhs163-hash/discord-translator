# 🌐 Discord Auto-Translator (Global Edition)

<p align="center">
  <img src="https://img.shields.io/badge/Discord-Desktop%20%26%20Web-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Support" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Chrome%20%7C%20Yandex-blue?style=for-the-badge&logo=windows&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/Performance-CPU%20%3C%200.1%25-brightgreen?style=for-the-badge" alt="Performance" />
  <img src="https://img.shields.io/badge/License-MIT-orange?style=for-the-badge" alt="License" />
</p>

> 🇷🇺 **RU:** Бесшовный автоматический переводчик входящих сообщений для Discord (Desktop и Browser). Мгновенно переводит чужие сообщения на ваш родной язык с кнопкой «ВКЛ/ВЫКЛ». CPU <0.1%.
> 
> 🇬🇧 **EN:** Seamless real-time auto-translator for Discord (Desktop & Web). Automatically translates incoming chat messages to your native language with ON/OFF toggle. CPU <0.1%.

---

## ✨ Ключевые возможности / Key Features

| Функция / Feature | Описание (RU) | Description (EN) |
|---|---|---|
| **🌐 Auto Translation** | Автоматический перевод входящих сообщений в реальном времени. | Real-time automatic translation of foreign incoming chat messages. |
| **🌍 Global Auto-Detect** | Автоматически определяет родной язык пользователя (RU, EN, FR, DE, ES, ZH и др.). | Auto-detects user native language (RU, EN, FR, DE, ES, ZH, etc.). |
| **🔘 ON/OFF Toggle** | Плавающая кнопка переключения перевода в 1 клик. | Floating toggle button for 1-click ON/OFF control. |
| **🔍 Interactive Badges** | Клик по значку `[RU]` отображает оригинальный текст сообщения. | Click on `[RU]` badge to toggle between original and translated text. |
| **⚡ 0ms Latency** | Мгновенный вывод из оперативной памяти благодаря пре-кэшированию. | Instant 0ms memory cache rendering. |
| **🔒 Native Outgoing** | Отправка ваших сообщений работает в 100% родном нативном режиме Discord. | Outgoing message sending remains 100% native with 0 delay. |

---

## 📊 Характеристики потребления железа / Hardware Performance

- ⚡ **CPU (Процессор):** **< 0.05%** (Сканирование DOM занимает всего ~0.02 мс).
- 💾 **RAM (Память):** **~ 2–4 МБ** (Легкий хэш-словарь фраз в оперативной памяти).
- 🌐 **Network (Сеть):** Запрос отправляется только для новых сообщений (~1 КБ), повторные выводятся из кэша за 0 мс.
- 🧹 **Self-Cleaning Cache:** Кэш памяти автоматически очищается при достижении 3000 фраз или перезапуске приложения.

---

## 🚀 Быстрая установка / Quick Installation

### 🖥️ Вариант 1: Для официального Discord Desktop (Windows)

1. Скачайте файлы репозитория.
2. Запустите файл **`install.bat`** (двойным кликом).
3. Откройте приложение Discord на ПК и нажмите **`Ctrl + R`** (для перезагрузки интерфейса).
4. Вверху справа появится плашка **`🌐 Translate: ON`** — все входящие сообщения переводятся автоматически!

---

### 🌐 Вариант 2: Для браузеров (Chrome / Яндекс Браузер / Edge / Opera)

1. Откройте в браузере страницу расширений: `chrome://extensions/` или `browser://extensions/`.
2. Включите **«Режим разработчика»** (тумблер справа вверху).
3. Нажмите **«Загрузить распакованное расширение»** (Load unpacked).
4. Укажите папку **`chrome-extension/`** из этого репозитория.
5. Откройте веб-версию [discord.com/app](https://discord.com/app) — готово!

---

## 🛠️ Архитектура проекта / Repository Structure

```text
discord-translator/
├── README.md               # Документация и руководство пользователя
├── install.bat             # Однокликовый инсталлятор для Windows
├── patchDiscordCore.js     # Нативный авто-сканер и патчер ядра Discord (core.asar)
├── discordTranslatorVencord.js # Международный плагин перевода с плавающей кнопкой
├── chrome-extension/       # Браузерное расширение (Manifest V3)
│   ├── manifest.json
│   ├── background.js
│   └── content.js
└── .gitignore              # Исключения временных файлов
```

---

## 📄 Лицензия / License

Распространяется по свободной лицензии **MIT License**. Свободно для использования и модификации.
