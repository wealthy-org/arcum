@echo off
REM Arcum handover page over HTTPS — Cloudflare quick tunnel.
REM
REM Why this exists: MetaMask's in-app browser upgrades http:// to https:// before sending a
REM single byte, so the phone greets the plain HTTP server with a TLS ClientHello and the
REM server answers `400 Bad request version`. The symptom the user sees is
REM `net::ERR_PROTOCOL_ERROR`. Only a real certificate fixes that; a self-signed one is
REM rejected by the WebView with no way to click through.
REM
REM Tailscale `serve` would have been the private option, but the tailnet has Serve disabled
REM ("Serve is not enabled on your tailnet"), so this uses a quick tunnel: no account, no
REM token, random hostname, and the URL changes every restart. That is why the URL is written
REM to the log instead of being hardcoded anywhere.
REM
REM Public by design: the tunnel exposes the static page to anyone who guesses the hostname.
REM The page holds no key and cannot sign anything without a human tapping Approve in MetaMask.

setlocal
set "OPS_DIR=%~dp0"
set "ROOT=%OPS_DIR%..\.."
set "LOGDIR=%ROOT%\app\logs"
set "LOG=%LOGDIR%\tunnel.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%ROOT%" || exit /b 1

:loop
echo [%DATE% %TIME%] tunnel start>> "%LOG%"
"%OPS_DIR%bin\cloudflared.exe" tunnel --url http://127.0.0.1:8899 --no-autoupdate >> "%LOG%" 2>&1
echo [%DATE% %TIME%] tunnel exit rc=%ERRORLEVEL%, restarting in 5s>> "%LOG%"
timeout /t 5 /nobreak >nul
goto loop
