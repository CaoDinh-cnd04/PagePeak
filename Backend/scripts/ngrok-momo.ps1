# Chay ngrok huong toi API (mac dinh 5000), in va tuy chon cap nhat MoMo:IpnUrl trong appsettings.Local.json
# Yeu cau: da cai ngrok va: ngrok config add-authtoken <TOKEN>
param(
    [int]$Port = 5000,
    [switch]$UpdateConfig
)

$ErrorActionPreference = "Stop"
$apiPath = "/api/payments/momo/ipn"
$localSettingsPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\src\LadiPage.Api\appsettings.Local.json"))
$bundledNgrok = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\tools\ngrok\ngrok.exe"))

if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    $script:NgrokExe = "ngrok"
}
elseif (Test-Path -LiteralPath $bundledNgrok) {
    $script:NgrokExe = $bundledNgrok
}
else {
    Write-Host ""
    Write-Host "Chua co ngrok. Giai nen ngrok vao: Backend\tools\ngrok\ngrok.exe" -ForegroundColor Yellow
    Write-Host "  Hoac cai PATH: https://ngrok.com/download" -ForegroundColor Gray
    Write-Host "  Bat buoc: ngrok config add-authtoken <TOKEN> (https://dashboard.ngrok.com/get-started/your-authtoken)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

function Get-NgrokHttpsUrl {
    try {
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
        $https = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($https.public_url) { return $https.public_url.TrimEnd('/') }
    } catch {
    }
    return $null
}

$existing = Get-NgrokHttpsUrl
if (-not $existing) {
    Write-Host "Dang khoi dong ngrok http $Port ..." -ForegroundColor Cyan
    Start-Process -FilePath $NgrokExe -ArgumentList @("http", "$Port") -WindowStyle Minimized
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        $existing = Get-NgrokHttpsUrl
        if ($existing) { break }
    }
}

if (-not $existing) {
    Write-Host "Khong lay duoc URL tu ngrok (http://127.0.0.1:4040)." -ForegroundColor Red
    Write-Host "Neu chua co authtoken, chay mot lan (lay token tai https://dashboard.ngrok.com/get-started/your-authtoken):" -ForegroundColor Yellow
    Write-Host "  & `"$NgrokExe`" config add-authtoken <TOKEN_CUA_BAN>" -ForegroundColor White
    Write-Host ""
    exit 1
}

$ipnUrl = "$existing$apiPath"
Write-Host ""
Write-Host "HTTPS ngrok: $existing" -ForegroundColor Green
Write-Host "MoMo IpnUrl: $ipnUrl" -ForegroundColor Green
Write-Host ""

if ($UpdateConfig -and (Test-Path -LiteralPath $localSettingsPath)) {
    $raw = Get-Content -LiteralPath $localSettingsPath -Raw -Encoding UTF8
    if ($raw -match '"IpnUrl"\s*:\s*"[^"]*"') {
        $replaceWith = '"IpnUrl": "' + $ipnUrl + '"'
        $newRaw = $raw -replace '"IpnUrl"\s*:\s*"[^"]*"', $replaceWith
        [System.IO.File]::WriteAllText($localSettingsPath, $newRaw, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Da cap nhat: $localSettingsPath" -ForegroundColor Green
        Write-Host "Khoi dong lai API (dotnet run) de ap dung." -ForegroundColor Yellow
    }
    else {
        Write-Host "Khong tim thay khoa MoMo IpnUrl trong appsettings.Local.json - cap nhat tay." -ForegroundColor Yellow
    }
}
elseif ($UpdateConfig) {
    Write-Host "Khong tim thay appsettings.Local.json - cap nhat tay IpnUrl trong file MoMo." -ForegroundColor Yellow
}
else {
    Write-Host "De tu dong ghi vao appsettings.Local.json, chay:" -ForegroundColor Gray
    Write-Host "  .\scripts\ngrok-momo.ps1 -UpdateConfig" -ForegroundColor White
    Write-Host ""
}
