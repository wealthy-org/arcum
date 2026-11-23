@echo off
REM Arcum volatility publisher MAINNET (Chain 4663) entry point for Windows Task Scheduler.
REM
REM Publishes NVDA/AAPL/QQQ sigma to VolOracle on Robinhood Chain Mainnet.
REM Without this running, `sigmaFor()` expires after TTL (3600s) and
REM `ArcumEngine` reverts every new buy with `StaleVol`.
REM
REM Environment is set here (not in app\.env) so mainnet and testnet can run side-by-side.
REM The publisher key (KEEPER_PRIVATE_KEY) is still read from app\.env — do NOT put it here.

setlocal
set "VOL_DIR=%~dp0.."
set "PY=C:\laragon\bin\python\python-3.13\python.exe"
set "LOGDIR=%~dp0..\..\app\logs"
set "LOG=%LOGDIR%\vol-mainnet.log"

REM --- Mainnet overrides ---
set "VOL_ENGINE_RPC=http://127.0.0.1:8548"
set "VOL_ORACLE_ADDRESS=0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5"
set "STOCK_NVDA=0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"
set "STOCK_AAPL=0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9"
set "STOCK_QQQ=0xD5f3879160bc7c32ebb4dC785F8a4F505888de68"
REM RH_TESTNET_RPC is also overridden so publish_once.py fallback also hits mainnet relay
set "RH_TESTNET_RPC=http://127.0.0.1:8548"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%VOL_DIR%" || exit /b 1

echo [%DATE% %TIME%] vol-mainnet start>> "%LOG%"
"%PY%" publish_once.py >> "%LOG%" 2>&1
set RC=%ERRORLEVEL%
echo [%DATE% %TIME%] vol-mainnet exit rc=%RC% >> "%LOG%"
exit /b %RC%
