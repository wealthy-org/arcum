# Registers the handover signing page as an onstart SYSTEM task.
#
# Why SYSTEM and onstart, not a per-user task: a per-user task only runs while that user is
# logged in, so the page would be dead exactly when the phone tries to load it after a reboot.
#
# Why not just leave a python window open: a console window that the user closes takes the
# listener with it, and the failure looks like "the phone cannot reach the laptop".
#
# Remove with: app\ops\uninstall-keeper-task.ps1 (it removes ArcumKeeper, ArcumVol,
# ArcumRpcRelay and ArcumHandoverHttp).

$ErrorActionPreference = "Stop"
$taskName = "ArcumHandoverHttp"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cmd = Join-Path $PSScriptRoot "run-handover-http.cmd"

if (-not (Test-Path $cmd)) { throw "missing $cmd" }

$action = "`"$cmd`""

& schtasks /create /tn $taskName /tr $action /sc onstart /ru SYSTEM /rl HIGHEST /f | Out-Null
if ($LASTEXITCODE -ne 0) { throw "schtasks /create failed with $LASTEXITCODE" }

$xml = & schtasks /query /tn $taskName /xml
$xml = $xml -replace "<DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries>", "<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>"
$xml = $xml -replace "<StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>", "<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>"
$xml = $xml -replace "<ExecutionTimeLimit>PT72H</ExecutionTimeLimit>", "<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>"
$tmp = Join-Path $env:TEMP "arcum-handover-task.xml"
$xml | Set-Content -Path $tmp -Encoding Unicode
& schtasks /create /tn $taskName /xml $tmp /f | Out-Null
Remove-Item $tmp -Force

& schtasks /run /tn $taskName | Out-Null

Write-Host "task $taskName registered and started"
& schtasks /query /tn $taskName /v /fo LIST | Select-String "Status|Logon Mode|Run As User"
