@echo off
chcp 65001 > nul
title Discord Auto-Translator Installer

echo ====================================================
echo   Discord Desktop Auto-Translator Installer
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"

echo.
pause
