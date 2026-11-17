# Bulk domain swap: careersasa.co.ke -> stembird.com (source, SQL, env, sitemap, docs).
# Excludes historical migrations + REBRAND-CHEMISTRYLENS.sql (which are already-applied).
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$extensions = @('*.ts','*.tsx','*.js','*.mjs','*.mts','*.md','*.txt','*.xml','*.json')
$excludeDirs = @('node','.next','node_modules','.git','dist','build','.vercel')
$excludeFiles = @(
    'scripts\rebrand-db-to-chemistrylens.ts',
    'supabase\REBRAND-CHEMISTRYLENS.sql',
    'supabase\migrations\20260821_seed_navigation_and_jobs_cms.sql',
    'supabase\migrations\20260822_seed_about_contact_companies_cms.sql'
)

$targets = @()
foreach ($ext in $extensions) {
    Get-ChildItem -Path . -Filter $ext -Recurse -File -Force | ForEach-Object {
        $rel = $_.FullName.Substring((Get-Location).Path.Length + 1)
        $skip = $false
        foreach ($d in $excludeDirs) { if ($rel -like "*\$d\*") { $skip = $true; break } }
        if ($skip) { return }
        foreach ($f in $excludeFiles) { if ($rel -eq $f) { $skip = $true; break } }
        if ($skip) { return }
        if (Select-String -Path $_.FullName -Pattern 'careersasa\.co\.ke' -SimpleMatch -Quiet) {
            $targets += ,@($rel, $_.FullName)
        }
    }
}

# Also include .env.example and .env.local
foreach ($extra in @('.env.example','.env.local')) {
    if (Test-Path -LiteralPath $extra) {
        $abs = (Resolve-Path -LiteralPath $extra).ProviderPath
        if (Select-String -Path $abs -Pattern 'careersasa\.co\.ke' -SimpleMatch -Quiet) {
            $targets += ,@($extra, $abs)
        }
    }
}

# Also SCHEMA-FRESH-INSTALL.sql
if (Test-Path -LiteralPath 'supabase\SCHEMA-FRESH-INSTALL.sql') {
    $abs = (Resolve-Path -LiteralPath 'supabase\SCHEMA-FRESH-INSTALL.sql').ProviderPath
    if (Select-String -Path $abs -Pattern 'careersasa\.co\.ke' -SimpleMatch -Quiet) {
        $targets += ,@('supabase\SCHEMA-FRESH-INSTALL.sql', $abs)
    }
}

$count = 0
foreach ($pair in $targets) {
    $rel = $pair[0]; $abs = $pair[1]
    $bytes = [System.IO.File]::ReadAllBytes($abs)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $new = $text -creplace 'careersasa\.co\.ke', 'stembird.com'
    if ($new -ne $text) {
        [System.IO.File]::WriteAllBytes($abs, [System.Text.Encoding]::UTF8.GetBytes($new))
        Write-Host "REWROTE $rel"
        $count++
    }
}
Write-Host "`nRewrote $count file(s)."
