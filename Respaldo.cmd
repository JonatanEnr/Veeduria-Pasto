@echo off
rem Doble clic para hacer una copia de seguridad completa (datos + fotos).
chcp 65001 >nul
cd /d "%~dp0"
call npm run respaldo
echo.
pause
