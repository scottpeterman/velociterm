# build-demo3.ps1
# Automated build script for VelociTerm demo3 with dual-app support

param(
    [switch]$SkipComponentCopy,
    [switch]$SkipBuild,
    [switch]$CleanBuild
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "VelociTerm Demo3 Build Script" -ForegroundColor Cyan
Write-Host "Dual-App with SSH Key Authentication" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get script location
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath

Write-Host "Root Path: $rootPath" -ForegroundColor Yellow
Write-Host ""

# Define paths
$vtnbFePath = Join-Path $rootPath "vtnb_fe"
$vtnbEmbedPath = Join-Path $rootPath "vtnb_embed"
$demo3Path = Join-Path $rootPath "demo3"
$outputsPath = "/mnt/user-data/outputs"  # WSL path

# Check if in WSL or need to adjust
if (-not (Test-Path $outputsPath)) {
    Write-Host "Note: /mnt/user-data/outputs not accessible" -ForegroundColor Yellow
    Write-Host "Please ensure component files are available" -ForegroundColor Yellow
    $SkipComponentCopy = $true
}

# ============================================================================
# Step 1: Copy Updated Components
# ============================================================================

if (-not $SkipComponentCopy) {
    Write-Host "Step 1: Copying updated components with SSH key support..." -ForegroundColor Green

    $components = @(
        "CredentialsModal.jsx",
        "DeviceSearch.jsx",
        "TerminalWindow.jsx",
        "Dashboard.jsx"
    )

    foreach ($comp in $components) {
        $source = Join-Path $outputsPath $comp

        # Copy to main app
        $destMain = Join-Path $vtnbFePath "src\components\$comp"
        Write-Host "  → Copying $comp to vtnb_fe..." -ForegroundColor Gray
        Copy-Item -Path $source -Destination $destMain -Force

        # Copy to embedded app
        $destEmbed = Join-Path $vtnbEmbedPath "src\components\$comp"
        Write-Host "  → Copying $comp to vtnb_embed..." -ForegroundColor Gray
        Copy-Item -Path $source -Destination $destEmbed -Force
    }

    Write-Host "✓ Components copied to both apps" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Step 1: Skipping component copy (use -SkipComponentCopy)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Step 2: Build React Apps
# ============================================================================

if (-not $SkipBuild) {
    Write-Host "Step 2: Building React applications..." -ForegroundColor Green

    if ($CleanBuild) {
        Write-Host "  → Clean build requested" -ForegroundColor Gray

        # Clean main app
        $mainBuild = Join-Path $vtnbFePath "build"
        if (Test-Path $mainBuild) {
            Remove-Item -Path $mainBuild -Recurse -Force
            Write-Host "  → Cleaned vtnb_fe/build" -ForegroundColor Gray
        }

        # Clean embedded app
        $embedBuild = Join-Path $vtnbEmbedPath "build"
        if (Test-Path $embedBuild) {
            Remove-Item -Path $embedBuild -Recurse -Force
            Write-Host "  → Cleaned vtnb_embed/build" -ForegroundColor Gray
        }
    }

    # Build main app
    Write-Host "  → Building vtnb_fe (main app)..." -ForegroundColor Cyan
    Push-Location $vtnbFePath
    try {
        npm run build | Out-Null
        Write-Host "  ✓ Main app built successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Main app build failed!" -ForegroundColor Red
        throw
    } finally {
        Pop-Location
    }

    # Build embedded app
    Write-Host "  → Building vtnb_embed (embedded terminal)..." -ForegroundColor Cyan
    Push-Location $vtnbEmbedPath
    try {
        npm run build | Out-Null
        Write-Host "  ✓ Embedded app built successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Embedded app build failed!" -ForegroundColor Red
        throw
    } finally {
        Pop-Location
    }

    Write-Host "✓ Both apps built successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Step 2: Skipping build (use -SkipBuild)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Step 3: Copy to Demo3
# ============================================================================

Write-Host "Step 3: Copying builds to demo3..." -ForegroundColor Green

# Clean demo3 static directories
$demo3Static = Join-Path $demo3Path "static"
$demo3Terminal = Join-Path $demo3Path "terminal"

if (Test-Path $demo3Static) {
    Remove-Item -Path $demo3Static -Recurse -Force
    Write-Host "  → Cleaned demo3\static" -ForegroundColor Gray
}

if (Test-Path $demo3Terminal) {
    Remove-Item -Path $demo3Terminal -Recurse -Force
    Write-Host "  → Cleaned demo3\terminal" -ForegroundColor Gray
}

# Create directories
New-Item -Path $demo3Static -ItemType Directory -Force | Out-Null
New-Item -Path $demo3Terminal -ItemType Directory -Force | Out-Null

# Copy main app build
$mainBuildSource = Join-Path $vtnbFePath "build"
Write-Host "  → Copying main app to demo3\static..." -ForegroundColor Cyan
Copy-Item -Path "$mainBuildSource\*" -Destination $demo3Static -Recurse -Force
Write-Host "  ✓ Main app copied" -ForegroundColor Green

# Copy embedded app build
$embedBuildSource = Join-Path $vtnbEmbedPath "build"
Write-Host "  → Copying embedded app to demo3\terminal..." -ForegroundColor Cyan
Copy-Item -Path "$embedBuildSource\*" -Destination $demo3Terminal -Recurse -Force
Write-Host "  ✓ Embedded app copied" -ForegroundColor Green

Write-Host "✓ Builds copied to demo3" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 4: Verification
# ============================================================================

Write-Host "Step 4: Verifying build..." -ForegroundColor Green

$allGood = $true

# Check main app
$mainIndex = Join-Path $demo3Static "index.html"
if (Test-Path $mainIndex) {
    Write-Host "  ✓ Main app index.html present" -ForegroundColor Green
} else {
    Write-Host "  ✗ Main app index.html MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check embedded app
$terminalIndex = Join-Path $demo3Terminal "index.html"
if (Test-Path $terminalIndex) {
    Write-Host "  ✓ Embedded terminal index.html present" -ForegroundColor Green
} else {
    Write-Host "  ✗ Embedded terminal index.html MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check main.py version
$mainPy = Join-Path $demo3Path "main.py"
$mainPyContent = Get-Content $mainPy -Raw
if ($mainPyContent -match "0\.6\.0") {
    Write-Host "  ✓ main.py version 0.6.0 (dual-app support)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ main.py might need update (should be v0.6.0)" -ForegroundColor Yellow
}

# Check SSH key hints in main app
$mainJsFiles = Get-ChildItem -Path "$demo3Static\static\js\*.js" -ErrorAction SilentlyContinue
if ($mainJsFiles) {
    $hasHints = $false
    foreach ($file in $mainJsFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "leave blank for key auth") {
            $hasHints = $true
            break
        }
    }
    if ($hasHints) {
        Write-Host "  ✓ Main app has SSH key hints" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Main app missing SSH key hints" -ForegroundColor Red
        $allGood = $false
    }
}

# Check velociterm_user in main app (CRITICAL)
if ($mainJsFiles) {
    $hasUser = $false
    foreach ($file in $mainJsFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "velociterm_user") {
            $hasUser = $true
            break
        }
    }
    if ($hasUser) {
        Write-Host "  ✓ Main app has velociterm_user (SSH keys will work!)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Main app missing velociterm_user (CRITICAL!)" -ForegroundColor Red
        $allGood = $false
    }
}

# Check SSH key hints in embedded app
$terminalJsFiles = Get-ChildItem -Path "$demo3Terminal\static\js\*.js" -ErrorAction SilentlyContinue
if ($terminalJsFiles) {
    $hasHints = $false
    foreach ($file in $terminalJsFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "leave blank for key auth") {
            $hasHints = $true
            break
        }
    }
    if ($hasHints) {
        Write-Host "  ✓ Embedded app has SSH key hints" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Embedded app missing SSH key hints" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# ============================================================================
# Final Summary
# ============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your demo3 is ready to run:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  cd demo3" -ForegroundColor White
    Write-Host "  .venv\Scripts\activate" -ForegroundColor White
    Write-Host "  python main.py" -ForegroundColor White
    Write-Host ""
    Write-Host "URLs:" -ForegroundColor Cyan
    Write-Host "  Main App:         http://localhost:8050/" -ForegroundColor White
    Write-Host "  Embedded Terminal: http://localhost:8050/terminal?host=X&port=Y&name=Z" -ForegroundColor White
    Write-Host "  API Docs:         http://localhost:8050/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "Features:" -ForegroundColor Cyan
    Write-Host "  ✓ Dual-app serving (main + embedded)" -ForegroundColor Green
    Write-Host "  ✓ SSH key authentication support" -ForegroundColor Green
    Write-Host "  ✓ Password-optional credential forms" -ForegroundColor Green
    Write-Host "  ✓ Shared authentication" -ForegroundColor Green
} else {
    Write-Host "⚠ BUILD COMPLETED WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Some checks failed. Review the output above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  1. Ensure component files are in /mnt/user-data/outputs/" -ForegroundColor White
    Write-Host "  2. Run with -CleanBuild flag: .\build-demo3.ps1 -CleanBuild" -ForegroundColor White
    Write-Host "  3. Check that TerminalWindow.jsx was updated (critical!)" -ForegroundColor White
}
Write-Host "============================================================" -ForegroundColor Cyan

# Return exit code
if ($allGood) {
    exit 0
} else {
    exit 1
}