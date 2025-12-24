#!/usr/bin/env pwsh
# JavaScript Validation Script for Payment System

Write-Host "=== JavaScript Validation Tool ===" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

function Test-JavaScriptFile {
    param([string]$FilePath)
    
    Write-Host "Checking: $FilePath" -ForegroundColor Yellow
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "  [ERROR] File not found!" -ForegroundColor Red
        return
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Extract only JavaScript from script tags
    $scriptSections = [regex]::Matches($content, '<script[^>]*>(.*?)</script>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    $totalOpen = 0
    $totalClose = 0
    
    foreach ($section in $scriptSections) {
        $jsCode = $section.Groups[1].Value
        $open = ([regex]::Matches($jsCode, '\{')).Count
        $close = ([regex]::Matches($jsCode, '\}')).Count
        $totalOpen += $open
        $totalClose += $close
    }
    
    # Check 1: Matching braces in JavaScript
    if ($totalOpen -ne $totalClose) {
        $script:errors += "  [ERROR] Brace mismatch in JavaScript - $totalOpen opening vs $totalClose closing"
        Write-Host "  [ERROR] Brace mismatch in JavaScript code!" -ForegroundColor Red
    } else {
        Write-Host "  [OK] JavaScript braces balanced ($totalOpen pairs)" -ForegroundColor Green
    }
    
    # Check 2: Script tags
    $scriptTags = ([regex]::Matches($content, '<script[^>]*>')).Count
    $scriptCloseTags = ([regex]::Matches($content, '</script>')).Count
    
    if ($scriptTags -ne $scriptCloseTags) {
        $script:errors += "  [ERROR] Script tag mismatch - $scriptTags opening vs $scriptCloseTags closing"
        Write-Host "  [ERROR] Script tags not properly closed!" -ForegroundColor Red
    } else {
        Write-Host "  [OK] Script tags balanced ($scriptTags pairs)" -ForegroundColor Green
    }
    
    Write-Host ""
}

# Check all HTML files
$htmlFiles = @("billdesk_payment.html", "upi_processing.html", "payment_success.html", "student_profile.html")

foreach ($file in $htmlFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Test-JavaScriptFile -FilePath $fullPath
    }
}

# Summary
Write-Host "=== Validation Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "[SUCCESS] All checks passed! No errors or warnings found." -ForegroundColor Green
} else {
    if ($errors.Count -gt 0) {
        Write-Host "[ERROR] Found $($errors.Count) errors" -ForegroundColor Red
        foreach ($error in $errors) { Write-Host $error -ForegroundColor Red }
        Write-Host ""
    }
    if ($warnings.Count -gt 0) {
        Write-Host "[WARN] Found $($warnings.Count) warnings" -ForegroundColor Yellow
        foreach ($warning in $warnings) { Write-Host $warning -ForegroundColor Yellow }
    }
}

Write-Host ""
Write-Host "Run this script before every commit to catch JavaScript errors early!" -ForegroundColor Cyan
Write-Host ""

exit $errors.Count
