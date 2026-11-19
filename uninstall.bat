@echo off
chcp 65001 > nul
title Удаление Переводчика Discord

echo ====================================================
echo   Удаление Авто-Переводчика из Discord Desktop
echo ====================================================
echo.

node "%~dp0uninstall.js"

echo.
pause
