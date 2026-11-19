@echo off
chcp 65001 > nul
title Мастер установки и удаления Переводчика Discord

echo ====================================================
echo   Discord Auto-Translator Setup / Uninstaller
echo ====================================================
echo.
echo  [1] Установить / Обновить переводчик
echo  [2] Полностью удалить переводчик из Discord
echo.
set /p choice="Выберите действие (1 или 2): "

if "%choice%"=="2" (
    echo.
    echo Запуск удаления...
    node "%~dp0uninstall.js"
    echo.
    pause
    exit /b
)

echo.
echo Запуск установки...
node "%~dp0patchDiscordCore.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Запуск альтернативного метода установки...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
)

echo.
pause
