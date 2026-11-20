# Opens TCP 8899 on the private network only, so the phone can load the signing page.
#
# Scope: `-Profile Private` and `-RemoteAddress LocalSubnet`. The page is static and holds no
# key, but it should still not be reachable from outside the LAN.
#
# Needs elevation: `netsh advfirewall` refuses to add rules otherwise.

$ErrorActionPreference = "Stop"
$name = "Arcum Handover HTTP"

$existing = netsh advfirewall firewall show rule name="$name" 2>$null
if ($LASTEXITCODE -eq 0 -and $existing -match "Rule Name") {
    Write-Host "rule already present"
} else {
    netsh advfirewall firewall add rule name="$name" dir=in action=allow protocol=TCP localport=8899 profile=private remoteip=LocalSubnet | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "netsh add rule failed with $LASTEXITCODE" }
    Write-Host "rule added"
}
netsh advfirewall firewall show rule name="$name"
