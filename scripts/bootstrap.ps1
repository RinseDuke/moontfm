$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolchainVersion = (Get-Content -Raw (Join-Path $projectRoot 'moon-toolchain')).Trim()
$toolRoot = Join-Path $projectRoot '.tools'
$installRoot = Join-Path $toolRoot 'moon'
$moonCommand = Join-Path $installRoot 'bin/moon.exe'
$compilerCommand = Join-Path $installRoot 'bin/moonc.exe'
$downloadVersion = [Uri]::EscapeDataString($toolchainVersion)

function Download-File([string]$uri, [string]$destination) {
    & curl.exe --fail --location --retry 3 --max-time 600 --silent --show-error $uri --output $destination
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $uri" }
}

$installed = $false
if (Test-Path -LiteralPath $compilerCommand) {
    $installed = (& $compilerCommand -v) -match [Regex]::Escape($toolchainVersion)
}
if (-not $installed) {
    New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
    $archive = Join-Path $toolRoot 'moonbit.zip'
    $checksum = Join-Path $toolRoot 'moonbit.zip.sha256'
    Download-File "https://cli.moonbitlang.com/binaries/$downloadVersion/moonbit-windows-x86_64.zip" $archive
    Download-File "https://cli.moonbitlang.com/binaries/$downloadVersion/moonbit-windows-x86_64.zip.sha256" $checksum
    $expectedHash = ((Get-Content -Raw $checksum) -split '\s+')[0]
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
        throw 'MoonBit archive checksum mismatch'
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $installRoot -Force
}
if (-not (Test-Path -LiteralPath (Join-Path $installRoot 'lib/core/moon.mod'))) {
    $coreArchive = Join-Path $toolRoot 'core.zip'
    Download-File "https://cli.moonbitlang.com/cores/core-$downloadVersion.zip" $coreArchive
    Expand-Archive -LiteralPath $coreArchive -DestinationPath (Join-Path $installRoot 'lib') -Force
}
$env:MOON_HOME = $installRoot
$env:PATH = "$(Join-Path $installRoot 'bin');$env:PATH"
Push-Location (Join-Path $installRoot 'lib/core')
try {
    & $moonCommand bundle --target js --warn-list -a
    if ($LASTEXITCODE -ne 0) { throw 'MoonBit core bundle failed' }
} finally { Pop-Location }
& $moonCommand version --all
Write-Output 'MoonBit is ready for this PowerShell session; user PATH and profile were not changed.'
