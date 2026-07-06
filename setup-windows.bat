@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ============================================================
::  DAVictory - Windows Auto Setup Script (NÂNG CẤP)
::  Tự động kiểm tra và cài đặt toàn bộ phần mềm cần thiết
::  Yêu cầu: Windows 10 (build 1809+) hoặc Windows 11
::  Chạy với quyền Administrator để cài phần mềm tự động
:: ============================================================

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  =====================================================
    echo   Yeu cau quyen Administrator de cai phan mem!
    echo   Nhan OK de chay lai voi quyen Administrator...
    echo  =====================================================
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title DAVictory Setup
cls
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║       DAVictory - Windows Auto Setup v2.0            ║
echo  ║   Tu dong cai dat moi truong & thu vien              ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo  [INFO] Duong dan du an: %ROOT_DIR%
echo.

:: ============================================================
:: Biến theo dõi trạng thái
:: ============================================================
set "NEED_RESTART=0"
set "JAVA_OK=0"
set "PYTHON_OK=0"
set "NODE_OK=0"
set "MYSQL_OK=0"
set "TESS_OK=0"
set "WINGET_OK=0"
set "DB_PASS="

:: ============================================================
:: BƯỚC 0: Kiểm tra winget
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 0: Kiem tra Windows Package Manager
echo  ══════════════════════════════════════════
winget --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('winget --version 2^>^&1') do echo  [OK]  winget: %%v
    set "WINGET_OK=1"
) else (
    echo  [WARN] winget chua san sang.
    echo         Windows 10 phien ban cu co the chua co winget.
    echo         Se huong dan cai thu cong neu can thiet.
)
echo.

:: ============================================================
:: BƯỚC 1: Kiểm tra / Cài Java 21
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 1: Kiem tra Java JDK 21
echo  ══════════════════════════════════════════

call :check_java
if "!JAVA_OK!"=="1" goto :java_done

echo  [INFO] Java 21 chua duoc cai dat. Dang cai tu dong...

if "!WINGET_OK!"=="1" (
    echo  [INFO] Dang tai JDK 21 qua winget (co the mat 3-5 phut)...
    winget install --id EclipseAdoptium.Temurin.21.JDK -e --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 (
        echo  [OK]  JDK 21 da cai xong!
        set "NEED_RESTART=1"
        :: Cập nhật PATH trong session hiện tại
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21"
        if not exist "!JAVA_HOME!" (
            for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk-21*") do set "JAVA_HOME=%%d"
        )
        set "PATH=!JAVA_HOME!\bin;!PATH!"
        call :check_java
    ) else (
        echo  [ERROR] Cai Java tu dong that bai!
        echo.
        echo  Vui long cai thu cong:
        echo  1. Truy cap: https://adoptium.net/temurin/releases/?version=21
        echo  2. Tai file .msi cho Windows x64
        echo  3. Cai dat va chay lai script nay
        echo.
        pause
        exit /b 1
    )
) else (
    echo  [ERROR] Khong co winget. Cai Java thu cong:
    echo  → Truy cap: https://adoptium.net/temurin/releases/?version=21
    echo  → Tai file .msi cho Windows x64, cai dat, roi chay lai script nay.
    start https://adoptium.net/temurin/releases/?version=21
    pause
    exit /b 1
)

:java_done
echo.

:: ============================================================
:: BƯỚC 2: Kiểm tra / Cài Python 3.11+
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 2: Kiem tra Python 3.11+
echo  ══════════════════════════════════════════

call :check_python
if "!PYTHON_OK!"=="1" goto :python_done

echo  [INFO] Python 3.11+ chua duoc cai dat. Dang cai tu dong...

