@echo off
cd /d "%~dp0"
node scripts\test.mjs
exit /b %errorlevel%
