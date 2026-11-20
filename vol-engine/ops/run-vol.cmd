@echo off
REM Arcum volatility publisher — unattended entry point for Windows Task Scheduler.
REM
REM Publishes NVDA/AAPL/QQQ sigma to VolOracle. Without this running, `sigmaFor()` expires
REM after the reading's TTL (3600 s) and `ArcumEngine` reverts every new buy with `StaleVol`.
REM
REM The publisher key is NOT in this file. `publish_once.py` reads it from app\.env, which is
REM gitignored. Keep it that way: a key in a tracked .cmd is a key in the repository history.

setlocal
set "VOL_DIR=%~dp0.."
set "PY=C:\laragon\bin\python\python-3.13\python.exe"
set "LOGDIR=%~dp0..\..\app\logs"
set "LOG=%LOGDIR%\vol.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%VOL_DIR%" || exit /b 1

echo [%DATE% %TIME%] vol start>> "%LOG%"
"%PY%" publish_once.py >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
echo [%DATE% %TIME%] vol exit rc=%RC%>> "%LOG%"
exit /b %RC%