if "!WINGET_OK!"=="1" (
    echo  [INFO] Dang tai Python 3.12 qua winget...
    winget install --id Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 (
        echo  [OK]  Python 3.12 da cai xong!
        set "NEED_RESTART=1"
        :: Tìm Python mới cài
        for /f "tokens=*" %%p in ('where python 2^>nul') do (
            set "PYTHON_PATH=%%p"
            goto :found_python_winget
        )
        :: Thêm path thường gặp
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;!PATH!"
        :found_python_winget
        call :check_python
    ) else (
        echo  [ERROR] Cai Python tu dong that bai!
        echo  → Truy cap: https://www.python.org/downloads/
        echo  → Tai Python 3.11+ cho Windows, TICH chon "Add Python to PATH"!
        start https://www.python.org/downloads/
        pause
        exit /b 1
    )
) else (
    echo  [ERROR] Khong co winget. Cai Python thu cong:
    echo  → Truy cap: https://www.python.org/downloads/
    echo  → QUAN TRONG: Tich chon "Add Python to PATH" khi cai!
    start https://www.python.org/downloads/
    pause
    exit /b 1
)

:python_done
echo.

:: ============================================================
:: BƯỚC 3: Kiểm tra / Cài Node.js LTS
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 3: Kiem tra Node.js LTS
echo  ══════════════════════════════════════════

call :check_node
if "!NODE_OK!"=="1" goto :node_done

echo  [INFO] Node.js chua duoc cai dat. Dang cai tu dong...

if "!WINGET_OK!"=="1" (
    echo  [INFO] Dang tai Node.js LTS qua winget...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 (
        echo  [OK]  Node.js LTS da cai xong!
        set "NEED_RESTART=1"
        set "PATH=C:\Program Files\nodejs;!PATH!"
        call :check_node
    ) else (
        echo  [ERROR] Cai Node.js tu dong that bai!
        echo  → Truy cap: https://nodejs.org/ va tai LTS
        start https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo  [ERROR] Khong co winget. Cai Node.js thu cong:
    echo  → Truy cap: https://nodejs.org/ va tai phien ban LTS
    start https://nodejs.org/
    pause
    exit /b 1
)

:node_done
echo.

:: ============================================================
:: BƯỚC 4: Kiểm tra / Cài MySQL
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 4: Kiem tra MySQL
echo  ══════════════════════════════════════════

:: Kiểm tra MySQL service hoặc lệnh mysql
sc query MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK]  MySQL service (MySQL80) dang chay
    set "MYSQL_OK=1"
    goto :mysql_done
)
sc query MySQL >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK]  MySQL service dang chay
    set "MYSQL_OK=1"
    goto :mysql_done
)
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK]  MySQL (CLI) tim thay
    set "MYSQL_OK=1"
    goto :mysql_done
)

echo  [WARN] Khong phat hien MySQL.

if "!WINGET_OK!"=="1" (
    echo  [INFO] Dang cai MySQL 8.0 qua winget...
    echo  [NOTE] MySQL can dat mat khau root khi cai - ghi nho mat khau nay!
    echo.
    winget install --id Oracle.MySQL -e --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 (
        echo  [OK]  MySQL da cai xong!
        echo  [NOTE] Neu MySQL yeu cau cau hinh, hay chay MySQL Configurator
        set "NEED_RESTART=1"
        set "MYSQL_OK=1"
    ) else (
        echo  [WARN] Cai MySQL tu dong khong thanh cong.
        echo         MySQL Installer phuc tap hon - nen cai thu cong.
        goto :mysql_manual
    )
) else (
    :mysql_manual
    echo.
    echo  Cai MySQL thu cong:
    echo  1. Tai MySQL Installer: https://dev.mysql.com/downloads/installer/
    echo  2. Chon "mysql-installer-community" (full)
    echo  3. Cai MySQL Server 8.0
    echo  4. Dat mat khau root khi duoc hoi
    echo  5. Chay lai script nay
    echo.
    set /p "CONTINUE_NO_MYSQL=Tiep tuc ma khong co MySQL? (y/n): "
    if /i "!CONTINUE_NO_MYSQL!" neq "y" (
        start https://dev.mysql.com/downloads/installer/
        pause
        exit /b 1
    )
)

:mysql_done
echo.

:: ============================================================
:: BƯỚC 5: Kiểm tra / Cài Tesseract OCR
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 5: Kiem tra Tesseract OCR
echo  ══════════════════════════════════════════

where tesseract >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%v in ('tesseract --version 2^>^&1 ^| findstr /i "tesseract"') do echo  [OK]  Tesseract: %%v
    set "TESS_OK=1"
    goto :tess_done
)
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo  [OK]  Tesseract tim thay tai: C:\Program Files\Tesseract-OCR\
    set "TESS_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe"
    set "PATH=C:\Program Files\Tesseract-OCR;!PATH!"
    set "TESS_OK=1"
    goto :tess_done
)

