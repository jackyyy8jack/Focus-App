param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'release')
)

$ErrorActionPreference = 'Stop'
$electronDist = Join-Path $PSScriptRoot 'node_modules\electron\dist'
if (-not (Test-Path -LiteralPath (Join-Path $electronDist 'electron.exe'))) {
  throw 'Electron is missing. Run npm ci first.'
}

$files = @(
  'package.json', 'main.js', 'preload.js', 'background-media.js', 'index.html', 'script.js',
  'styles.css', 'tomato.png', 'stopwatch.png',
  'sounds\bell.ogg', 'sounds\alarm.ogg',
  'fonts\NotoSansTC-VF.ttf', 'fonts\OFL.txt'
)
foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $file))) {
    throw "Required file is missing: $file"
  }
}

$releaseRoot = [IO.Path]::GetFullPath($OutputDirectory)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bundleName = "FocusApp-$stamp"
$bundle = Join-Path $releaseRoot $bundleName
$appDirectory = Join-Path $bundle 'resources\app'
New-Item -ItemType Directory -Path $appDirectory -Force | Out-Null
Copy-Item -Path (Join-Path $electronDist '*') -Destination $bundle -Recurse -Force
foreach ($file in $files) {
  $target = Join-Path $appDirectory $file
  $targetParent = Split-Path -Parent $target
  New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $target -Force
}
Rename-Item -LiteralPath (Join-Path $bundle 'electron.exe') -NewName 'FocusApp.exe'

$archive = Join-Path $releaseRoot "$bundleName.zip"
Compress-Archive -LiteralPath $bundle -DestinationPath $archive -CompressionLevel Optimal
Write-Output "Portable bundle created: $archive"
