# 🚀 Hızlı Başlangıç Rehberi

## Docker ile Çalıştırma (Önerilen) 🐳

En kolay yöntem Docker kullanmaktır. MongoDB dahil tüm servisler otomatik başlar.

### Production Modu
```powershell
docker-compose up -d
```
- Frontend: http://localhost
- Backend: http://localhost:5000

### Development Modu
```powershell
docker-compose -f docker-compose.dev.yml up
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

**Detaylı bilgi için:** [DOCKER.md](DOCKER.md)

---

## Manuel Kurulum

## Projeyi Başlatma

### 1. İlk Kurulum (İlk Defa Çalıştırıyorsanız)

PowerShell'de proje klasöründe şu komutu çalıştırın:
```powershell
.\install.ps1
```

Bu script:
- `.env` dosyasını oluşturur
- Server bağımlılıklarını kurar
- Client bağımlılıklarını kurar
- `server/uploads` klasörünü oluşturur

### 2. Projeyi Başlatma

#### Seçenek 1: Otomatik Başlatma (Önerilen)
```powershell
.\start.ps1
```

#### Seçenek 2: Manuel Başlatma

**Terminal 1 - Server:**
```powershell
npm run dev
```

**Terminal 2 - Client:**
```powershell
cd client
npm start
```

### 3. MongoDB Kontrolü

Projeyi çalıştırmadan önce MongoDB'nin çalıştığından emin olun:
```powershell
# MongoDB servisinin çalışıp çalışmadığını kontrol edin
```

### 4. Erişim Adresleri

- **Server API:** http://localhost:5000
- **Client (React):** http://localhost:3000
- **Health Check:** http://localhost:5000/api/health

## Önemli Notlar

1. `.env` dosyası yoksa `install.ps1` scripti otomatik oluşturur
2. MongoDB bağlantısı için MongoDB'nin çalışıyor olması gerekir
3. İlk kurulumdan sonra sadece `start.ps1` ile başlatabilirsiniz

## Sorun Giderme

### PowerShell Script Çalışmıyorsa
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Zaten Kullanılıyorsa
`.env` dosyasında `PORT` değerini değiştirin (örn: 5001)

### MongoDB Bağlantı Hatası
`.env` dosyasında `MONGODB_URI` değerini kontrol edin