echo  [INFO] Tesseract OCR chua duoc cai. Dang cai tu dong...

if "!WINGET_OK!"=="1" (
    winget install --id UB-Mannheim.TesseractOCR -e --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 (
        echo  [OK]  Tesseract da cai xong!
        set "PATH=C:\Program Files\Tesseract-OCR;!PATH!"
        set "TESS_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe"
        set "NEED_RESTART=1"
        set "TESS_OK=1"
    ) else (
        echo  [WARN] Cai Tesseract that bai - ai-import co the bi loi khi xu ly PDF anh.
        set "TESS_CMD=tesseract"
    )
) else (
    echo  [WARN] Khong the tu dong cai Tesseract.
    echo         Tai tai: https://github.com/UB-Mannheim/tesseract/wiki
    echo         ai-import se bi loi khi xu ly PDF co anh.
    set "TESS_CMD=tesseract"
)

:tess_done
if not defined TESS_CMD set "TESS_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe"
echo.

:: ============================================================
:: BƯỚC 5.5: Kiểm tra Docker Desktop (Redis + ChromaDB)
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 5.5: Kiem tra Docker Desktop
echo  ══════════════════════════════════════════

where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK]  Docker tim thay
    set "DOCKER_OK=1"
) else (
    echo  [WARN] Docker Desktop chua duoc cai dat.
    echo         Redis va ChromaDB can Docker de hoat dong.
    echo.
    echo  Cai Docker Desktop:
    echo  1. Tai tu: https://www.docker.com/products/docker-desktop/
    echo  2. Cai dat va khoi dong Docker Desktop
    echo  3. Chay lai script nay
    echo.
    set /p "CONTINUE_NO_DOCKER=Tiep tuc ma khong co Docker? (y/n): "
    if /i "!CONTINUE_NO_DOCKER!" neq "y" (
        start https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
    )
    set "DOCKER_OK=0"
)
echo.

:: ============================================================
:: Nhập thông tin cấu hình từ người dùng
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 6: Nhap thong tin cau hinh
echo  ══════════════════════════════════════════
echo.
echo  Nhap thong tin de tu dong tao file .env
echo  (Nhan Enter de bo qua, co the dien sau)
echo.

set /p "DB_PASS=  Mat khau MySQL (root): "
echo.
set /p "JWT_SECRET=  JWT Secret (Enter de dung mac dinh [DAVictorySecretKey2026]): "
echo.
set /p "GROQ_KEY=  GROQ API Key (lay mien phi tai console.groq.com): "
echo.
set /p "NVIDIA_KEY=  NVIDIA API Key (tuy chon, de trong neu khong co): "
echo.
set /p "OPENAI_KEY=  OpenAI API Key (tuy chon, chi can cho Speaking): "
echo.

:: ============================================================
:: BƯỚC 7: Tạo database MySQL (nếu có thông tin)
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 7: Tao database MySQL
echo  ══════════════════════════════════════════

if "!MYSQL_OK!"=="1" if defined DB_PASS if not "!DB_PASS!"=="" (
    echo  [INFO] Dang tao database DAVictory...
    mysql -u root -p!DB_PASS! -e "CREATE DATABASE IF NOT EXISTS DAVictory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if !errorlevel! equ 0 (
        echo  [OK]  Database DAVictory san sang!
    ) else (
        echo  [WARN] Khong the tu dong tao database.
        echo         Co the mat khau sai hoac MySQL chua chay.
        echo         Tu tao bang lenh: CREATE DATABASE DAVictory;
    )
) else (
    echo  [SKIP] Bo qua (khong co thong tin MySQL hoac MySQL chua cai)
)
echo.

:: ============================================================
:: BƯỚC 8: Cập nhật application.yaml (backend)
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 8: Cau hinh Backend
echo  ══════════════════════════════════════════

