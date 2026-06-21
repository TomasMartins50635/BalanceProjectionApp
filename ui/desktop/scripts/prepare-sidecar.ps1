# Publishes the .NET API as a single-file self-contained Windows x64 binary
# and copies it to the Tauri binaries folder.
# Called by tauri.conf.json `beforeBuildCommand` from the src-tauri/ directory.
$ErrorActionPreference = "Stop"

$root      = (Resolve-Path "$PSScriptRoot/../../..").Path
$apiProj   = "$root/src/BalanceProjectionApp.ApiService"
$publishOut = "$root/publish/api"
$binaries  = "$PSScriptRoot/../src-tauri/binaries"

Write-Host "→ Publishing .NET API (single-file, win-x64)..."
dotnet publish $apiProj `
    -c Release -r win-x64 --self-contained true `
    /p:PublishSingleFile=true `
    /p:DebugType=None /p:DebugSymbols=false `
    --output $publishOut `
    --nologo

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "→ Copying sidecar binary..."
New-Item -ItemType Directory -Force -Path $binaries | Out-Null
Copy-Item "$publishOut/BalanceProjectionApp.ApiService.exe" `
    "$binaries/api-x86_64-pc-windows-msvc.exe" -Force

Write-Host "→ Sidecar ready."
