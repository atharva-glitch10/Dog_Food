@echo off
setlocal
REM ==============================================================================
REM DOGFOOD 2026 — One-Command Stack Setup Script for Windows
REM ==============================================================================

echo ======================================================================
echo    DOGFOOD 2026: Hackathon Judging ^& Submission Platform
echo ======================================================================
echo.

REM 1. Environment Config Setup: create .env with random secrets if missing
if not exist ".env" (
    echo [1/4] Generating .env from .env.example with random secrets...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$rng = [Security.Cryptography.RandomNumberGenerator]::Create();" ^
      "function New-Secret { $b = New-Object byte[] 48; $rng.GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' };" ^
      "$jwt = New-Secret; $cookie = New-Secret;" ^
      "(Get-Content '.env.example') -replace '^JWT_SECRET=.*', ('JWT_SECRET=' + $jwt) -replace '^COOKIE_SECRET=.*', ('COOKIE_SECRET=' + $cookie) | Set-Content -Encoding ascii '.env'"
    if not exist ".env" (
        echo Could not generate .env automatically; copying .env.example instead.
        echo The backend container will generate random secrets on first boot.
        copy .env.example .env >nul
    )
) else (
    echo [1/4] .env configuration detected.
)

if not exist "backend\.env" (
    copy .env backend\.env >nul
)

REM 2. Check Docker availability
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [2/4] Docker daemon active. Booting stack via Docker Compose...
    echo [3/4] Building and launching containers...
    REM Data volumes are kept; run "docker compose down -v" yourself for a full reset.
    docker compose up --build -d --remove-orphans

    echo [4/4] Waiting for backend and frontend services...
    timeout /t 10 /nobreak >nul
    echo.
    echo ======================================================================
    echo    PLATFORM READY AT: http://localhost:3000
    echo ======================================================================
    echo.
    echo Endpoint URLs:
    echo   - Frontend Web UI:        http://localhost:3000
    echo   - Backend REST API:       http://localhost:4000/api
    echo   - Interactive Swagger:    http://localhost:4000/api/docs
    echo.
    echo Demo Credentials ^(Password: Dogfood2026!^):
    echo   - Admin:        admin@dogfood.local
    echo   - Organizer:    organizer@dogfood.local
    echo   - Judges:       judge.harsh@ / judge.lenient@ / judge.balanced@ / judge.specialist@dogfood.local
    echo   - Participants: alice@dogfood.local, carol@dogfood.local
    echo.
    echo To view logs: docker compose logs -f
    echo To stop:      docker compose down
) else (
    echo [2/4] Docker daemon is not running.
    echo       Falling back to local Node.js setup...
    echo [3/4] Installing backend dependencies...
    cd backend && npm install && npx prisma generate && cd ..
    echo [4/4] Installing frontend dependencies...
    cd frontend && npm install && cd ..
    echo.
    echo Done! To launch locally:
    echo   Backend:  cd backend ^&^& npm run dev
    echo   Frontend: cd frontend ^&^& npm run dev
)
endlocal
