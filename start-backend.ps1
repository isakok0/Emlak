# Backend Server Başlatma Scripti
Write-Host "=== Backend Server Başlatılıyor ===" -ForegroundColor Cyan
Write-Host ""

# Proje dizinine geç
$desktop = [Environment]::GetFolderPath('Desktop')
$dirs = Get-ChildItem -Path $desktop -Directory | Where-Object { $_.Name -like '*klas*' }
if ($dirs) {
    $targetDir = $dirs[0].FullName
    Set-Location $targetDir
    Write-Host "Proje dizini: $targetDir" -ForegroundColor Green
    Write-Host ""
    
    # Backend'i başlat
    Write-Host "Backend server başlatılıyor..." -ForegroundColor Yellow
    npm start
} else {
    Write-Host "Proje dizini bulunamadı!" -ForegroundColor Red
    Write-Host "Lütfen manuel olarak proje dizinine gidin ve 'npm start' çalıştırın." -ForegroundColor Yellow
}