set "APP_YAML=%ROOT_DIR%\backend\src\main\resources\application.yaml"
if exist "!APP_YAML!" (
    if defined DB_PASS if not "!DB_PASS!"=="" (
        :: Dùng PowerShell để thay thế chuỗi trong file yaml
        powershell -Command "(Get-Content '!APP_YAML!') -replace '\$\{DB_PASSWORD:[^}]*\}', '!DB_PASS!' | Set-Content '!APP_YAML!'"
        echo  [OK]  application.yaml da cap nhat mat khau DB
    ) else (
        echo  [SKIP] Bo qua cap nhat application.yaml (khong co mat khau)
        echo         → Tu sua trong: backend\src\main\resources\application.yaml
        echo           password: $^{DB_PASSWORD:MAT_KHAU_CUA_BAN^}
    )
    if defined JWT_SECRET if not "!JWT_SECRET!"=="" (
        powershell -Command "(Get-Content '!APP_YAML!') -replace '\$\{JWT_SECRET:[^}]*\}', '!JWT_SECRET!' | Set-Content '!APP_YAML!'"
        echo  [OK]  application.yaml da cap nhat JWT_SECRET
    ) else (
        echo  [INFO] JWT_SECRET dung mac dinh: DAVictorySecretKey2026
    )
) else (
    echo  [WARN] Khong tim thay application.yaml
)
echo.

:: ============================================================
:: BƯỚC 9: Setup 4 Python AI Services
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 9: Cai dat Python AI Services
echo  ══════════════════════════════════════════

:: ----- ai-agent-python -----
echo.
echo  [9.1] ai-agent-python (port 5187)...
cd /d "%ROOT_DIR%\ai-agent-python"

if not exist ".venv" (
    echo       → Tao virtual environment...
    python -m venv .venv
)
echo       → Cai packages (co the mat 2-3 phut)...
call .venv\Scripts\pip.exe install -e . -q --no-warn-script-location
if %errorlevel% neq 0 (
    echo  [WARN] Co goi bi loi, thu lai...
    call .venv\Scripts\pip.exe install -e . --no-warn-script-location
)

:: Tạo .env
if not exist ".env" copy ".env.example" ".env" >nul 2>&1
call :write_env ".env" "DB_PASSWORD" "!DB_PASS!"
call :write_env ".env" "GROQ_API_KEY" "!GROQ_KEY!"
call :write_env ".env" "NVIDIA_API_KEY" "!NVIDIA_KEY!"
call :write_env ".env" "HOST" "0.0.0.0"
call :write_env ".env" "PORT" "5187"
call :write_env ".env" "REDIS_URL" "redis://localhost:6379/0"
echo  [OK]  ai-agent-python xong

:: ----- ai-speaking-python -----
echo.
echo  [9.2] ai-speaking-python (port 5181)...
cd /d "%ROOT_DIR%\ai-speaking-python"

if not exist ".venv" (
    if not exist "venv" (
        echo       → Tao virtual environment...
        python -m venv .venv
    )
)
set "SPEAKING_PIP=.venv\Scripts\pip.exe"
if not exist ".venv\Scripts\pip.exe" set "SPEAKING_PIP=venv\Scripts\pip.exe"

echo       → Cai packages...
call !SPEAKING_PIP! install -e . -q --no-warn-script-location
if not exist ".env" copy ".env.example" ".env" >nul 2>&1
call :write_env ".env" "DB_PASSWORD" "!DB_PASS!"
call :write_env ".env" "GROQ_API_KEY" "!GROQ_KEY!"
call :write_env ".env" "OPENAI_API_KEY" "!OPENAI_KEY!"
echo  [OK]  ai-speaking-python xong

:: ----- ai-writing-python -----
echo.
echo  [9.3] ai-writing-python (port 5182)...
cd /d "%ROOT_DIR%\ai-writing-python"

if not exist ".venv" (
    echo       → Tao virtual environment...
    python -m venv .venv
)
echo       → Cai packages...
call .venv\Scripts\pip.exe install -e . -q --no-warn-script-location
if not exist ".env" copy ".env.example" ".env" >nul 2>&1
call :write_env ".env" "DB_PASSWORD" "!DB_PASS!"
call :write_env ".env" "GROQ_API_KEY" "!GROQ_KEY!"
echo  [OK]  ai-writing-python xong

