@echo off
setlocal
cd /d "%~dp0"
color 0B
cls
echo ==============================================
echo  Discord Translator Easy
echo ==============================================
echo.
echo  1 - Install translator
echo  2 - Uninstall translator
echo  3 - Exit
echo.
choice /C 123 /N /M "Choose an action: "
if errorlevel 3 exit /b 0
if errorlevel 2 goto uninstall
goto install

:install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
echo.
pause
exit /b

:uninstall
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstaller.ps1"
echo.
pause
exit /b
