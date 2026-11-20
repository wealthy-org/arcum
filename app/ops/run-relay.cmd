@echo off
REM Arcum local RPC relay — unattended entry point.
REM
REM Why this exists: the testnet RPC edge resets TLS connections from the Rust and Python
REM client fingerprints (forge/cast: `os error 10054`, python urllib: WinError 10054) while
REM Bun's fetch is accepted. This relay forwards JSON-RPC byte-for-byte from 127.0.0.1:8547
REM to the upstream through Bun.
REM
REM It does not sign, cache, rewrite, or hold keys. It is a pipe.
REM
REM The loop matters: if the single `bun` process exits, Task Scheduler would otherwise leave
REM a dead listener and every forge/cast invocation would fail with ECONNREFUSED. Restarting
REM in-process is cheaper than a second task with a restart policy, which schtasks cannot set.

setlocal
set "OPS_DIR=%~dp0"
set "ROOT=%OPS_DIR%..\.."
set "BUN=C:\Users\KevinAdisuryaNugraha\.bun\bin\bun.exe"
set "LOGDIR=%ROOT%\app\logs"
set "LOG=%LOGDIR%\relay.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%ROOT%" || exit /b 1

:loop
echo [%DATE% %TIME%] relay start>> "%LOG%"
"%BUN%" app\ops\rpc-proxy.mjs >> "%LOG%" 2>&1
echo [%DATE% %TIME%] relay exit rc=%ERRORLEVEL%, restarting in 5s>> "%LOG%"
timeout /t 5 /nobreak >nul
goto loop