param([Parameter(Mandatory)][string]$Scenario)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $projectRoot 'scripts/toolchain-state.ps1')
$testRoot = Join-Path $projectRoot ('.tools/bootstrap-tests-' + [Guid]::NewGuid().ToString('N'))
$moonHome = Join-Path $testRoot 'moon'
$corePath = Join-Path $moonHome 'lib/core'
$version = '0.10.15+943464bfa'
function Require([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Write-Core([string]$Directory, [string]$CoreVersion) {
    New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $Directory 'moon.mod') -Value "name = `"moonbitlang/core`"`nversion = `"$CoreVersion`""
}
function Make-Archive([string]$CoreVersion) {
    $source = Join-Path $testRoot 'archive-source/core'
    Write-Core $source $CoreVersion
    Set-Content -LiteralPath (Join-Path $source 'fresh.mbt') -Value '// fresh source'
    $zip = Join-Path $testRoot 'core.zip'
    Compress-Archive -LiteralPath $source -DestinationPath $zip -Force
    return $zip
}
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
try {
    switch ($Scenario) {
        'compiler-version' {
            Require (Test-MoonBitCompilerVersion "v$version (2026-10-12)" $version) 'Direct moonc -v output rejected'
            Require (Test-MoonBitCompilerVersion "moonc v$version (2026-10-12)" $version) 'Matching compiler rejected'
            Require (-not (Test-MoonBitCompilerVersion "moonc v$version-stale (2026-10-12)" $version)) 'Version suffix accepted'
            Require (-not (Test-MoonBitCompilerVersion "moonc v0.10.15+other (2026-10-12)" $version)) 'Wrong build accepted'
            Require (-not (Test-MoonBitCompilerVersion "failed to load $version" $version)) 'Error text accepted as compiler version'
        }
        'core-version' {
            Require ($null -eq (Get-MoonBitCoreVersion $corePath)) 'Missing manifest should have no version'
            Write-Core $corePath $version
            Require ((Get-MoonBitCoreVersion $corePath) -eq $version) 'Matching core version not read'
            Write-Core $corePath 'old-version'
            Require ((Get-MoonBitCoreVersion $corePath) -ne $version) 'Stale core accepted'
            Set-Content -LiteralPath (Join-Path $corePath 'moon.mod') -Value 'name = "moonbitlang/core"'
            Require ($null -eq (Get-MoonBitCoreVersion $corePath)) 'Malformed manifest accepted'
        }
        'replace-stale-core' {
            Write-Core $corePath 'old-version'
            Set-Content -LiteralPath (Join-Path $corePath 'obsolete.mbt') -Value '// must not survive replacement'
            $archive = Make-Archive $version
            Install-MoonBitCore $archive $moonHome $version
            Require ((Get-MoonBitCoreVersion $corePath) -eq $version) 'Core was not replaced'
            Require (Test-Path -LiteralPath (Join-Path $corePath 'fresh.mbt')) 'New source missing'
            Require (-not (Test-Path -LiteralPath (Join-Path $corePath 'obsolete.mbt'))) 'Old sources survived'
            Require (@(Get-ChildItem -LiteralPath $moonHome -Filter 'core-staging-*').Count -eq 0) 'Staging leaked'
        }
        'wrong-archive-preserves-core' {
            Write-Core $corePath 'old-version'
            $archive = Make-Archive 'wrong-version'
            $rejected = $false
            try { Install-MoonBitCore $archive $moonHome $version } catch { $rejected = $true }
            Require $rejected 'Wrong archive accepted'
            Require ((Get-MoonBitCoreVersion $corePath) -eq 'old-version') 'Existing core was changed'
            Require (@(Get-ChildItem -LiteralPath $moonHome -Filter 'core-staging-*').Count -eq 0) 'Failed staging leaked'
        }
        'corrupt-archive-preserves-core' {
            Write-Core $corePath 'old-version'
            $archive = Join-Path $testRoot 'broken.zip'
            Set-Content -LiteralPath $archive -Value 'not a ZIP file'
            $rejected = $false
            try { Install-MoonBitCore $archive $moonHome $version } catch { $rejected = $true }
            Require $rejected 'Corrupt archive accepted'
            Require ((Get-MoonBitCoreVersion $corePath) -eq 'old-version') 'Existing core was changed'
        }
        'fresh-install' {
            $archive = Make-Archive $version
            Install-MoonBitCore $archive $moonHome $version
            Require ((Get-MoonBitCoreVersion $corePath) -eq $version) 'Fresh core not installed'
        }
        default { throw "Unknown scenario: $Scenario" }
    }
    Write-Output "PASS: $Scenario"
} finally {
    # All recursive cleanup is constrained to this test's exact workspace-local directory.
    $expectedParent = [IO.Path]::GetFullPath((Join-Path $projectRoot '.tools'))
    Require ((Split-Path -Parent ([IO.Path]::GetFullPath($testRoot))) -eq $expectedParent) 'Unsafe test cleanup path'
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}
