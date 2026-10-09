param(
    [Parameter(Mandatory=$true)]
    [string]$JsonPath,
    [switch]$Desktop
)

$ErrorActionPreference = 'Stop'

$data = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$items = $data.Items

$startMenu = [Environment]::GetFolderPath('StartMenu') + '\Programs\WinStartScanner'
if (-not (Test-Path $startMenu)) {
    New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
}

$shell = New-Object -ComObject WScript.Shell
$created = 0
$errors = 0

foreach ($item in $items) {
    $exePath = $item.Path
    $name = [System.IO.Path]::GetFileNameWithoutExtension($item.Name)

    if (-not (Test-Path $exePath)) {
        $errors++
        continue
    }

    $lnkPath = "$startMenu\$name.lnk"
    try {
        $sc = $shell.CreateShortcut($lnkPath)
        $sc.TargetPath = $exePath
        $sc.WorkingDirectory = [System.IO.Path]::GetDirectoryName($exePath)
        if ($item.Description) {
            $sc.Description = $item.Description
        }
        $sc.Save()
        $created++
    } catch {
        $errors++
    }
}

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null

$desktopLinks = 0
if ($Desktop) {
    $desktopDir = [Environment]::GetFolderPath('Desktop') + '\WinStartScanner'
    if (-not (Test-Path $desktopDir)) {
        New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
    }
    foreach ($item in $items) {
        $exePath = $item.Path
        $name = [System.IO.Path]::GetFileNameWithoutExtension($item.Name)
        if (-not (Test-Path $exePath)) { continue }
        $deskLnk = "$desktopDir\$name.lnk"
        try {
            $sc = $shell.CreateShortcut($deskLnk)
            $sc.TargetPath = $exePath
            $sc.WorkingDirectory = [System.IO.Path]::GetDirectoryName($exePath)
            $sc.Save()
            $desktopLinks++
        } catch {}
    }
}

$result = @{
    Created = $created
    DesktopCreated = $desktopLinks
    Errors = $errors
    Folder = $startMenu
    DesktopFolder = if ($Desktop) { [Environment]::GetFolderPath('Desktop') + '\WinStartScanner' } else { '' }
} | ConvertTo-Json

Write-Host "RESULT:$result"
