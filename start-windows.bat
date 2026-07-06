@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ============================================================
:: DAVictory - Windows Startup Script
:: Chạy từng service trong cửa sổ CMD riêng biệt
:: Tác giả: nguyenleduy03
:: ============================================================

echo.
echo  ========================================
echo   DAVictory - Windows Startup Script
echo  ========================================
echo.

:: Lấy thư mục gốc của dự án (thư mục chứa file .bat này)
set "ROOT_DIR=%~dp0"
:: Bỏ dấu \ cuối nếu có
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo [INFO] Root dir: %ROOT_DIR%
echo.

:: ============================================================
:: Kiểm tra công cụ cần thiết
:: ============================================================

echo [CHECK] Kiểm tra công cụ cần thiết...

where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java chưa được cài đặt hoặc chưa thêm vào PATH!
    echo         Tải JDK 21 tại: https://adoptium.net/temurin/releases/?version=21
    pause
    exit /b 1
)
for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    echo [OK]    Java: %%v
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python chưa được cài đặt hoặc chưa thêm vào PATH!
    echo         Tải Python 3.11+ tại: https://www.python.org/downloads/
    echo         Lưu ý: Phải tích chọn "Add Python to PATH" khi cài!
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo [OK]    Python: %%v

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js chưa được cài đặt!
    echo         Tải tại: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%v in ('node --version') do echo [OK]    Node.js: %%v

echo.

:: ============================================================
:: Kiểm tra file .env
:: ============================================================

echo [CHECK] Kiểm tra file .env của các AI service...
set "ENV_MISSING=0"

for %%s in (ai-agent-python ai-speaking-python ai-writing-python ai-import-python) do (
    if not exist "%ROOT_DIR%\%%s\.env" (
        echo [WARN]  Thiếu file: %%s\.env
        echo         Hãy copy từ %%s\.env.example và điền API keys!
        set "ENV_MISSING=1"
    ) else (
        echo [OK]    %%s\.env tồn tại
    )
)

if "!ENV_MISSING!"=="1" (
    echo.
    echo [WARN] Một số file .env còn thiếu. Các service tương ứng có thể bị lỗi.
    echo        Xem hướng dẫn trong WINDOWS_SETUP.md để biết cách cấu hình.
    echo.
    echo Tiếp tục? (Nhấn bất kỳ phím nào để tiếp tục, hoặc Ctrl+C để thoát)
    pause >nul
)

echo.
echo [INFO] Chuẩn bị khởi động các services...
echo [INFO] Mỗi service sẽ mở trong một cửa sổ CMD riêng biệt.
echo.
echo Nhấn bất kỳ phím nào để bắt đầu...
pause >nul

:: ============================================================
:: 1. BACKEND (Spring Boot)
:: ============================================================

echo.
echo [START] Khởi động Backend (Spring Boot - port 8080)...

if exist "%ROOT_DIR%\backend\mvnw.cmd" (
    start "DAVictory - Backend :8080" cmd /k "cd /d "%ROOT_DIR%\backend" && echo [Backend] Dang khoi dong Spring Boot... && mvnw.cmd spring-boot:run"
) else (
    where mvn >nul 2>&1
    if %errorlevel% equ 0 (
        start "DAVictory - Backend :8080" cmd /k "cd /d "%ROOT_DIR%\backend" && echo [Backend] Dang khoi dong Spring Boot... && mvn spring-boot:run"
    ) else (
        echo [ERROR] Không tìm thấy Maven (mvn hoặc mvnw.cmd)!
        echo         Tải Maven tại: https://maven.apache.org/download.cgi
    )
)

echo [INFO] Backend đang khởi động (có thể mất 30-60 giây)...
timeout /t 5 /nobreak >nul

:: ============================================================
:: 2. AI AGENT (port 5187)
:: ============================================================

echo [START] Khởi động AI Agent (port 5187)...

set "AGENT_DIR=%ROOT_DIR%\ai-agent-python"
set "AGENT_PYTHON="

if exist "%AGENT_DIR%\.venv\Scripts\python.exe" (
    set "AGENT_PYTHON=%AGENT_DIR%\.venv\Scripts\python.exe"
) else if exist "%AGENT_DIR%\venv\Scripts\python.exe" (
    set "AGENT_PYTHON=%AGENT_DIR%\venv\Scripts\python.exe"
) else (
    set "AGENT_PYTHON=python"
    echo [WARN]  ai-agent-python: Không tìm thấy .venv, sẽ dùng python hệ thống
    echo         Chạy lệnh setup trước: cd ai-agent-python ^&^& python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt
)

start "DAVictory - AI Agent :5187" cmd /k "cd /d "%AGENT_DIR%" && echo [AI Agent] Dang khoi dong... && "!AGENT_PYTHON!" -m uvicorn main:app --host 0.0.0.0 --port 5187"

timeout /t 2 /nobreak >nul

:: ============================================================
:: 3. AI SPEAKING (port 5181)
:: ============================================================

echo [START] Khởi động AI Speaking (port 5181)...

set "SPEAKING_DIR=%ROOT_DIR%\ai-speaking-python"
set "SPEAKING_PYTHON="

if exist "%SPEAKING_DIR%\.venv\Scripts\python.exe" (
    set "SPEAKING_PYTHON=%SPEAKING_DIR%\.venv\Scripts\python.exe"
) else if exist "%SPEAKING_DIR%\venv\Scripts\python.exe" (
    set "SPEAKING_PYTHON=%SPEAKING_DIR%\venv\Scripts\python.exe"
) else (
    set "SPEAKING_PYTHON=python"
    echo [WARN]  ai-speaking-python: Không tìm thấy .venv, sẽ dùng python hệ thống
)

