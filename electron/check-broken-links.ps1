param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$startMenuDirs = @(
    [Environment]::GetFolderPath('StartMenu')
    [Environment]::GetFolderPath('CommonStartMenu')
    "$env:APPDATA\Microsoft\Windows\Start Menu"
    "$env:ProgramData\Microsoft\Windows\Start Menu"
) | Where-Object { Test-Path $_ }

$shell = New-Object -ComObject WScript.Shell
$broken = [System.Collections.ArrayList]::new()
$total = 0
$valid = 0

foreach ($dir in $startMenuDirs) {
    Get-ChildItem "$dir\*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        $total++
        try {
            $sc = $shell.CreateShortcut($_.FullName)
            $target = $sc.TargetPath
            if ($target -and (Test-Path $target)) {
                $valid++
            } else {
                [void]$broken.Add(@{
                    LinkPath = $_.FullName
                    RelativePath = $_.FullName.Substring($dir.Length).TrimStart('\')
                    TargetPath = if ($target) { $target } else { '' }
                    Name = $_.BaseName
                    LastWrite = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
                })
            }
        } catch {
            [void]$broken.Add(@{
                LinkPath = $_.FullName
                RelativePath = $_.FullName.Substring($dir.Length).TrimStart('\')
                TargetPath = '(inaccessible)'
                Name = $_.BaseName
                LastWrite = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            })
        }
    }
}

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null

$result = @{
    TotalLinks = $total
    ValidLinks = $valid
    BrokenLinks = $broken.Count
    Broken = @($broken)
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$json = $result | ConvertTo-Json -Depth 3 -Compress
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host "DONE:$OutputPath"