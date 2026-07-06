@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ============================================================
:: DAVictory - Windows Stop Script
:: Dừng tất cả services đang chạy
:: ============================================================

title DAVictory - Stop All Services
cls
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          DAVictory - Stop All Services              ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Dừng theo từng port
:: ============================================================

set "STOPPED=0"

:: KILL bằng window title (CMD cửa sổ)
echo [INFO] Dong cac cua so CMD cua DAVictory...
taskkill /FI "WINDOWTITLE eq DAVictory - *" /F >nul 2>&1
set /a STOPPED+=1

:: KILL theo port (fallback)
echo [INFO] Giai phong cac port...

for %%p in (8080 5173 5174 5181 5182 5186 5187 5184 5185) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr "LISTENING" 2^>nul') do (
        echo       → Port %%p: kill PID %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: ============================================================
:: Dừng Redis Docker (nếu có)
:: ============================================================
echo [INFO] Dung Redis (Docker)...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose -f "%~dp0docker-compose.yml" stop redis 2>nul
)

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         TAT CA SERVICES DA DUNG!                   ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Nhan phim bat ky de thoat...
pause >nul
