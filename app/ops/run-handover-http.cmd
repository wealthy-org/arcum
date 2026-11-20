@echo off
REM Arcum handover signing page — unattended static file server.
REM
REM Why this exists: the timelock's PROPOSER/EXECUTOR roles are held by the MetaMask account
REM 0x08f4…D90B, whose private key is not on this machine and never will be. The only way to
REM sign the handover is a page opened inside the MetaMask mobile app's built-in browser, which
REM needs an http origin. This serves app/ops/handover on the LAN so the phone can reach it.
REM
REM Read-only static files. No key, no signing, no RPC: MetaMask itself talks to the chain.
REM If the phone cannot load the page, the laptop firewall is blocking TCP 8899, not this script.

setlocal
set "OPS_DIR=%~dp0"
set "ROOT=%OPS_DIR%..\.."
set "PY=C:\laragon\bin\python\python-3.13\python.exe"
set "LOGDIR=%ROOT%\app\logs"
set "LOG=%LOGDIR%\handover-http.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%ROOT%\app\ops\handover" || exit /b 1

:loop
echo [%DATE% %TIME%] handover http start on 0.0.0.0:8899>> "%LOG%"
"%PY%" -m http.server 8899 --bind 0.0.0.0 >> "%LOG%" 2>&1
echo [%DATE% %TIME%] handover http exit rc=%ERRORLEVEL%, restarting in 5s>> "%LOG%"
timeout /t 5 /nobreak >nul
goto loop
