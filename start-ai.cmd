@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scripts\prepare-ai.mjs
if errorlevel 1 exit /b 1
node scripts\build.mjs
if errorlevel 1 exit /b 1
set "ENABLE_LIVE_AI=1"
if not defined PREVIEW_PORT set "PREVIEW_PORT=8791"
node scripts\preview.mjs
