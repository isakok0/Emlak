# Frontend Client Başlatma Scripti
Write-Host "=== Frontend Client Başlatılıyor ===" -ForegroundColor Cyan
Write-Host ""

# Proje dizinine geç
$desktop = [Environment]::GetFolderPath('Desktop')
$dirs = Get-ChildItem -Path $desktop -Directory | Where-Object { $_.Name -like '*klas*' }
if ($dirs) {
    $targetDir = $dirs[0].FullName
    $clientDir = Join-Path $targetDir 'client'
    
    if (Test-Path $clientDir) {
        Set-Location $clientDir
        Write-Host "Client dizini: $clientDir" -ForegroundColor Green
        Write-Host ""
        
        # Frontend'i başlat
        Write-Host "Frontend başlatılıyor..." -ForegroundColor Yellow
        npm start
    } else {
        Write-Host "Client dizini bulunamadı!" -ForegroundColor Red
    }
} else {
    Write-Host "Proje dizini bulunamadı!" -ForegroundColor Red
}

