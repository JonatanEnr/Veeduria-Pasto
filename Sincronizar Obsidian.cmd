@echo off
rem Doble clic para traer las denuncias del mapa a las notas de Obsidian.
chcp 65001 >nul
cd /d "%~dp0"
call npm run obsidian
echo.
pause
