$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'toolchain-state.ps1')
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
    $compilerOutput = (& $compilerCommand -v 2>&1 | Out-String)
    $installed = ($LASTEXITCODE -eq 0) -and (Test-MoonBitCompilerVersion $compilerOutput $toolchainVersion)
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
$compilerOutput = (& $compilerCommand -v 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or -not (Test-MoonBitCompilerVersion $compilerOutput $toolchainVersion)) {
    throw "Installed compiler does not match required version $toolchainVersion"
}
$coreDirectory = Join-Path $installRoot 'lib/core'
if ((Get-MoonBitCoreVersion $coreDirectory) -ne $toolchainVersion) {
    $coreArchive = Join-Path $toolRoot 'core.zip'
    Download-File "https://cli.moonbitlang.com/cores/core-$downloadVersion.zip" $coreArchive
    Install-MoonBitCore $coreArchive $installRoot $toolchainVersion
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
