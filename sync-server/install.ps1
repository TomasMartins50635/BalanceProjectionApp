#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala o Gestão Tesouraria Sync Server como serviço Windows.
.DESCRIPTION
    Descarrega o binário mais recente do GitHub Releases, instala-o como
    serviço Windows e configura o firewall automaticamente.
.PARAMETER ApiKey
    Chave de autenticação. Se omitida, é gerada automaticamente.
.PARAMETER Port
    Porta de escuta. Predefinição: 5536.
.PARAMETER DataDir
    Diretório para guardar a base de dados. Predefinição: C:\GestaoSync\data.
.PARAMETER InstallDir
    Diretório de instalação. Predefinição: C:\GestaoSync.
.EXAMPLE
    .\install.ps1
.EXAMPLE
    .\install.ps1 -ApiKey "minha-chave" -Port 5536
#>

param(
    [string]$ApiKey    = "",
    [int]   $Port      = 5536,
    [string]$DataDir   = "C:\GestaoSync\data",
    [string]$InstallDir = "C:\GestaoSync"
)

$ServiceName = "GestaoTesouraria-Sync"
$DisplayName = "Gestão Tesouraria - Sync Server"
$Repo        = "TomasMartins50635/BalanceProjectionApp"

# ── Funções utilitárias ────────────────────────────────────────────────────────

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "   ERRO: $msg" -ForegroundColor Red; exit 1 }

# ── Boas-vindas ────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "==========================================" -ForegroundColor White
Write-Host "  Gestao Tesouraria - Sync Server Setup  " -ForegroundColor White
Write-Host "==========================================" -ForegroundColor White

# ── API Key ────────────────────────────────────────────────────────────────────

if ($ApiKey -eq "") {
    $ApiKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    Write-Host "`n  Chave de API gerada automaticamente:" -ForegroundColor Yellow
    Write-Host "  $ApiKey" -ForegroundColor Yellow
    Write-Host "  Guarda esta chave — precisas dela na app desktop." -ForegroundColor Yellow
}

# ── Confirmar configuração ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "  Configuracao:" -ForegroundColor White
Write-Host "    Porta      : $Port"
Write-Host "    Diretorio  : $InstallDir"
Write-Host "    Dados      : $DataDir"
Write-Host "    Servico    : $ServiceName"
Write-Host ""
$confirm = Read-Host "  Continuar? (S/N)"
if ($confirm -notmatch "^[Ss]") { Write-Host "  Cancelado." -ForegroundColor Yellow; exit 0 }

# ── Descarregar binário ────────────────────────────────────────────────────────

Write-Step "A descarregar binário do GitHub Releases..."

try {
    $release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
    $asset   = $release.assets | Where-Object { $_.name -eq "sync-server-win-x64.zip" } | Select-Object -First 1
    if (-not $asset) { Write-Fail "Binário 'sync-server-win-x64.zip' não encontrado na release '$($release.tag_name)'." }

    $zipPath = Join-Path $env:TEMP "sync-server.zip"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing
    Write-Ok "Descarregado: $($release.tag_name)"
} catch {
    Write-Fail "Erro ao descarregar: $_"
}

# ── Parar e remover serviço existente ─────────────────────────────────────────

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Step "A remover instalação anterior..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    Write-Ok "Serviço anterior removido"
}

# ── Instalar ficheiros ─────────────────────────────────────────────────────────

Write-Step "A instalar ficheiros em $InstallDir..."

if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $DataDir    -Force | Out-Null

Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
Remove-Item $zipPath -Force

$exe = Get-ChildItem "$InstallDir\*.exe" | Select-Object -First 1
if (-not $exe) { Write-Fail "Executável não encontrado em $InstallDir após extração." }
Write-Ok "Ficheiros instalados"

# ── Registar serviço Windows ───────────────────────────────────────────────────

Write-Step "A registar serviço Windows..."

$binPath = "`"$($exe.FullName)`" --urls `"http://0.0.0.0:$Port`""
sc.exe create $ServiceName binPath= $binPath DisplayName= $DisplayName start= auto | Out-Null
sc.exe description $ServiceName "Servidor de sincronização da base de dados do Gestão Tesouraria." | Out-Null

# Variáveis de ambiente via registo
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName\Environment"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "ApiKey"  -Value $ApiKey
Set-ItemProperty -Path $regPath -Name "DataDir" -Value $DataDir

Write-Ok "Serviço registado"

# ── Regra de firewall ──────────────────────────────────────────────────────────

Write-Step "A configurar firewall (porta $Port)..."

Remove-NetFirewallRule -DisplayName "GestaoSync-$Port" -ErrorAction SilentlyContinue
New-NetFirewallRule `
    -DisplayName "GestaoSync-$Port" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -Action Allow `
    -Profile Any | Out-Null

Write-Ok "Regra de firewall criada"

# ── Iniciar serviço ────────────────────────────────────────────────────────────

Write-Step "A iniciar serviço..."

Start-Service -Name $ServiceName
Start-Sleep -Seconds 3

$svc = Get-Service -Name $ServiceName
if ($svc.Status -eq "Running") {
    Write-Ok "Serviço em execução"
} else {
    Write-Host "   AVISO: O serviço pode nao ter iniciado (estado: $($svc.Status))." -ForegroundColor Yellow
    Write-Host "   Verifica o Event Viewer para mais detalhes." -ForegroundColor Yellow
}

# ── Resumo final ───────────────────────────────────────────────────────────────

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL do servidor : http://$ip`:$Port" -ForegroundColor White
Write-Host "  Chave de API    : $ApiKey" -ForegroundColor White
Write-Host ""
Write-Host "  Configura estes valores na app desktop em:" -ForegroundColor Gray
Write-Host "  Definicoes > Sincronizacao" -ForegroundColor Gray
Write-Host ""
Write-Host "  Gerir o servico:" -ForegroundColor Gray
Write-Host "    Start : Start-Service $ServiceName" -ForegroundColor Gray
Write-Host "    Stop  : Stop-Service $ServiceName" -ForegroundColor Gray
Write-Host "    Logs  : Event Viewer > Windows Logs > Application" -ForegroundColor Gray
Write-Host ""
