$ErrorActionPreference = 'Stop'

$stamp = [DateTime]::Now.ToString('yyyyMMdd_HHmmss_fff')
$outputFile = "$env:TEMP\winstart_scan_$stamp.json"

Write-Host "STATUS:Collecting Start Menu shortcuts..."

$startMenuDirs = @(
    [Environment]::GetFolderPath('StartMenu')
    [Environment]::GetFolderPath('CommonStartMenu')
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
) | Where-Object { Test-Path $_ }

$shortcutTargets = @{}
$foldersScanned = 0
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in $startMenuDirs) {
    try {
        Get-ChildItem "$dir\*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $sc = $shell.CreateShortcut($_.FullName)
                $target = $sc.TargetPath.ToLowerInvariant()
                if ($target) { $shortcutTargets[$target] = $true }
            } catch {}
        }
        $foldersScanned++
    } catch {}
}
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null

Write-Host "STATUS:$($shortcutTargets.Count) shortcuts analyzed"

$searchDirs = @(
    [Environment]::GetFolderPath('ProgramFiles')
    [Environment]::GetFolderPath('ProgramFilesX86')
    [Environment]::GetFolderPath('LocalApplicationData')
) | Where-Object { $_ -and (Test-Path $_) }

$skipDirPatterns = @(
    '\WindowsApps', '\WinSxS', '\Installer', '\Microsoft.NET',
    '\node_modules', '\packages', '\cache', '\Cache',
    '.git', '\temp', '\Temp', '\Backup',
    '\Windows Kits', '\Reference Assemblies',
    '\MSBuild\Microsoft', '\Common7\IDE'
)

$systemDirPaths = @(
    ([Environment]::GetFolderPath('System') + '\').ToLowerInvariant()
    ([Environment]::GetFolderPath('SystemX86') + '\').ToLowerInvariant()
    ($env:SystemRoot + '\WinSxS\').ToLowerInvariant()
    ($env:SystemRoot + '\Installer\').ToLowerInvariant()
    ($env:SystemRoot + '\Microsoft.NET\').ToLowerInvariant()
)

$exeFiles = [System.Collections.ArrayList]::new()
foreach ($dir in $searchDirs) {
    Write-Host "STATUS:Scanning $dir..."
    $dirLower = $dir.ToLowerInvariant()
    try {
        Get-ChildItem -Path $dir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue -Attributes !Directory |
            Where-Object {
                $skip = $false
                if ($_.Length -eq 0) { $skip = $true }
                if (-not $skip) {
                    $full = $_.FullName.ToLowerInvariant()
                    foreach ($sd in $systemDirPaths) {
                        if ($full.StartsWith($sd)) { $skip = $true; break }
                    }
                }
                if (-not $skip) {
                    foreach ($pat in $skipDirPatterns) {
                        if ($full -match [regex]::Escape($pat.ToLowerInvariant())) { $skip = $true; break }
                    }
                }
                -not $skip
            } | ForEach-Object {
                [void]$exeFiles.Add($_.FullName)
            }
    } catch {}
    $foldersScanned++
}

$total = $exeFiles.Count
$processed = 0
$orphanCount = 0

Write-Host "STATUS:Analyzing $total executables..."

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$fh = $null
try {
    $fh = [System.IO.StreamWriter]::new($outputFile, $false, $utf8NoBom)
    $fh.Write('{"Orphans":[')
    $firstOrphan = $true

    foreach ($exe in $exeFiles) {
        $processed++
        $pct = 20 + [int]((80 * $processed) / [Math]::Max($total, 1))

        $lower = $exe.ToLowerInvariant()
        if (-not $shortcutTargets.ContainsKey($lower)) {
            try {
                $fi = Get-Item $exe -ErrorAction SilentlyContinue
                if ($fi) {
                    $orphanCount++
                    $vi = $fi.VersionInfo
                    function Esc($s) {
                        $s = $s.Replace('\', '\\')
                        $s = $s.Replace('"', '\"')
                        $s = $s.Replace("`n", '\n')
                        $s = $s.Replace("`r", '\r')
                        $s = $s.Replace("`t", '\t')
                        return $s
                    }
                    $name = Esc($fi.Name)
                    $path = Esc($exe)
                    $company = if ($vi.CompanyName) { Esc($vi.CompanyName) } else { '' }
                    $desc = if ($vi.FileDescription) { Esc($vi.FileDescription) } else { '' }
                    $product = if ($vi.ProductName) { Esc($vi.ProductName) } else { '' }
                    $sigStatus = ''
                    try { $sig = Get-AuthenticodeSignature $exe; if ($sig) { $sigStatus = $sig.Status.ToString() } } catch {}
                    $json = "{`"Name`":`"$name`",`"Path`":`"$path`",`"Size`":$($fi.Length),`"Company`":`"$company`",`"Description`":`"$desc`",`"Product`":`"$product`",`"SignatureStatus`":`"$sigStatus`"}"
                    if (-not $firstOrphan) { $fh.Write(',') }
                    $fh.Write($json)
                    $firstOrphan = $false

                    if ($orphanCount % 10 -eq 0) {
                        Write-Host "ORPHAN:$orphanCount"
                    }
                }
            } catch {}
        }

        if ($processed % 50 -eq 0 -or $processed -eq $total) {
            Write-Host "PROGRESS:$pct"
            Write-Host "STATUS:$processed of $total - $orphanCount orphans"
        }
    }

    $fh.Write("],`"TotalScanned`":$total,`"FoldersScanned`":$foldersScanned}")
} finally {
    if ($fh) { $fh.Close() }
}

Write-Host "PROGRESS:100"
Write-Host "STATUS:Complete - $orphanCount orphans found"
Write-Host "DONE:$outputFile"