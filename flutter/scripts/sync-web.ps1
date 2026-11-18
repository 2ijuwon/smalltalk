param(
  [string]$Source = (Join-Path $PSScriptRoot '..\..')
)

$ErrorActionPreference = 'Stop'
$destination = Join-Path $PSScriptRoot '..\assets\www'
$sourceFiles = @(
  'src\app.js',
  'src\data.js',
  'src\domain.js',
  'src\duel-motion.js',
  'src\duel-rules.js',
  'src\typing-game.js',
  'src\styles\pixel.css'
)

foreach ($relative in $sourceFiles) {
  $origin = Join-Path $Source $relative
  if (-not (Test-Path -LiteralPath $origin -PathType Leaf)) {
    throw "Missing web source: $origin"
  }
  Copy-Item -LiteralPath $origin -Destination (Join-Path $destination $relative)
}

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
