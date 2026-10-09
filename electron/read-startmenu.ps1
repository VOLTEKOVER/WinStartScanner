param(
  [Parameter(Mandatory = $false)]
  [string]$OutputPath
)

if (-not $OutputPath) { $OutputPath = $env:TEMP + '\winstart_menu_structure.json' }

$startMenuPath = [Environment]::GetFolderPath('StartMenu') + '\Programs'

function Esc($s) {
  if (-not $s) { return '' }
  return [System.Security.SecurityElement]::Escape($s).Replace("'","''")
}

function Get-StartMenuTree {
  param([string]$Path, [string]$RelativePath = '')
  $items = @()
  try {
    $dirs = Get-ChildItem -LiteralPath $Path -Directory -ErrorAction Stop
    foreach ($d in $dirs) {
      $rel = if ($RelativePath) { $RelativePath + '\' + $d.Name } else { $d.Name }
      $children = Get-StartMenuTree -Path $d.FullName -RelativePath $rel
      $items += @{
        Type = 'folder'
        Name = $d.Name
        Path = $d.FullName
        RelativePath = $rel
        Children = @($children)
      }
    }
    $files = Get-ChildItem -LiteralPath $Path -Filter '*.lnk' -File -ErrorAction Stop
    foreach ($f in $files) {
      $target = ''
      try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($f.FullName)
        $target = $shortcut.TargetPath
        $null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut)
        $null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell)
      } catch { $target = '' }
      $rel = if ($RelativePath) { $RelativePath + '\' + $f.Name } else { $f.Name }
      $items += @{
        Type = 'shortcut'
        Name = $f.Name -replace '\.lnk$', ''
        Path = $f.FullName
        RelativePath = $rel
        TargetPath = $target
      }
    }
  } catch {}
  return $items
}

$tree = Get-StartMenuTree -Path $startMenuPath

# Get apps NOT in Start Menu (orphans from previous scan if available)
$result = @{
  StartMenuPath = $startMenuPath
  Items = $tree
}

$json = $result | ConvertTo-Json -Depth 10 -Compress
# Fix JSON escaping
$json = $json.Replace('\u0027', "'")
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)
Write-Host "DONE:$OutputPath"
