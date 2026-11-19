@echo off
title Discord Auto-Translator Setup

echo ====================================================
echo   Discord Auto-Translator Setup
echo ====================================================
echo.
echo  [1] Install / Update Translator
echo  [2] Uninstall Translator
echo.
set /p choice="Enter option (1 or 2): "

if "%choice%"=="2" goto UNINSTALL
goto INSTALL

:INSTALL
echo.
echo Running installation...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
echo.
pause
exit /b

:UNINSTALL
echo.
echo Running uninstallation...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
echo.
pause
exit /b
