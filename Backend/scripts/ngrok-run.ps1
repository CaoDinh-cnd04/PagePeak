# Chay ngrok khi chua them vao PATH. Vi du: .\scripts\ngrok-run.ps1 5000
param(
    [Parameter(Mandatory = $true)]
    [int]$Port
)
$exe = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\tools\ngrok\ngrok.exe"))
if (-not (Test-Path -LiteralPath $exe)) {
    Write-Error "Khong tim thay: $exe — tai ngrok va giai vao Backend\tools\ngrok\"
    exit 1
}
& $exe http $Port
