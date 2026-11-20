@echo off
title Discord Auto-Translator Fresh Installer

echo ====================================================
echo   Discord Auto-Translator Direct 1-Click Installer
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"

echo.
pause
