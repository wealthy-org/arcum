# Registers the HTTPS tunnel as an onstart SYSTEM task and prints the current URL.
#
# Why a task rather than a background console: the tunnel must outlive the terminal that
# started it, and it must come back after a reboot, because the handover stays open for 48 h.
#
# The hostname is random per run. Read it from the log after the task starts, or from the
# `Show public URL` line below.

$ErrorActionPreference = "Stop"
$taskName = "ArcumHandoverTunnel"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cmd = Join-Path $PSScriptRoot "run-handover-tunnel.cmd"
$log = Join-Path $root "app\logs\tunnel.log"

if (-not (Test-Path $cmd)) { throw "missing $cmd" }

& schtasks /create /tn $taskName /tr "`"$cmd`"" /sc onstart /ru SYSTEM /rl HIGHEST /f | Out-Null
if ($LASTEXITCODE -ne 0) { throw "schtasks /create failed with $LASTEXITCODE" }

$xml = & schtasks /query /tn $taskName /xml
$xml = $xml -replace "<DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries>", "<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>"
$xml = $xml -replace "<StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>", "<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>"
$tmp = Join-Path $env:TEMP "arcum-tunnel-task.xml"
$xml | Set-Content -Path $tmp -Encoding Unicode
& schtasks /create /tn $taskName /xml $tmp /f | Out-Null
Remove-Item $tmp -Force

& schtasks /run /tn $taskName | Out-Null
Start-Sleep -Seconds 15

$url = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches |
    ForEach-Object { $_.Matches.Value } | Select-Object -Last 1

Write-Host "task $taskName registered"
Write-Host "Show public URL: $url"
