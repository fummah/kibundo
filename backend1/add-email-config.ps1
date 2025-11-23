# PowerShell script to add email configuration to .env file
# Based on Laravel email settings

$envFile = "backend1\.env"

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

# Read existing .env content
$content = Get-Content $envFile -Raw

# Remove existing SMTP configuration if present
$content = $content -replace "(?m)^SMTP_.*$", ""

# Add new SMTP configuration
$smtpConfig = @"

# SMTP Email Configuration (from Laravel config)
SMTP_HOST=smtp.zbsburial.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=fortai@zbsburial.com
SMTP_PASSWORD=07C713B323B9cw
SMTP_FROM="Fortai <fortai@zbsburial.com>"
"@

# Append SMTP config to .env
$content = $content.TrimEnd() + "`n`n" + $smtpConfig.Trim() + "`n"

# Write back to file
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "✅ SMTP configuration added to .env file!" -ForegroundColor Green
Write-Host "`n📝 Configuration added:" -ForegroundColor Cyan
Write-Host "   SMTP_HOST=smtp.zbsburial.com" -ForegroundColor White
Write-Host "   SMTP_PORT=465" -ForegroundColor White
Write-Host "   SMTP_SECURE=true" -ForegroundColor White
Write-Host "   SMTP_USER=fortai@zbsburial.com" -ForegroundColor White
Write-Host "   SMTP_PASSWORD=07C713B323B9cw" -ForegroundColor White
Write-Host "   SMTP_FROM=`"Fortai <fortai@zbsburial.com>`"" -ForegroundColor White
Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Restart your backend server" -ForegroundColor White
Write-Host "   2. Run: node test-email.js to test" -ForegroundColor White

