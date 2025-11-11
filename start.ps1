# Günlük Kiralık Evim - Başlatma Scripti

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Günlük Kiralık Evim - Başlatılıyor" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# .env dosyası kontrolü
if (-not (Test-Path ".env")) {
    Write-Host ".env dosyası bulunamadı, oluşturuluyor..." -ForegroundColor Yellow
    @"
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/gunluk-kiralik-evim

# Server Port
PORT=5000

# JWT Secret (üretim ortamında güçlü bir değer kullanın)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host ".env dosyası oluşturuldu." -ForegroundColor Green
}

# Server bağımlılıkları kontrolü
if (-not (Test-Path "node_modules")) {
    Write-Host "Server bağımlılıkları kuruluyor..." -ForegroundColor Yellow
    npm install
    Write-Host "Server bağımlılıkları kuruldu." -ForegroundColor Green
}

# Client bağımlılıkları kontrolü
if (-not (Test-Path "client/node_modules")) {
    Write-Host "Client bağımlılıkları kuruluyor..." -ForegroundColor Yellow
    Set-Location client
    npm install
    Set-Location ..
    Write-Host "Client bağımlılıkları kuruldu." -ForegroundColor Green
}

# Uploads klasörü kontrolü
if (-not (Test-Path "server/uploads")) {
    Write-Host "Uploads klasörü oluşturuluyor..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "server/uploads" -Force | Out-Null
    Write-Host "Uploads klasörü oluşturuldu." -ForegroundColor Green
}

Write-Host ""
Write-Host "Bağımlılıklar hazır!" -ForegroundColor Green
Write-Host ""
Write-Host "Server ve Client başlatılıyor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Client: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOT: MongoDB'nin çalıştığından emin olun!" -ForegroundColor Red
Write-Host ""

# Server'ı arka planda başlat
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

# Client'ı başlat (bu ana terminal'de kalır)
Set-Location client
npm start


