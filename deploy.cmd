@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
if not defined NODE_EXE (
  echo 请先安装 Node.js 22 或更新版本，再运行此文件。
  pause
  exit /b 1
)
for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
set "NPM_CLI=%NODE_DIR%node_modules\npm\bin\npm-cli.js"
if not exist "%NPM_CLI%" (
  echo 未找到 Node.js 配套的 npm，请修复 Node.js 安装。
  pause
  exit /b 1
)
"%NODE_EXE%" "%NPM_CLI%" install
if errorlevel 1 goto failed
"%NODE_EXE%" scripts\build.mjs
if errorlevel 1 goto failed
"%NODE_EXE%" node_modules\wrangler\bin\wrangler.js d1 migrations apply life-coordinate-db --remote
if errorlevel 1 goto failed
"%NODE_EXE%" node_modules\wrangler\bin\wrangler.js deploy
if errorlevel 1 goto failed
echo 人生坐标更新完成。线上 API Secret 会保留。
pause
exit /b 0
:failed
echo 部署尚未完成，请检查上方提示。若授权过期，先运行 node node_modules\wrangler\bin\wrangler.js login。
pause
exit /b 1
