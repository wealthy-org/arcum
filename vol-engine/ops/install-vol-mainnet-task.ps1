# Register the Arcum volatility publisher (MAINNET) with Windows Task Scheduler.
#
#     powershell -ExecutionPolicy Bypass -File vol-engine\ops\install-vol-mainnet-task.ps1
#
# Schedule: every 30 minutes, indefinitely.
# Chain: Robinhood Mainnet (4663) via local RPC relay on http://127.0.0.1:8548
#
# PREREQUISITE: app\ops\rpc-proxy-mainnet.mjs must be running (port 8548).
#               The keeper key must be set in app\.env as KEEPER_PRIVATE_KEY.

[CmdletBinding()]
param(
    [string]$TaskName = "ArcumVolMainnet",
    [switch]$PerUser,
    [int]$IntervalMinutes = 30,
    [string]$StartTime = "00:08"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd = Join-Path $scriptDir "run-vol-mainnet.cmd"
if (-not (Test-Path $cmd)) { throw "not found: $cmd" }

$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$envFile = Join-Path $repoRoot "app\.env"
if (-not (Test-Path $envFile)) {
    throw "app\.env is missing. publish_once.py reads the publisher key from there."
}
$hasKey = Select-String -Path $envFile -Pattern '^\s*KEEPER_PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{64}\s*$' -Quiet
if (-not $hasKey) {
    throw "app\.env has no KEEPER_PRIVATE_KEY=0x<64 hex>."
}

$tr = '"' + $cmd + '"'

$runAs = if ($PerUser) { @() } else { @("/ru", "SYSTEM") }
$out = & schtasks /create /tn $TaskName /tr $tr /sc minute /mo $IntervalMinutes /st $StartTime /f /rl HIGHEST @runAs 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "schtasks failed (exit $LASTEXITCODE): $out"
}

Write-Host $out

$task = Get-ScheduledTask -TaskName $TaskName
$task.Settings.DisallowStartIfOnBatteries = $false
$task.Settings.StopIfGoingOnBatteries = $false
$task.Settings.StartWhenAvailable = $true
$task.Settings.ExecutionTimeLimit = "PT30M"
Set-ScheduledTask -TaskName $TaskName -Settings $task.Settings | Out-Null

Write-Host ""
$logon = if ($PerUser) { "interactive only" } else { "SYSTEM, background" }
Write-Host "registered: $TaskName (every $IntervalMinutes min, first run $StartTime, $logon)"
Write-Host "note     : RPC relay (port 8548) MUST be running. If machine restarts, restart it with:"
Write-Host "           bun app\ops\rpc-proxy-mainnet.mjs"
Write-Host "verify   : schtasks /query /tn $TaskName /v /fo LIST"
Write-Host "run now  : schtasks /run /tn $TaskName"
Write-Host "log      : app\logs\vol-mainnet.log"
