$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Split-Path -Parent $repoRoot
$assetsRoot = Join-Path $repoRoot "assets"
$liveRoot = Join-Path $assetsRoot "styles"
$copiedPaths = New-Object System.Collections.Generic.List[string]

function Assert-ChildPath {
  param([string]$Path, [string]$Parent)

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd("\") + "\"
  if (-not $fullPath.StartsWith($fullParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path escaped its expected parent: $fullPath"
  }
}

Assert-ChildPath -Path $liveRoot -Parent $assetsRoot
New-Item -ItemType Directory -Path $liveRoot -Force | Out-Null

function Copy-Gallery {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$DestinationName,
    [string[]]$PreferredNames = @()
  )

  $resolvedSource = (Resolve-Path -LiteralPath $Source).Path
  Assert-ChildPath -Path $resolvedSource -Parent $sourceRoot
  $destination = Join-Path $liveRoot $DestinationName
  Assert-ChildPath -Path $destination -Parent $liveRoot
  New-Item -ItemType Directory -Path $destination -Force | Out-Null

  $files = @(Get-ChildItem -LiteralPath $resolvedSource -File)
  $ordered = New-Object System.Collections.Generic.List[System.IO.FileInfo]
  $preferredSet = @{}

  foreach ($name in $PreferredNames) {
    $match = $files | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $match) {
      throw "Preferred file not found: $resolvedSource\$name"
    }
    $ordered.Add($match)
    $preferredSet[$name] = $true
  }

  foreach ($file in ($files | Where-Object { -not $preferredSet.ContainsKey($_.Name) } | Sort-Object Name)) {
    $ordered.Add($file)
  }

  $index = 1
  foreach ($file in $ordered) {
    $extension = $file.Extension.ToLowerInvariant()
    $destinationFile = Join-Path $destination ("{0}{1}" -f $index, $extension)
    Copy-Item -LiteralPath $file.FullName -Destination $destinationFile -Force
    $script:copiedPaths.Add($destinationFile)
    $index += 1
  }
}

Copy-Gallery "$sourceRoot\Men1" "men1" @("1.jpg", "2.jpg", "Codex Image Aug 30, 2026, 10_10_00 PM.png")
Copy-Gallery "$sourceRoot\Men2" "men2" @((1..13 | ForEach-Object { "$_.webp" }))
Copy-Gallery "$sourceRoot\Men3" "men3" @("0.png", "1.jpg", "2.jpg", "3.jpg", "4.jpg")
Copy-Gallery "$sourceRoot\Men4" "men4" @("1175858-VST_1-LV8.png", "Codex Image Aug 18, 2026, 04_07_09 PM.png")
Copy-Gallery "$sourceRoot\Men5\V1" "men5-v1" @("4054_0001_CLS-Blake-ECOM-3JUN3930.webp")
Copy-Gallery "$sourceRoot\Men5\V2" "men5-v2" @("CLS---Blake---ECOM---3JUN7466.webp")
Copy-Gallery "$sourceRoot\Men5\V3" "men5-v3" @("4054_0001_CLS-Blake-ECOM-3JUN6990.webp")
Copy-Gallery "$sourceRoot\Men6" "men6"

Copy-Gallery "$sourceRoot\Women1" "women1" @("1.jpeg", "2.jpeg", "3.jpeg", "ChatGPT Image Aug 31, 2026, 02_37_32 PM.png")
Copy-Gallery "$sourceRoot\Women2" "women2" @("Codex Image Aug 31, 2026, 11_37_42 AM.png", "LV8_photo_1_top_left.png", "LV8_photo_2_center.png", "LV8_photo_3_top_right.png", "LV8_photo_4_bottom_left.png", "LV8_photo_5_bottom_right.png")
$women3Destination = Join-Path $liveRoot "women3"
New-Item -ItemType Directory -Path $women3Destination -Force | Out-Null
$women3LogoSource = Join-Path $sourceRoot "Women3\lv8-logo\1.png"
$women3LogoDestination = Join-Path $women3Destination "1.png"
Copy-Item -LiteralPath $women3LogoSource -Destination $women3LogoDestination -Force
$copiedPaths.Add($women3LogoDestination)
foreach ($index in 2..7) {
  $women3Source = Join-Path $sourceRoot "Women3\$index.webp"
  $women3DestinationFile = Join-Path $women3Destination "$index.webp"
  Copy-Item -LiteralPath $women3Source -Destination $women3DestinationFile -Force
  $copiedPaths.Add($women3DestinationFile)
}
Copy-Gallery "$sourceRoot\Women4" "women4" @("0.png", "1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "8.png")
Copy-Gallery "$sourceRoot\Women5" "women5" @((1..15 | ForEach-Object { "$_.webp" }))
Copy-Gallery "$sourceRoot\Women7\V1" "women7-v1" @((1..6 | ForEach-Object { "$_.webp" }))
Copy-Gallery "$sourceRoot\Women7\V2" "women7-v2"
Copy-Gallery "$sourceRoot\Women7\V3" "women7-v3"
Copy-Gallery "$sourceRoot\Women8" "women8" @((1..6 | ForEach-Object { "$_.jpg" }))
Copy-Gallery "$sourceRoot\Women9" "women9" @("1.png", "2.png")
Copy-Gallery "$sourceRoot\Women10\lv8-logo" "women10" @((1..6 | ForEach-Object { "$_.png" }))
Copy-Gallery "$sourceRoot\Women11" "women11" @((1..4 | ForEach-Object { "$_.png" }))
Copy-Gallery "$sourceRoot\Women12" "women12" @((1..4 | ForEach-Object { "$_.png" }))
Copy-Gallery "$sourceRoot\Women13" "women13" @((1..5 | ForEach-Object { "$_.webp" }))

$expectedCounts = [ordered]@{
  "men1" = 3
  "men2" = 13
  "men3" = 5
  "men4" = 2
  "men5-v1" = 6
  "men5-v2" = 8
  "men5-v3" = 6
  "men6" = 4
  "women1" = 4
  "women2" = 6
  "women3" = 7
  "women4" = 8
  "women5" = 15
  "women7-v1" = 6
  "women7-v2" = 6
  "women7-v3" = 6
  "women8" = 6
  "women9" = 2
  "women10" = 6
  "women11" = 4
  "women12" = 4
  "women13" = 5
}

$expectedTotal = ($expectedCounts.Values | Measure-Object -Sum).Sum
$actualTotal = $copiedPaths.Count
if ($actualTotal -ne $expectedTotal) {
  throw "Total count mismatch: expected $expectedTotal, got $actualTotal"
}

foreach ($path in $copiedPaths) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Copied image is missing: $path"
  }
}

Write-Output "Published $($expectedCounts.Count) galleries and verified $actualTotal images without deleting existing assets."
