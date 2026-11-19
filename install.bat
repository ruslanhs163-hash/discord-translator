@echo off
chcp 65001 > nul
title Discord Auto-Translator Installer

echo ====================================================
echo   Discord Desktop Universal Auto-Translator Installer
echo ====================================================
echo.

node "%~dp0patchDiscordCore.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Запуск альтернативного метода установки...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
)

echo.
pause
