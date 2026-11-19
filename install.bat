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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
echo.
pause
exit /b

:UNINSTALL
echo.
echo Запуск удаления...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
echo.
pause
exit /b
