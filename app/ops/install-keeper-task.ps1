# Register the Arcum accrual keeper with Windows Task Scheduler.
#
# Run once, from an ordinary PowerShell prompt (no admin needed for a per-user task):
#     powershell -ExecutionPolicy Bypass -File app\ops\install-keeper-task.ps1
#
# What it registers:
#   name      ArcumKeeper
#   schedule  every hour, indefinitely
#   action    app\ops\run-keeper.cmd   (one accrual pass per run)
#   identity  the current user, run only while logged on — a key on disk plus an always-on
#             SYSTEM task is more exposure than a testnet keeper needs
#
# Why `schtasks` and not `Register-ScheduledTask`: the CIM cmdlets reject the "repeat forever"
# repetition duration (`HRESULT 0x80041318`, the value must be < P99999999DT23H59M59S), and the
# XML workaround differs between Windows builds. `schtasks /sc hourly` says the same thing in one
# line and is stable across versions.
#
# The keeper itself refuses to sign unless the market session is REGULAR or EXTENDED, so an
# hourly trigger outside market hours is a no-op, not a failed transaction.

[CmdletBinding()]
param(
    [string]$TaskName = "ArcumKeeper",
    [string]$StartTime = "00:05"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd = Join-Path $scriptDir "run-keeper.cmd"
if (-not (Test-Path $cmd)) { throw "not found: $cmd" }

$appDir = Split-Path -Parent $scriptDir
$envFile = Join-Path $appDir ".env"
if (-not (Test-Path $envFile)) {
    throw "app\.env is missing. The keeper fails closed without KEEPER_PRIVATE_KEY, so there is nothing to schedule."
}
$hasKey = Select-String -Path $envFile -Pattern '^\s*KEEPER_PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{64}\s*$' -Quiet
if (-not $hasKey) {
    throw "app\.env has no KEEPER_PRIVATE_KEY=0x<64 hex>. The keeper would start and immediately throw."
}

# /tr needs one quoted command line; embedded quotes are escaped as \"
$tr = '"' + $cmd + '"'

$out = & schtasks /create /tn $TaskName /tr $tr /sc hourly /mo 1 /st $StartTime /f /rl LIMITED 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "schtasks failed (exit $LASTEXITCODE): $out"
}

Write-Host $out
Write-Host ""
Write-Host "registered: $TaskName (hourly, first run $StartTime, while this user is logged on)"
Write-Host "verify   : schtasks /query /tn $TaskName /v /fo LIST"
Write-Host "run now  : schtasks /run  /tn $TaskName"
Write-Host "log      : app\logs\keeper.log"
