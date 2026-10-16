# Pure version checks and a staged core replacement shared by bootstrap and its tests.
function Test-MoonBitCompilerVersion([string]$Output, [string]$Version) {
    $pattern = '(?m)^(?:moonc\s+)?v?' + [Regex]::Escape($Version) + '(?:\s|$)'
    return $Output -match $pattern
}

function Get-MoonBitCoreVersion([string]$CoreDirectory) {
    $manifest = Join-Path $CoreDirectory 'moon.mod'
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { return $null }
    $text = Get-Content -LiteralPath $manifest -Raw -ErrorAction Stop
    $match = [Regex]::Match($text, '(?m)^\s*version\s*=\s*"([^"\r\n]+)"\s*$')
    if (-not $match.Success) { return $null }
    return $match.Groups[1].Value
}

function Assert-MoonBitManagedPath([string]$Target, [string]$MoonHome) {
    $rootPath = [IO.Path]::GetFullPath($MoonHome).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $targetPath = [IO.Path]::GetFullPath($Target)
    $prefix = $rootPath + [IO.Path]::DirectorySeparatorChar
    if (-not $targetPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Toolchain path is outside the intended installation: $targetPath"
    }
    # Refuse junctions/symlinks in the target or its parents before recursive moves/deletion.
    $current = $targetPath
    while ($current.Length -ge $rootPath.Length) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Toolchain path contains a reparse point: $current"
            }
        }
        if ($current -eq $rootPath) { break }
        $current = Split-Path -Parent $current
    }
}

function Install-MoonBitCore([string]$Archive, [string]$MoonHome, [string]$Version) {
    $installPath = [IO.Path]::GetFullPath($MoonHome)
    $corePath = Join-Path $installPath 'lib/core'
    $stagePath = Join-Path $installPath ('core-staging-' + [Guid]::NewGuid().ToString('N'))
    $newCorePath = Join-Path $stagePath 'core'
    $backupPath = Join-Path $stagePath 'previous-core'
    Assert-MoonBitManagedPath $corePath $installPath
    Assert-MoonBitManagedPath $stagePath $installPath
    New-Item -ItemType Directory -Path $stagePath -Force | Out-Null
    try {
        Expand-Archive -LiteralPath $Archive -DestinationPath $stagePath -Force
        if ((Get-MoonBitCoreVersion $newCorePath) -ne $Version) {
            throw "Downloaded core does not match required version $Version"
        }
        # Stage and inspect first: corrupt/wrong archives cannot remove the old core.
        New-Item -ItemType Directory -Path (Join-Path $installPath 'lib') -Force | Out-Null
        Assert-MoonBitManagedPath $corePath $installPath
        Assert-MoonBitManagedPath $backupPath $installPath
        if (Test-Path -LiteralPath $corePath) {
            Move-Item -LiteralPath $corePath -Destination $backupPath
        }
        try {
            Assert-MoonBitManagedPath $newCorePath $installPath
            Move-Item -LiteralPath $newCorePath -Destination $corePath
        } catch {
            if (Test-Path -LiteralPath $backupPath) {
                Move-Item -LiteralPath $backupPath -Destination $corePath
            }
            throw
        }
    } finally {
        # Keep a backup if a replacement/rollback failed; never delete its only remaining copy.
        $backupExists = Test-Path -LiteralPath $backupPath
        if ($backupExists -and -not (Test-Path -LiteralPath $corePath)) {
            Write-Warning "Previous core retained at $backupPath"
        } else {
            Assert-MoonBitManagedPath $stagePath $installPath
            Remove-Item -LiteralPath $stagePath -Recurse -Force
        }
    }
}
