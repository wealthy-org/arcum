# Register the Arcum volatility publisher with Windows Task Scheduler.
#
#     powershell -ExecutionPolicy Bypass -File vol-engine\ops\install-vol-task.ps1
#
# Schedule: every 30 minutes, indefinitely.
#
# Why 30 minutes and not hourly: a reading carries `validUntil = now + TTL` (default 3600 s).
# If the publisher only ran once an hour, a single missed or failed run would leave the oracle
# expired and `ArcumEngine` would revert every new buy with `StaleVol` for the rest of the hour.
# Two attempts per TTL means one failure is absorbed instead of becoming an outage.
#
# The task is not registered unless app\.env already holds a publisher key, because a task that
# starts and immediately exits with "missing env" is worse than no task: it looks installed.

[CmdletBinding()]
param(
    [string]$TaskName = "ArcumVol",
    [int]$IntervalMinutes = 30,
    [string]$StartTime = "00:03"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd = Join-Path $scriptDir "run-vol.cmd"
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

$out = & schtasks /create /tn $TaskName /tr $tr /sc minute /mo $IntervalMinutes /st $StartTime /f /rl LIMITED 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "schtasks failed (exit $LASTEXITCODE): $out"
}

Write-Host $out

# Same power defaults as the keeper task: without this the publisher stops running on battery
# or on unplug, sigma expires an hour later, and every new buy reverts with StaleVol while the
# task list still shows the job as installed.
$task = Get-ScheduledTask -TaskName $TaskName
$task.Settings.DisallowStartIfOnBatteries = $false
$task.Settings.StopIfGoingOnBatteries = $false
$task.Settings.StartWhenAvailable = $true
$task.Settings.ExecutionTimeLimit = "PT30M"
Set-ScheduledTask -TaskName $TaskName -Settings $task.Settings | Out-Null

Write-Host ""
Write-Host "registered: $TaskName (every $IntervalMinutes min, first run $StartTime, while this user is logged on)"
Write-Host "verify   : schtasks /query /tn $TaskName /v /fo LIST"
Write-Host "run now  : schtasks /run  /tn $TaskName"
Write-Host "log      : app\logs\vol.log"
Write-Host "check    : cast call $VOL_ORACLE 'sigmaFor(address)((uint64,bool))' <stock> --rpc-url `$RPC"
