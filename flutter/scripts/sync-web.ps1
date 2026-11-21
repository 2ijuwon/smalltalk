param(
  [string]$Source = (Join-Path $PSScriptRoot '..\..')
)

$ErrorActionPreference = 'Stop'
$destination = Join-Path $PSScriptRoot '..\assets\www'
node (Join-Path $Source 'scripts\content.mjs') --check-audio
if ($LASTEXITCODE -ne 0) { throw 'Content validation failed.' }
$sourceFiles = @(
  'src\brand-icon.svg',
  'src\styles\pixel.css'
)
$sourceFiles += Get-ChildItem -LiteralPath (Join-Path $Source 'src') -Filter '*.js' -File |
  ForEach-Object { Join-Path 'src' $_.Name }

foreach ($relative in $sourceFiles) {
  $origin = Join-Path $Source $relative
  if (-not (Test-Path -LiteralPath $origin -PathType Leaf)) {
    throw "Missing web source: $origin"
  }
  Copy-Item -LiteralPath $origin -Destination (Join-Path $destination $relative)
}

$audio = Join-Path $destination 'src\audio'
New-Item -ItemType Directory -Force -Path $audio | Out-Null
Get-ChildItem -LiteralPath (Join-Path $Source 'src\audio') -Filter '*.wav' -File |
  Copy-Item -Destination $audio

$index = Get-Content -LiteralPath (Join-Path $Source 'index.html') -Raw -Encoding UTF8
$index = $index.Replace(
  'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css',
  './src/styles/font.css'
)
[System.IO.File]::WriteAllText(
  (Join-Path $destination 'index.html'),
  $index,
  [System.Text.UTF8Encoding]::new($false)
)
Write-Host 'Web files synced to Flutter assets.'
