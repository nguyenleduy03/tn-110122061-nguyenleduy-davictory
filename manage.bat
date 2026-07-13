@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title DAVictory Manager
cd /d "%~dp0"

set COMPOSE_FILE=docker-compose.yml
set ENV_FILE=.env
set ENV_EXAMPLE=.env.example

:check_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [LOI] Docker Desktop chua chay! Xin hay mo Docker Desktop len.
    pause
    exit /b 1
)

:check_env
if not exist "%ENV_FILE%" (
    if exist "%ENV_EXAMPLE%" (
        echo.
        echo  [THONG BAO] Chua tim thay file .env
        echo  Dang tao tu .env.example ...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo  Da tao .env thanh cong. Hay mo file .env va dien key cua ban vao.
        echo.
        pause
    )
)

if "%1"=="" goto menu
goto %1

rem =========================== LENH CO BAN ===========================

:up
    docker compose -f "%COMPOSE_FILE%" up -d %2 %3 %4 %5
    if %errorlevel% equ 0 (
        echo  [OK] Da khoi dong thanh cong
    ) else (
        echo  [LOI] Khoi dong that bai
    )
    goto end

:down
    if "%2"=="" (
        docker compose -f "%COMPOSE_FILE%" down
    ) else (
        docker compose -f "%COMPOSE_FILE%" stop %2 %3
    )
    echo  [OK] Da dung
    goto end

:build
    docker compose -f "%COMPOSE_FILE%" up -d --build %2 %3 %4 %5
    if %errorlevel% equ 0 (
        echo  [OK] Da build va khoi dong thanh cong
    ) else (
        echo  [LOI] Build that bai
    )
    goto end

:start
    if "%2"=="" (
        docker compose -f "%COMPOSE_FILE%" up -d
    ) else (
        docker compose -f "%COMPOSE_FILE%" start %2 %3
    )
    echo  [OK] Da start
    goto end

:stop
    if "%2"=="" (
        docker compose -f "%COMPOSE_FILE%" stop
    ) else (
        docker compose -f "%COMPOSE_FILE%" stop %2 %3
    )
    echo  [OK] Da stop
    goto end

:restart
    if "%2"=="" (
        docker compose -f "%COMPOSE_FILE%" restart
    ) else (
        docker compose -f "%COMPOSE_FILE%" restart %2 %3
    )
    echo  [OK] Da restart
    goto end

:rebuild
    docker compose -f "%COMPOSE_FILE%" up -d --build %2 %3 %4 %5
    if %errorlevel% equ 0 (
        echo  [OK] Da build lai va khoi dong thanh cong
    ) else (
        echo  [LOI] Build that bai
    )
    goto end

:logs
    if "%2"=="" (
        docker compose -f "%COMPOSE_FILE%" logs --tail=50 -f
    ) else (
        docker compose -f "%COMPOSE_FILE%" logs --tail=50 -f %2 %3
    )
    goto end

:status
    echo.
    echo  ===== TRANG THAI CONTAINERS =====
    echo.
    docker compose -f "%COMPOSE_FILE%" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    goto end

:init
    if not exist "%ENV_EXAMPLE%" (
        echo  [LOI] Khong tim thay file .env.example
        goto end
    )
    if exist "%ENV_FILE%" (
        choice /c YN /m "File .env da ton tai. Ghi de?"
        if errorlevel 2 goto end
    )
    copy /Y "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
    echo  [OK] Da tao .env tu .env.example. Hay mo file va dien key cua ban.
    goto end

rem =========================== MENU TUONG TAC ===========================

:menu
cls
echo.
echo  ╔════════════════════════════════════════╗
echo  ║        DAVictory Service Manager       ║
echo  ║          (Docker - Windows)            ║
echo  ╚════════════════════════════════════════╝
echo.

