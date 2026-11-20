# Register the Arcum local RPC relay with Windows Task Scheduler.
#
# Run once from an elevated PowerShell prompt:
#     powershell -ExecutionPolicy Bypass -File app\ops\install-relay-task.ps1
#
# Why a relay exists at all: the testnet RPC edge resets TLS connections from the Rust
# (`forge`/`cast`) and Python (`urllib`) fingerprints — `os error 10054`, `WinError 10054` —
# while Bun's `fetch` is accepted. `app\ops\rpc-proxy.mjs` forwards JSON-RPC byte-for-byte on
# 127.0.0.1:8547 through Bun. It does not sign, cache, rewrite, or hold keys.
#
# Why SYSTEM: the volatility publisher and the keeper both run as SYSTEM and both read the relay
# URL from app\.env. A relay that dies at logoff takes the scheduled jobs with it, and the failure
# looks like a transport error in the log rather than a dead listener.
#
# Why `onstart` plus a loop inside run-relay.cmd: `schtasks` cannot express "restart if the process
# exits", and the relay exits on an unhandled upstream error. The .cmd restarts it in-process every
# 5 s, so the listener outlives individual crashes. ExecutionTimeLimit is PT0S (unlimited),
# otherwise the scheduler kills the loop after the default 72 hours.

[CmdletBinding()]
param(
    [string]$TaskName = "ArcumRpcRelay",
    [string]$Port = "8547"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd = Join-Path $scriptDir "run-relay.cmd"
if (-not (Test-Path $cmd)) { throw "not found: $cmd" }

$tr = '"' + $cmd + '"'

$out = & schtasks /create /tn $TaskName /tr $tr /sc onstart /ru SYSTEM /rl HIGHEST /f 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "schtasks failed (exit $LASTEXITCODE): $out  (this needs an elevated prompt)"
}
Write-Host $out

$task = Get-ScheduledTask -TaskName $TaskName
$task.Settings.DisallowStartIfOnBatteries = $false
$task.Settings.StopIfGoingOnBatteries = $false
$task.Settings.StartWhenAvailable = $true
$task.Settings.ExecutionTimeLimit = "PT0S"
$task.Settings.RestartCount = 3
$task.Settings.RestartInterval = "PT1M"
Set-ScheduledTask -TaskName $TaskName -Settings $task.Settings | Out-Null

Write-Host ""
Write-Host "registered: $TaskName (at startup, SYSTEM, unlimited runtime)"
Write-Host "start now: schtasks /run /tn $TaskName   (elevated; an onstart task cannot be started unelevated)"
Write-Host "check    : netstat -ano | findstr :$Port"
Write-Host "log      : app\logs\relay.log"
Write-Host ""
Write-Host "app\.env RH_TESTNET_RPC should be http://127.0.0.1:$Port once this is running."
