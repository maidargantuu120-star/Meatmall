param([Parameter(Mandatory = $true)][string]$OutDir)
# Renders the Meat Mall badge logo (meat-mall-logo.svg, next to this script) to PNG app icons
# on a brand-red square, using headless Microsoft Edge (or Chrome) so the Alfa Slab One web
# font and the white sticker filter render exactly as on the site. Needs internet for the font.
#
#   powershell -File design/logo/make-icons.ps1 -OutDir client/public/icons
#
# Output:
#   icon-192.png, icon-512.png   manifest "any"      - logo at 86% width
#   icon-maskable-512.png        manifest "maskable" - logo at 62% width (inside the safe zone)
#   apple-touch-icon.png         iOS home screen     - logo at 84% width

$browser = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "Microsoft Edge or Google Chrome is required." }

$svg = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "meat-mall-logo.svg")
$work = Join-Path ([IO.Path]::GetTempPath()) "meatmall-icons"
New-Item -ItemType Directory -Force $work, $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

function Render-Icon([int]$size, [double]$logoWidth, [string]$name) {
  $w = [math]::Round($size * $logoWidth)
  $html = @"
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap">
<style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: #e4002b; }
  body { display: flex; align-items: center; justify-content: center; }
  svg { width: ${w}px; height: auto; display: block; }
</style></head><body>$svg</body></html>
"@
  $page = Join-Path $work "$name.html"
  $png = Join-Path $work $name
  Set-Content -Path $page -Value $html -Encoding UTF8
  if (Test-Path $png) { Remove-Item $png }
  $url = "file:///" + ($page -replace '\\', '/')
  & $browser --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
    "--user-data-dir=$(Join-Path $work 'profile')" "--window-size=$size,$size" `
    --virtual-time-budget=10000 "--screenshot=$png" $url 2>$null | Out-Null
  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Test-Path $png) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
  if (-not (Test-Path $png)) { throw "Rendering $name failed." }
  Copy-Item $png (Join-Path $OutDir $name) -Force
  "{0}  {1}x{1}  {2} KB" -f $name, $size, [math]::Round((Get-Item $png).Length / 1KB, 1)
}

Render-Icon 192 0.86 "icon-192.png"
Render-Icon 512 0.86 "icon-512.png"
Render-Icon 512 0.62 "icon-maskable-512.png"
Render-Icon 180 0.84 "apple-touch-icon.png"
