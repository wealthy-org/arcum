# Register the Arcum accrual keeper with Windows Task Scheduler.
#
# Run once from an elevated PowerShell prompt (the task identity is SYSTEM):
#     powershell -ExecutionPolicy Bypass -File app\ops\install-keeper-task.ps1
#     powershell -ExecutionPolicy Bypass -File app\ops\install-keeper-task.ps1 -PerUser
#
# What it registers:
#   name      ArcumKeeper
#   schedule  every hour, indefinitely
#   action    app\ops\run-keeper.cmd   (one accrual pass per run)
#   identity  SYSTEM (default), runs whether or not anyone is logged on
#
# Why SYSTEM and not the current user: a per-user task is registered "Interactive only", so it
# stops when the session ends — log off, or let the machine sleep — and the symptom is a silent
# log, not an error. A keeper that stops accruing without saying so is worse than one that never
# started. `-PerUser` still registers the old way for anyone who does not want a SYSTEM task.
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
    [string]$StartTime = "00:05",
    [switch]$PerUser
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

$runAs = if ($PerUser) { @() } else { @("/ru", "SYSTEM") }
$out = & schtasks /create /tn $TaskName /tr $tr /sc hourly /mo 1 /st $StartTime /f /rl HIGHEST @runAs 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "schtasks failed (exit $LASTEXITCODE): $out"
}

Write-Host $out

# `schtasks /create` leaves the power defaults on: the task will not start on battery and is
# stopped the moment the machine unplugs. For a background accrual job on a laptop that means
# it silently stops running exactly when someone picks the machine up. `StartWhenAvailable`
# covers the other half: a run missed because the machine was asleep fires on wake instead of
# being skipped until the next hour.
$task = Get-ScheduledTask -TaskName $TaskName
$task.Settings.DisallowStartIfOnBatteries = $false
$task.Settings.StopIfGoingOnBatteries = $false
$task.Settings.StartWhenAvailable = $true
$task.Settings.ExecutionTimeLimit = "PT30M"
Set-ScheduledTask -TaskName $TaskName -Settings $task.Settings | Out-Null

Write-Host ""
$logon = if ($PerUser) { "interactive only" } else { "SYSTEM, background" }
Write-Host "registered: $TaskName (hourly, first run $StartTime, $logon)"
Write-Host "verify   : schtasks /query /tn $TaskName /v /fo LIST"
Write-Host "run now  : schtasks /run  /tn $TaskName"
Write-Host "log      : app\logs\keeper.log"
