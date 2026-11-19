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
echo Closing Discord if running...
taskkill /F /IM Discord.exe 2>nul
timeout /t 1 /nobreak >nul

echo Patching Discord core...
node "%~dp0patchDiscordCore.js"
if %ERRORLEVEL% NEQ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
)

echo.
echo Launching Discord...
powershell -NoProfile -Command "Start-Process -FilePath '$env:LOCALAPPDATA\Discord\Update.exe' -ArgumentList '--processStart Discord.exe'"
echo.
pause
exit /b

:UNINSTALL
echo.
echo Closing Discord if running...
taskkill /F /IM Discord.exe 2>nul
timeout /t 1 /nobreak >nul

echo Restoring clean Discord core...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"

echo.
echo Launching Discord...
powershell -NoProfile -Command "Start-Process -FilePath '$env:LOCALAPPDATA\Discord\Update.exe' -ArgumentList '--processStart Discord.exe'"
echo.
pause
exit /b
