@echo off
REM Arcum accrual keeper — unattended entry point for Windows Task Scheduler.
REM
REM Task Scheduler does not load a shell profile, so `bun` is often not on PATH when the
REM task starts. The absolute path below is the one this machine actually has; change it
REM if bun lives somewhere else (`where bun`).
REM
REM Everything the keeper needs comes from app\.env, which Bun loads itself. Do not put
REM keys in this file: it is tracked by git.

setlocal
set "APP_DIR=%~dp0.."
set "BUN=C:\Users\KevinAdisuryaNugraha\.bun\bin\bun.exe"
set "LOGDIR=%APP_DIR%\logs"
set "LOG=%LOGDIR%\keeper.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%APP_DIR%" || exit /b 1

REM One run per invocation. The daemon loop is driven by Task Scheduler's repetition
REM instead of setInterval, so a crashed process is restarted by the scheduler rather
REM than dying quietly until someone notices the funding stopped moving.
echo [%DATE% %TIME%] keeper start>> "%LOG%"
"%BUN%" run keeper >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
echo [%DATE% %TIME%] keeper exit rc=%RC%>> "%LOG%"
exit /b %RC%
