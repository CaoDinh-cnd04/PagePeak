# Chay Backend API (tu dong cd vao thu muc Backend, tranh loi duong dan co dau cach)
Set-Location $PSScriptRoot

function Get-PidsListeningOnPort([int]$port) {
    $pids = @()
    try {
        $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        # fallback netstat (hoat dong tren nhieu may)
        $pids = (netstat -ano | Select-String -Pattern (':{0}\s+.*LISTENING\s+(\d+)$' -f $port) | ForEach-Object { $_.Matches[0].Groups[1].Value }) |
            Select-Object -Unique
    }
    return $pids | Where-Object { $_ -and ([int]$_) -ne 0 } | ForEach-Object { [int]$_ } | Select-Object -Unique
}

function Free-Port([int]$port, [int]$maxTries = 10) {
    for ($i = 0; $i -lt $maxTries; $i++) {
        $pids = Get-PidsListeningOnPort $port
        if (-not $pids -or $pids.Count -eq 0) { return $true }

        foreach ($procId in $pids) {
            if ($procId -and $procId -ne $PID) {
                try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch { }
                try { taskkill /PID $procId /F | Out-Null } catch { }
            }
        }

        Start-Sleep -Milliseconds 300
    }
    return $false
}

# Neu port 5000 dang bi chiem, tu dong tat process de tranh loi "address already in use"
[void](Free-Port 5000 15)

$dotnet = "C:\Program Files\dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) {
    $dotnet = "dotnet"
}
& $dotnet run --project src/LadiPage.Api