:: ----- ai-import-python -----
echo.
echo  [9.4] ai-import-python (port 5186)...
cd /d "%ROOT_DIR%\ai-import-python"

if not exist ".venv" (
    echo       → Tao virtual environment...
    python -m venv .venv
)
echo       → Cai packages...
call .venv\Scripts\pip.exe install -e . -q --no-warn-script-location
if not exist ".env" copy ".env.example" ".env" >nul 2>&1
call :write_env ".env" "GROQ_API_KEY" "!GROQ_KEY!"
call :write_env ".env" "TESSERACT_CMD" "!TESS_CMD!"
call :write_env ".env" "BACKEND_URL" "http://localhost:8080"
echo  [OK]  ai-import-python xong

echo.

:: ============================================================
:: BƯỚC 10: Setup Frontend
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 10: Setup Frontend
echo  ══════════════════════════════════════════
cd /d "%ROOT_DIR%\frontend"

echo  [INFO] npm install...
call npm install --prefer-offline 2>nul
if %errorlevel% neq 0 call npm install
echo  [INFO] npm run build...
call npm run build
if %errorlevel% equ 0 (
    echo  [OK]  Frontend build thanh cong!
) else (
    echo  [WARN] Build that bai. Se dung dev mode khi chay.
)
echo.

:: ============================================================
:: BƯỚC 11: Setup AI Test Frontend
:: ============================================================
echo  ══════════════════════════════════════════
echo   BUOC 11: Setup AI Test Frontend
echo  ══════════════════════════════════════════
if exist "%ROOT_DIR%\ai-test-frontend\package.json" (
    cd /d "%ROOT_DIR%\ai-test-frontend"
    echo  [INFO] npm install ai-test-frontend...
    call npm install --prefer-offline 2>nul
    if %errorlevel% neq 0 call npm install
    echo  [INFO] npm run build ai-test-frontend...
    call npm run build
    if %errorlevel% equ 0 (
        echo  [OK]  AI Test Frontend build thanh cong!
    ) else (
        echo  [WARN] Build that bai.
    )
) else (
    echo  [SKIP] ai-test-frontend khong ton tai
)
echo.

:: ============================================================
:: TỔNG KẾT
:: ============================================================
cd /d "%ROOT_DIR%"
cls
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║              SETUP HOAN TAT!                         ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Trang thai cai dat:
echo  ─────────────────────────────────────────
if "!JAVA_OK!"=="1"   ( echo  [OK]  Java JDK 21 ) else ( echo  [WARN] Java JDK 21 - kiem tra lai )
if "!PYTHON_OK!"=="1" ( echo  [OK]  Python 3.11+ ) else ( echo  [WARN] Python - kiem tra lai )
if "!NODE_OK!"=="1"   ( echo  [OK]  Node.js ) else ( echo  [WARN] Node.js - kiem tra lai )
if "!MYSQL_OK!"=="1"  ( echo  [OK]  MySQL ) else ( echo  [WARN] MySQL - can cai thu cong )
if "!TESS_OK!"=="1"   ( echo  [OK]  Tesseract OCR ) else ( echo  [WARN] Tesseract - ai-import co the loi )
echo  [OK]  Python packages (4 AI services)
echo  [OK]  Node packages (Frontend)
echo  [OK]  File .env da tao cho 4 services
echo.
echo  ─────────────────────────────────────────

if "!NEED_RESTART!"=="1" (
    echo.
    echo  [QUAN TRONG] Mot so phan mem vua cai xong can KHOI DONG LAI
    echo               may tinh hoac mo cua so CMD moi de PATH co hieu luc.
    echo.
)

:: Kiểm tra file .env thiếu key
echo  Kiem tra API Keys con thieu:
echo.
set "MISSING_KEYS=0"
for %%s in (ai-agent-python ai-speaking-python ai-writing-python ai-import-python) do (
    if exist "%ROOT_DIR%\%%s\.env" (
        findstr /c:"GROQ_API_KEY=gsk_" "%ROOT_DIR%\%%s\.env" >nul 2>&1
        if !errorlevel! neq 0 (
            findstr /c:"GROQ_API_KEY=" "%ROOT_DIR%\%%s\.env" >nul 2>&1
            for /f "tokens=2 delims==" %%k in ('findstr "GROQ_API_KEY=" "%ROOT_DIR%\%%s\.env"') do (
                if "%%k"=="" ( echo  [WARN] %%s\.env thieu GROQ_API_KEY & set "MISSING_KEYS=1" )
            )
        )
    )
)

