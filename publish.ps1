# publish.ps1 - publish this site to GitHub Pages
#
# Run (from any folder):
#   powershell -ExecutionPolicy Bypass -File "<path>\tarot\publish.ps1"
#   (PowerShell 7: pwsh -File "<path>\tarot\publish.ps1")
#
# What it does: clones the repo into a temp folder, copies index.html, css/,
# js/ and README there, commits and pushes to main. GitHub Pages rebuilds the
# site in 30-60 seconds. The token comes from gh (gh auth login); it is never
# written to disk.

$ErrorActionPreference = 'Continue'

$src  = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = 'daniilnadyrov4312-boop/oracle-tarot'
$tmp  = Join-Path $env:TEMP ('oracle-publish-' + [guid]::NewGuid().ToString('N').Substring(0, 8))

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host 'gh (GitHub CLI) not found. Install: winget install GitHub.cli' -ForegroundColor Red
    exit 1
}

$token = (& gh auth token).Trim()
if (-not $token) {
    Write-Host 'Not logged in to GitHub. Run: gh auth login' -ForegroundColor Red
    exit 1
}
$authUrl = "https://x-access-token:$token@github.com/$repo.git"

Write-Host 'Cloning repository...' -ForegroundColor Cyan
git -c http.sslBackend=openssl -c core.autocrlf=false clone --depth 1 $authUrl $tmp 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Clone failed.' -ForegroundColor Red
    exit 1
}

git -C $tmp config core.autocrlf false

Copy-Item (Join-Path $src 'index.html') $tmp -Force
Copy-Item (Join-Path $src 'README.md')  $tmp -Force
Copy-Item (Join-Path $src 'publish.ps1') $tmp -Force
New-Item -ItemType Directory -Force -Path (Join-Path $tmp 'css'), (Join-Path $tmp 'js') | Out-Null
Copy-Item (Join-Path $src 'css\style.css') (Join-Path $tmp 'css') -Force
Copy-Item (Join-Path $src 'js\cards.js')   (Join-Path $tmp 'js')  -Force
Copy-Item (Join-Path $src 'js\app.js')     (Join-Path $tmp 'js')  -Force

Set-Location $tmp
git add -A

if (-not (git status --porcelain)) {
    Write-Host 'Nothing changed - the site is up to date.' -ForegroundColor Yellow
    Set-Location $src
    Remove-Item $tmp -Recurse -Force
    exit 0
}

$msg = 'Site update: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
git -c user.name='daniilnadyrov4312-boop' `
    -c user.email='daniilnadyrov4312-boop@users.noreply.github.com' `
    commit -m $msg 2>&1 | Out-Null

git -c http.sslBackend=openssl -c credential.helper= push $authUrl main:main 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host 'Done. GitHub Pages will refresh within a minute:' -ForegroundColor Green
    Write-Host 'https://daniilnadyrov4312-boop.github.io/oracle-tarot/' -ForegroundColor Green
} else {
    Write-Host 'Push failed - see git output above.' -ForegroundColor Red
}

Set-Location $src
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
exit 0
