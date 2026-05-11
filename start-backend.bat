@echo off
REM Start Wao Felicitations Backend as Persistent Service
REM This batch file starts the backend with environment variables and keeps it running

cd /d "c:\Wao Felicitations"

REM Set environment variables
set DATABASE_URL=postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require^&channel_binding=require
set DATABASE_URL_POOLED=postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require^&channel_binding=require
set JWT_SECRET=dev-secret-key-minimum-32-characters-xxxxxxxxxx
set ENCRYPTION_KEY=dev-encryption-key-32chars-xxx
set PORT=3001
set NODE_ENV=production

echo.
echo ========================================================================
echo   Wao Felicitations - Backend Server Starting
echo ========================================================================
echo.
echo  Environment: Production
echo  Port: 3001
echo  Database: Neon PostgreSQL (ep-still-fog-am43u8yd)
echo.

REM Start the backend
npx tsx backend-express-complete.ts

REM If process exits, restart automatically
echo.
echo ========================================================================
echo   Backend process ended. Restarting in 5 seconds...
echo ========================================================================
timeout /t 5 /nobreak
goto start
