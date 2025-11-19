# Sorun Giderme Rehberi

## 500 Hatası Alıyorsanız

### 1. Backend Server Kontrolü

Backend server'ın çalıştığından emin olun:
- Backend terminalinde "Server 5000 portunda çalışıyor" mesajını görmelisiniz
- "MySQL bağlantısı başarılı" mesajını görmelisiniz

### 2. Frontend'i Yeniden Başlatın

Frontend terminalinde:
```bash
Ctrl+C  # Durdur
npm start  # Yeniden başlat
```

### 3. Tarayıcı Cache'ini Temizleyin

- **Hard Refresh:** `Ctrl+Shift+R` (Windows) veya `Cmd+Shift+R` (Mac)
- **Veya:** Tarayıcıyı tamamen kapatıp açın
- **Veya:** DevTools'u açın (F12) → Network sekmesi → "Disable cache" işaretleyin

### 4. Backend Console Loglarını Kontrol Edin

Backend terminalinde şu mesajları arayın:
- `Login error:` - Login endpoint'inde hata
- `Reviews latest error:` - Reviews endpoint'inde hata
- `MySQL bağlantı hatası:` - Veritabanı bağlantı sorunu

### 5. Endpoint'leri Manuel Test Edin

PowerShell'de:
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:5000/api/health"

# Login test
$body = '{"email":"admin","password":"123456"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"

# Settings test
Invoke-WebRequest -Uri "http://localhost:5000/api/public/settings"
```

### 6. Yaygın Sorunlar

**Sorun:** Backend çalışmıyor
- **Çözüm:** Backend terminalinde `npm start` çalıştırın

**Sorun:** MySQL bağlantı hatası
- **Çözüm:** MySQL'in çalıştığından emin olun (XAMPP/WAMP Control Panel)

**Sorun:** Port 5000 kullanımda
- **Çözüm:** `.env` dosyasında `PORT=5001` yapın ve frontend'deki `API_URL`'i güncelleyin

**Sorun:** Frontend backend'e bağlanamıyor
- **Çözüm:** `client/package.json`'daki `proxy` ayarının `http://localhost:5000` olduğundan emin olun

## Admin Giriş Bilgileri

- **Email:** `admin`
- **Şifre:** `123456`

## İletişim

Sorun devam ederse, backend console'daki hata mesajlarını paylaşın.

