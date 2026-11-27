@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
    echo.
    echo WayQuant did not start. See the error above and .verification-start logs.
    pause
    exit /b 1
)
exit /b 0
