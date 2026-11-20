@echo off
title Discord Auto-Translator Fresh Uninstaller

echo ====================================================
echo   Discord Auto-Translator Direct 1-Click Uninstaller
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"

echo.
pause
