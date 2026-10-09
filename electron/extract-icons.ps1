param(
    [Parameter(Mandatory=$true)]
    [string]$JsonPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$paths = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$icons = @{}

foreach ($entry in $paths) {
    $key = $entry.Key
    $exePath = $entry.Path
    $result = $null

    try {
        if (Test-Path $exePath) {
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
            if ($icon) {
                $bitmap = $icon.ToBitmap()
                $ms = New-Object System.IO.MemoryStream
                $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                $b64 = [System.Convert]::ToBase64String($ms.ToArray())
                $ms.Close()
                $bitmap.Dispose()
                $result = "data:image/png;base64,$b64"
            }
        }
    } catch {}

    $icons[$key] = $result
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$json = $icons | ConvertTo-Json -Compress
$fh = [System.IO.StreamWriter]::new($OutputPath, $false, $utf8NoBom)
$fh.Write($json)
$fh.Close()
