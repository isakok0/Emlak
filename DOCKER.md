# 🐳 Docker ile Çalıştırma

Bu proje Docker ve Docker Compose kullanılarak kolayca çalıştırılabilir.

## Gereksinimler

- Docker Desktop (Windows/Mac) veya Docker Engine + Docker Compose (Linux)
- En az 4GB RAM
- En az 10GB disk alanı

## Hızlı Başlangıç

### Production (Üretim) Modu

Tüm servisleri production modunda başlatmak için:

```bash
docker-compose up -d
```

Bu komut:
- MongoDB container'ını başlatır (port 27017)
- Server container'ını başlatır (port 5000)
- Client container'ını başlatır (port 80)

**Erişim:**
- Frontend: http://localhost
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### Development (Geliştirme) Modu

Geliştirme modunda çalıştırmak için (hot-reload aktif):

```bash
docker-compose -f docker-compose.dev.yml up
```

Bu modda:
- Kod değişiklikleri otomatik olarak yansır
- React geliştirme sunucusu çalışır (port 3000)
- Server nodemon ile çalışır

**Erişim:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

## Komutlar

### Container'ları Başlatma

```bash
# Production modu (arka planda)
docker-compose up -d

# Development modu (önde)
docker-compose -f docker-compose.dev.yml up

# Development modu (arka planda)
docker-compose -f docker-compose.dev.yml up -d
```

### Container'ları Durdurma

```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

### Container'ları Yeniden Başlatma

```bash
# Production
docker-compose restart

# Development
docker-compose -f docker-compose.dev.yml restart
```

### Logları Görüntüleme

```bash
# Tüm servislerin logları
docker-compose logs -f

# Sadece server logları
docker-compose logs -f server

# Sadece client logları
docker-compose logs -f client

# Development modu için
docker-compose -f docker-compose.dev.yml logs -f
```

### Container'ları Yeniden Build Etme

Kod değişikliklerinden sonra container'ları yeniden build etmek için:

```bash
# Production
docker-compose build --no-cache
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Veritabanını Temizleme

```bash
# Container'ları ve volume'ları sil (tüm veriler silinir!)
docker-compose down -v

# Development için
docker-compose -f docker-compose.dev.yml down -v
```

## Yapılandırma

### Environment Variables

Production modunda environment variable'ları ayarlamak için:

1. `.env` dosyası oluşturun:
```env
JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb://mongodb:27017/gunluk-kiralik-evim
PORT=5000
```

2. Docker Compose otomatik olarak `.env` dosyasını okur.

### Port Değiştirme

Port'ları değiştirmek için `docker-compose.yml` dosyasındaki port mapping'leri düzenleyin:

```yaml
services:
  server:
    ports:
      - "YENI_PORT:5000"  # Örn: "8000:5000"
  
  client:
    ports:
      - "YENI_PORT:80"  # Örn: "8080:80"
```

## Sorun Giderme

### Port Zaten Kullanılıyor

Eğer bir port zaten kullanılıyorsa:

```bash
# Hangi process port'u kullanıyor kontrol et (Windows)
netstat -ano | findstr :5000

# Docker compose'daki port'u değiştir
```

### Container Başlamıyor

1. Logları kontrol edin:
```bash
docker-compose logs
```

2. Container'ları yeniden build edin:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### MongoDB Bağlantı Hatası

MongoDB container'ının çalıştığından emin olun:

```bash
docker-compose ps
```

Eğer MongoDB çalışmıyorsa:

```bash
docker-compose up -d mongodb
```

### Disk Alanı Sorunu

Kullanılmayan Docker kaynaklarını temizlemek için:

```bash
# Kullanılmayan image'ları sil
docker image prune -a

# Kullanılmayan volume'ları sil
docker volume prune

# Kullanılmayan container'ları sil
docker container prune
```

## Production Deployment

Production ortamına deploy etmek için:

1. `.env` dosyasında production değerlerini ayarlayın
2. `docker-compose.yml` dosyasını production'a uygun şekilde düzenleyin
3. Build edin ve çalıştırın:

```bash
docker-compose build
docker-compose up -d
```

## Notlar

- MongoDB verileri `mongodb_data` volume'unda saklanır
- Upload edilen dosyalar `server/uploads` klasöründe saklanır
- Development modunda kod değişiklikleri otomatik yansır
- Production modunda client build edilmiş static dosyalar olarak serve edilir


