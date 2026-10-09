param(
  [Parameter(Mandatory = $true)]
  [string]$JsonPath
)

$ErrorActionPreference = 'Stop'

try {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $raw = [System.IO.File]::ReadAllText($JsonPath, $utf8)
  if ($raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
  $data = $raw | ConvertFrom-Json

  $startMenuPath = [Environment]::GetFolderPath('StartMenu') + '\Programs'
  $created = 0
  $moved = 0
  $errors = 0
  $errorDetails = @()

  $shell = New-Object -ComObject WScript.Shell

  foreach ($action in $data.Actions) {
    try {
      $type = $action.Type
      if ($type -eq 'create_folder') {
        $folderPath = Join-Path $startMenuPath $action.FolderPath
        if (-not (Test-Path -LiteralPath $folderPath)) {
          New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
        }
        $created++
      }
      elseif ($type -eq 'move_shortcut') {
        $source = $action.SourcePath
        $destFolder = Join-Path $startMenuPath $action.DestinationFolder
        if (-not (Test-Path -LiteralPath $destFolder)) {
          New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
        }
        $destPath = Join-Path $destFolder (Split-Path $source -Leaf)
        if (Test-Path -LiteralPath $source) {
          if (Test-Path -LiteralPath $destPath) {
            Remove-Item -LiteralPath $destPath -Force
          }
          Move-Item -LiteralPath $source -Destination $destPath -Force
          $moved++
        } else {
          $errors++
          $errorDetails += "Source not found: $source"
        }
      }
      elseif ($type -eq 'create_shortcut') {
        $destFolder = Join-Path $startMenuPath $action.DestinationFolder
        if (-not (Test-Path -LiteralPath $destFolder)) {
          New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
        }
        $shortcutPath = Join-Path $destFolder ($action.Name + '.lnk')
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $action.TargetPath
        if ($action.WorkingDirectory) { $shortcut.WorkingDirectory = $action.WorkingDirectory }
        if ($action.IconLocation) { $shortcut.IconLocation = $action.IconLocation }
        if ($action.Description) { $shortcut.Description = $action.Description }
        $shortcut.Save()
        $null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut)
        $created++
      }
      elseif ($type -eq 'rename') {
        $source = $action.SourcePath
        $newName = $action.NewName
        $parent = Split-Path $source -Parent
        $ext = [System.IO.Path]::GetExtension($source)
        if (-not $ext) { $ext = '.lnk' }
        $destPath = Join-Path $parent ($newName + $ext)
        if (Test-Path -LiteralPath $source) {
          Rename-Item -LiteralPath $source -NewName ($newName + $ext) -Force
          $moved++
        } else {
          $errors++
          $errorDetails += "Source not found: $source"
        }
      }
      elseif ($type -eq 'delete') {
        $source = $action.SourcePath
        if (Test-Path -LiteralPath $source) {
          if ((Get-Item -LiteralPath $source) -is [System.IO.DirectoryInfo]) {
            Remove-Item -LiteralPath $source -Recurse -Force
          } else {
            Remove-Item -LiteralPath $source -Force
          }
        }
      }
    }
    catch {
      $errors++
      $errorDetails += "$($action.Type): $($_.Exception.Message)"
    }
  }

  $null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell)

  $result = @{
    Success = $true
    Created = $created
    Moved = $moved
    Errors = $errors
    ErrorDetails = $errorDetails
  }
  Write-Host "RESULT:$($result | ConvertTo-Json -Compress)"
}
catch {
  $result = @{
    Success = $false
    Error = $_.Exception.Message
  }
  Write-Host "RESULT:$($result | ConvertTo-Json -Compress)"
}
