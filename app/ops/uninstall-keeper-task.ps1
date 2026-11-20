# Remove the Arcum scheduled tasks (keeper accrual and volatility publisher).
#
#     powershell -ExecutionPolicy Bypass -File app\ops\uninstall-keeper-task.ps1
#
# Removing the schedule touches nothing on chain: the keeper key, app\.env, the deployed
# contracts, and the last posted sigma all stay exactly as they were. Re-running the
# installers restores the schedules.
#
# Note that stopping ArcumVol does have an on-chain consequence after one hour: sigma stops
# being refreshed, `validUntil` lapses, and `ArcumEngine` reverts new buys with `StaleVol`
# (sell and accrue keep working). That is fail-closed by design, not a bug to work around.

[CmdletBinding()]
param(
    [string[]]$TaskName = @("ArcumKeeper", "ArcumVol")
)

$removed = 0
foreach ($name in $TaskName) {
    $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Host "not registered: $name"
        continue
    }
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "removed: $name"
    $removed++
}

Write-Host ""
Write-Host "removed $removed task(s). Chain state untouched."
