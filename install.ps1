# Günlük Kiralık Evim - Kurulum Scripti

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Günlük Kiralık Evim - Kurulum" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# .env dosyası oluştur
if (-not (Test-Path ".env")) {
    Write-Host ".env dosyası oluşturuluyor..." -ForegroundColor Yellow
    @"
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/gunluk-kiralik-evim

# Server Port
PORT=5000

# JWT Secret (üretim ortamında güçlü bir değer kullanın)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host ".env dosyası oluşturuldu." -ForegroundColor Green
} else {
    Write-Host ".env dosyası zaten mevcut." -ForegroundColor Green
}

# Server bağımlılıkları
Write-Host ""
Write-Host "Server bağımlılıkları kuruluyor..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "Server bağımlılıkları kuruldu." -ForegroundColor Green
} else {
    Write-Host "Server bağımlılıkları kurulumunda hata!" -ForegroundColor Red
    exit 1
}

# Client bağımlılıkları
Write-Host ""
Write-Host "Client bağımlılıkları kuruluyor..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "Client bağımlılıkları kuruldu." -ForegroundColor Green
} else {
    Write-Host "Client bağımlılıkları kurulumunda hata!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Uploads klasörü
if (-not (Test-Path "server/uploads")) {
    Write-Host ""
    Write-Host "Uploads klasörü oluşturuluyor..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "server/uploads" -Force | Out-Null
    Write-Host "Uploads klasörü oluşturuldu." -ForegroundColor Green
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "Kurulum tamamlandı!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Projeyi başlatmak için: .\start.ps1" -ForegroundColor Cyan
Write-Host "veya manuel olarak:" -ForegroundColor Cyan
Write-Host "  Terminal 1: npm run dev" -ForegroundColor Yellow
Write-Host "  Terminal 2: cd client && npm start" -ForegroundColor Yellow
Write-Host ""


