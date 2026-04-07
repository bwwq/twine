@echo off
chcp 65001 >nul
title Twine Freebird Dev Server

echo.
echo   ╔══════════════════════════════════╗
echo   ║   Twine · Freebird 定制版        ║
echo   ╚══════════════════════════════════╝
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [!] 未检测到 Node.js，请先安装: https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo   [*] 首次运行，安装依赖...
    call npm install
    echo.
)

echo   [*] 启动开发服务器...
echo   [*] 打开浏览器访问下方地址即可
echo.

npx vite --host --open