start "DAVictory - AI Speaking :5181" cmd /k "cd /d "%SPEAKING_DIR%" && echo [AI Speaking] Dang khoi dong... && "!SPEAKING_PYTHON!" -m uvicorn main:app --host 0.0.0.0 --port 5181"

timeout /t 2 /nobreak >nul

:: ============================================================
:: 4. AI WRITING (port 5182)
:: ============================================================

echo [START] Khởi động AI Writing (port 5182)...

set "WRITING_DIR=%ROOT_DIR%\ai-writing-python"
set "WRITING_PYTHON="

if exist "%WRITING_DIR%\.venv\Scripts\python.exe" (
    set "WRITING_PYTHON=%WRITING_DIR%\.venv\Scripts\python.exe"
) else if exist "%WRITING_DIR%\venv\Scripts\python.exe" (
    set "WRITING_PYTHON=%WRITING_DIR%\venv\Scripts\python.exe"
) else (
    set "WRITING_PYTHON=python"
    echo [WARN]  ai-writing-python: Không tìm thấy .venv, sẽ dùng python hệ thống
)

start "DAVictory - AI Writing :5182" cmd /k "cd /d "%WRITING_DIR%" && echo [AI Writing] Dang khoi dong... && "!WRITING_PYTHON!" -m uvicorn main:app --host 0.0.0.0 --port 5182"

timeout /t 2 /nobreak >nul

:: ============================================================
:: 5. AI IMPORT (port 5186)
:: ============================================================

echo [START] Khởi động AI Import (port 5186)...

set "IMPORT_DIR=%ROOT_DIR%\ai-import-python"
set "IMPORT_PYTHON="

if exist "%IMPORT_DIR%\.venv\Scripts\python.exe" (
    set "IMPORT_PYTHON=%IMPORT_DIR%\.venv\Scripts\python.exe"
) else if exist "%IMPORT_DIR%\venv\Scripts\python.exe" (
    set "IMPORT_PYTHON=%IMPORT_DIR%\venv\Scripts\python.exe"
) else (
    set "IMPORT_PYTHON=python"
    echo [WARN]  ai-import-python: Không tìm thấy .venv, sẽ dùng python hệ thống
)

start "DAVictory - AI Import :5186" cmd /k "cd /d "%IMPORT_DIR%" && echo [AI Import] Dang khoi dong... && "!IMPORT_PYTHON!" -m uvicorn main:app --host 0.0.0.0 --port 5186"

timeout /t 2 /nobreak >nul

:: ============================================================
:: 6. FRONTEND (port 5173)
:: ============================================================

echo.
echo [START] Khởi động Frontend (port 5173)...

set "FRONTEND_DIR=%ROOT_DIR%\frontend"

if exist "%FRONTEND_DIR%\dist\index.html" (
    echo [INFO]  Frontend đã build sẵn, chạy production server...
    start "DAVictory - Frontend :5173" cmd /k "cd /d "%FRONTEND_DIR%" && node serve.js"
) else (
    echo [INFO]  Chưa có build, chạy Vite dev server...
    start "DAVictory - Frontend :5173" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
)

timeout /t 2 /nobreak >nul

:: ============================================================
:: 7. REDIS (Docker)
:: ============================================================

echo [START] Khởi động Redis (port 5185)...

where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose -f "%ROOT_DIR%\docker-compose.yml" up -d redis 2>nul
    if %errorlevel% equ 0 (
        echo [OK]    Redis da khoi dong trong Docker (port 5185)
    ) else (
        echo [WARN]  Khong the khoi dong Redis. AI Agent can Redis de hoat dong.
        echo         Dam bao Docker Desktop dang chay.
    )
) else (
    echo [WARN]  Docker khong tim thay. Redis chua duoc khoi dong.
    echo         AI Agent se dung in-memory queue (fallback).
)

timeout /t 2 /nobreak >nul

:: ============================================================
:: 8. AI TEST FRONTEND (port 5174)
:: ============================================================

echo [START] Khởi động AI Test Frontend (port 5174)...

set "AITEST_DIR=%ROOT_DIR%\ai-test-frontend"
if exist "%AITEST_DIR%\package.json" (
    if exist "%AITEST_DIR%\dist\index.html" (
        echo [INFO]  AI Test Frontend da build san, chay production server...
        start "DAVictory - AI Test :5174" cmd /k "cd /d "%AITEST_DIR%" && npx http-server dist -p 5174 -c-1"
    ) else (
        echo [WARN]  ai-test-frontend chua build. Chay setup-windows.bat truoc.
    )
) else (
    echo [SKIP]  ai-test-frontend khong ton tai
)

:: ============================================================
:: DONE
:: ============================================================

echo.
echo  ========================================
echo   Tat ca services da duoc khoi dong!
echo  ========================================
echo.
echo   Frontend    : http://localhost:5173
echo   AI Test     : http://localhost:5174
echo   Backend API : http://localhost:8080
echo   Swagger UI  : http://localhost:8080/swagger-ui.html
echo   Redis       : localhost:5185 (Docker)
echo   AI Agent    : http://localhost:5187/docs
echo   AI Speaking : http://localhost:5181/docs
echo   AI Writing  : http://localhost:5182/docs
echo   AI Import   : http://localhost:5186/docs
echo.
echo   Moi service dang chay trong cua so rieng.
echo   De dung tat ca: dong cac cua so CMD lai.
echo.
pause