if "!MISSING_KEYS!"=="0" (
    echo  [OK]  GROQ_API_KEY da duoc dien trong tat ca services
    echo.
    echo  → Lay GROQ_API_KEY mien phi tai: https://console.groq.com/keys
) else (
    echo.
    echo  → Lay GROQ_API_KEY mien phi tai: https://console.groq.com/keys
    echo    Roi dien vao cac file .env tuong ung.
)

echo.
echo  ─────────────────────────────────────────
echo  Buoc tiep theo:
echo.
echo  1. Kiem tra cac file .env co du API Keys
if "!MYSQL_OK!"=="0" (
echo  2. [QUAN TRONG] Cai MySQL va tao database DAVictory
)
if "!DOCKER_OK!"=="1" (
    echo  3. Khoi dong Redis (dang pull image)...
    docker compose -f "%ROOT_DIR%\docker-compose.yml" pull redis >nul 2>&1
    docker compose -f "%ROOT_DIR%\docker-compose.yml" up -d redis 2>nul
    if !errorlevel! equ 0 (
        echo  [OK]  Redis da san sang trong Docker (port 5185)
    ) else (
        echo  [WARN] Redis chua khoi dong duoc. Chay: docker compose up -d redis
    )
) else (
echo  3. Cai Docker Desktop de chay Redis: https://www.docker.com/products/docker-desktop/
echo     (AI Agent se dung in-memory queue neu khong co Redis)
)
echo  4. Chay: start-windows.bat de khoi dong toan bo du an
echo.
echo  ─────────────────────────────────────────
echo.
pause

goto :eof

:: ============================================================
:: FUNCTIONS (Subroutines)
:: ============================================================

:check_java
    java -version >nul 2>&1
    if %errorlevel% neq 0 ( set "JAVA_OK=0" & goto :eof )
    for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do (
        set "JV=%%v"
        set "JV=!JV:"=!"
        for /f "tokens=1 delims=." %%m in ("!JV!") do set "JV_MAJOR=%%m"
    )
    if !JV_MAJOR! geq 21 (
        echo  [OK]  Java !JV! (JDK !JV_MAJOR!)
        set "JAVA_OK=1"
    ) else (
        echo  [WARN] Java !JV! qua cu, can Java 21+
        set "JAVA_OK=0"
    )
goto :eof

:check_python
    python --version >nul 2>&1
    if %errorlevel% neq 0 ( set "PYTHON_OK=0" & goto :eof )
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        set "PV=%%v"
        for /f "tokens=1,2 delims=." %%a in ("!PV!") do (
            set "PV_MAJ=%%a"
            set "PV_MIN=%%b"
        )
    )
    if !PV_MAJ! geq 3 (
        if !PV_MIN! geq 11 (
            echo  [OK]  Python !PV!
            set "PYTHON_OK=1"
            goto :eof
        )
    )
    echo  [WARN] Python !PV! qua cu, can Python 3.11+
    set "PYTHON_OK=0"
goto :eof

:check_node
    node --version >nul 2>&1
    if %errorlevel% neq 0 ( set "NODE_OK=0" & goto :eof )
    for /f %%v in ('node --version') do echo  [OK]  Node.js %%v
    set "NODE_OK=1"
goto :eof

:: Cập nhật giá trị key trong file .env (dùng PowerShell)
:write_env
    :: %1 = tên file .env, %2 = key, %3 = value
    set "_EFILE=%~1"
    set "_EKEY=%~2"
    set "_EVAL=%~3"
    if not defined _EVAL goto :eof
    if "!_EVAL!"=="" goto :eof
    :: Dùng PowerShell để thay thế dòng key=... trong file
    powershell -Command "$f='%~1'; $k='%~2'; $v='%~3'; $c=Get-Content $f; $c=$c -replace ('^' + [regex]::Escape($k) + '=.*'), ($k + '=' + $v); $c | Set-Content $f" >nul 2>&1
goto :eof
