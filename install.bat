@echo off
chcp 65001 > nul
title Discord Auto-Translator Setup

echo ====================================================
echo   Discord Auto-Translator Setup (Установка / Удаление)
echo ====================================================
echo.
echo  [1] Установить / Обновить переводчик в Discord
echo  [2] Полностью удалить переводчик из Discord
echo.
set /p choice="Выберите действие (нажмите 1 или 2): "

if "%choice%"=="2" goto UNINSTALL
if "%choice%"=="1" goto INSTALL

:INSTALL
echo.
echo Запуск установки...
node "%~dp0patchDiscordCore.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Запуск альтернативного метода установки...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
)
echo.
echo ====================================================
echo [УСПЕХ] Процесс установки завершен!
echo Инструкция: Откройте Discord и нажмите Ctrl + R.
echo ====================================================
echo.
pause
exit /b

:UNINSTALL
echo.
echo Запуск удаления...
node "%~dp0uninstall.js"
echo.
echo ====================================================
echo [УСПЕХ] Переводчик успешно удален из Discord!
echo Инструкция: Откройте Discord и нажмите Ctrl + R.
echo ====================================================
echo.
pause
exit /b