:menu_status
echo  ----- TRANG THAI -----
for %%s in (mysql redis chromadb backend ai-writing-python ai-speaking-python ai-agent-python ai-import-python frontend) do (
    docker ps --format "{{.Names}}" --filter "name=%%s" | findstr /C:"%%s" >nul 2>&1
    if !errorlevel! equ 0 (
        echo    [DANG CHAY] %%s
    ) else (
        echo    [DA DUNG  ] %%s
    )
)
echo.

echo  ----- MENU -----
echo    [1] Khoi dong tat ca
echo    [2] Tat tat ca
echo    [3] Build lai + khoi dong
echo    [4] Khoi dong lai
echo    [5] Xem log
echo    [6] Trang thai
echo    [7] Tao file .env tu .env.example
echo.
echo    [S] Quan ly tung service
echo    [0] Thoat
echo.

choice /c 12345678S0 /n /m "Nhap lua chon: "
set KEY=%errorlevel%
echo.

if %KEY% equ 1  goto :menu_up_all
if %KEY% equ 2  goto :menu_down_all
if %KEY% equ 3  goto :menu_build_all
if %KEY% equ 4  goto :menu_restart_all
if %KEY% equ 5  goto :menu_logs
if %KEY% equ 6  call :status
if %KEY% equ 7  call :init
if %KEY% equ 8  goto :menu
if %KEY% equ 9  goto :menu_service
if %KEY% equ 10 exit /b 0

pause
goto menu

:menu_up_all
    call :up
    pause
    goto menu

:menu_down_all
    call :down
    pause
    goto menu

:menu_build_all
    call :build
    pause
    goto menu

:menu_restart_all
    call :restart
    pause
    goto menu

:menu_logs
    echo.
    set /p SERVICE="Nhap ten service (de trong de xem tat ca): "
    echo.
    call :logs "%SERVICE%"
    pause
    goto menu

rem =========================== MENU SERVICE ===========================

:menu_service
cls
echo.
echo  ----- QUAN LY TUNG SERVICE -----
echo.
echo  Service:
echo    [1] mysql            [5] ai-writing-python
echo    [2] redis            [6] ai-speaking-python
echo    [3] chromadb         [7] ai-agent-python
echo    [4] backend          [8] ai-import-python
echo                            [9] frontend
echo.
set /p SVC="Nhap ten service (1-9): "
if "%SVC%"=="" goto menu

set SERVICE_NAME=
if "%SVC%"=="1" set SERVICE_NAME=mysql
if "%SVC%"=="2" set SERVICE_NAME=redis
if "%SVC%"=="3" set SERVICE_NAME=chromadb
if "%SVC%"=="4" set SERVICE_NAME=backend
if "%SVC%"=="5" set SERVICE_NAME=ai-writing-python
if "%SVC%"=="6" set SERVICE_NAME=ai-speaking-python
if "%SVC%"=="7" set SERVICE_NAME=ai-agent-python
if "%SVC%"=="8" set SERVICE_NAME=ai-import-python
if "%SVC%"=="9" set SERVICE_NAME=frontend

if "%SERVICE_NAME%"=="" (
    echo  Khong hop le!
    pause
    goto menu_service
)

echo.
echo  ----- Thao tac voi %SERVICE_NAME% -----
echo    [1] Start
echo    [2] Stop
echo    [3] Restart
echo    [4] Build lai
echo    [5] Xem log
echo    [0] Quay lai
echo.
choice /c 123450 /n /m "Chon: "
set ACT=%errorlevel%

if %ACT% equ 1 call :start %SERVICE_NAME%
if %ACT% equ 2 call :stop %SERVICE_NAME%
if %ACT% equ 3 call :restart %SERVICE_NAME%
if %ACT% equ 4 call :rebuild %SERVICE_NAME%
if %ACT% equ 5 call :logs %SERVICE_NAME%
if %ACT% equ 6 goto menu

pause
goto menu_service

:end
if "%1"=="" pause
exit /b 0
