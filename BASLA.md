# 🚀 Hızlı Başlangıç

Bu rehber, depo klonlandıktan sonra projeyi dakikalar içinde ayağa kaldırmanızı hedefler. Kapsamlı bilgi için `README.md`, kapsül özet için bu dosyayı kullanın.

## 0. Gereksinimler
- Node.js 16+
- npm veya yarn
- Docker (opsiyonel ama önerilir)
- MongoDB (yerel servis veya Docker container)

## 1. Depoyu Hazırlayın
```powershell
git clone <repo-url>
cd <repo-klasoru>
```
Klonlama sonrası PowerShell'de execution policy ayarlamak gerekebilir:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 2. Gerekli Dosyaları Oluşturun
```powershell
cp .env.example .env
cp client\.env.example client\.env
```
Ardından `.env` dosyalarını düzenleyerek zorunlu anahtarları doldurun (`MONGODB_URI`, `JWT_SECRET`, e-posta ayarları vb.).
- Yönetim paneline ilk erişim için varsayılan bilgiler `admin / 123456` (süper admin) ve `mukaddes / 123456` (ikincil admin) olarak ayarlanır. İsterseniz `.env` dosyasında `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SECONDARY_ADMIN_EMAIL` ve `SECONDARY_ADMIN_PASSWORD` değerlerini değiştirin.

## 3. Script ile Otomatik Kurulum
İlk kurulumu tek komutla tamamlayın:
```powershell
.\install.ps1
```
Script aşağıdakileri yapar:
- Sunucu ve istemci bağımlılıklarını indirir
- `server/uploads` gibi gerekli klasörleri oluşturur
- Ortam dosyalarının varlığını doğrular

## 4. Projeyi Başlatın
### Otomatik (Önerilen)
```powershell
.\start.ps1
```
Script, API ve frontend'i paralel olarak başlatır.

### Manuel Kurulum
- Terminal 1:
  ```powershell
  npm run dev
  ```
- Terminal 2:
  ```powershell
  cd client
  npm start
  ```

## 5. Docker ile Çalıştırma
MongoDB dahil tüm servislerin konteyner ortamında çalışması için:
```powershell
docker-compose up -d
```
Geliştirme amaçlı override dosyasıyla:
```powershell
docker-compose -f docker-compose.dev.yml up
```
> Daha geniş senaryolar için `DOCKER.md` dosyasına bakın.

## 6. Erişim Adresleri
- Frontend (React): `http://localhost:3000` (Docker prod'da `http://localhost`)
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## 7. Test ve Lint
```powershell
npm test
npm run lint
```
Frontend için:
```powershell
cd client
npm test
```

## 8. Sorun Giderme
- **PowerShell scriptleri çalışmıyor:** Execution policy ayarını yukarıdaki komutla yapın.
- **Port çakışması:** `.env` dosyasında `PORT` ve `CLIENT_PORT` değerlerini güncelleyin.
- **MongoDB bağlantı hatası:** `MONGODB_URI` değerinin doğru olduğundan ve MongoDB servisinin çalıştığından emin olun.
- **Docker başlatma hatası:** `docker-compose logs` ile logları inceleyin, gerekirse `docker system prune` yapın.

## 9. Sonraki Adımlar
- `README.md` içindeki mimari ve operasyonel önerileri okuyun.
- Örnek veri gerekiyorsa `npm run seed` komutunu (varsa) çalıştırın.
- CI/CD pipeline'ı için `npm test` ve `npm run lint` adımlarını zorunlu hale getirin.
