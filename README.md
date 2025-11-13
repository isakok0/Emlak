# Günlük Kiralık Evim

Günlük kiralık daire ilanlarının yayınlandığı, rezervasyon süreçlerinin yönetildiği ve yöneticiler için kapsamlı bir kontrol paneli sunan uçtan uca web platformu.

## İçindekiler
- Giriş
- Özellik Özeti
- Teknik Yığın
- Sistem Mimarisi
- Ortam ve Konfigürasyon
- Kurulum Adımları
- Docker ile Çalıştırma
- Kullanışlı Komutlar
- Test ve Kalite Politikası
- Güvenlik Notları
- Operasyonel Öneriler
- Katkı Rehberi
- Lisans ve Destek

## Giriş
Bu depo, Node.js/Express tabanlı bir API ile React tabanlı bir istemciyi bir araya getirerek günlük kiralık daire işletmesini dijitalleştirmenizi sağlar. Platform; kiracı adayları, ev sahipleri ve yöneticiler için ayrı akışlar ve yetkilendirmeler içerir. Projeyi hızlıca ayağa kaldırmak için `BASLA.md` dosyasındaki yönergelerden yararlanabilirsiniz.

## Özellik Özeti
- **İlan Yönetimi:** Detaylı daire kartları, çoklu medya desteği, sezon bazlı dinamik fiyatlandırma, müsaitlik takvimi.
- **Rezervasyon Akışı:** İleri düzey arama filtreleri, rezervasyon talebi oluşturma, manuel veya otomatik onay, ulaşılabilirlik kontrolü.
- **Ödeme Süreci:** Online tahsilat yoktur; ödeme daire tesliminde veya ofiste gerçekleşir; sistem yalnızca rezervasyonu ve ödemeye dair notları kaydeder.
- **Kullanıcı Deneyimi:** Giriş/kayıt, rol bazlı erişim, konaklayan misafirlerden yorum ve puanlama, SSS ve iletişim kanalları.
- **Yönetim Paneli:** Dashboard istatistikleri, kullanıcı/ilan/rezervasyon yönetimi, rol atama, sistem loglarına erişim.
- **Bildirimler:** E-posta ile anlık bilgilendirme, ileride SMS entegrasyonuna açıktır.

## Teknik Yığın
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT tabanlı kimlik doğrulama.
- **Frontend:** React, React Router, Context/Redux (projeye göre), Tailwind veya benzeri CSS kütüphanesi.
- **Altyapı:** Docker, docker-compose, PowerShell yardımcı scriptleri, Cloudflare veya benzeri CDN/DDoS koruması.
- **Yardımcı Araçlar:** Nodemailer, Multer (dosya yükleme), Jest + React Testing Library.

## Sistem Mimarisi
Uygulama üç ana katmandan oluşur:
1. **İstemci (SPA):** Statik olarak barındırılan React uygulaması CDN üzerinden son kullanıcılara servis edilir.
2. **API Katmanı:** `api.example.com` benzeri bir origin üzerinden çalışan Express sunucusu; JWT ile yetkilendirme, rate limiting ve validation katmanları içerir.
3. **Veri Katmanı:** MongoDB veritabanı (Atlas veya self-hosted). Dosya yüklemeleri için S3 uyumlu bir obje depolama hizmeti önerilir.

> Trafik Cloudflare gibi bir CDN/WAF üzerinden yönlendirilerek DDoS, bot, brute-force saldırılarına karşı koruma sağlar. Origin IP'leri gizli tutulmalı ve sadece CDN IP aralıklarına izin verilmelidir.

## Ortam ve Konfigürasyon
Zorunlu `.env` değerleri:
- `MONGODB_URI`
- `JWT_SECRET`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` (opsiyonel ancak önerilir)
- `CLIENT_URL` ve `API_URL` gibi origin bilgileri
- Dosya yükleme için gerekli S3/R2 kimlik bilgileri (kullanılıyorsa)
- `SUPERADMIN_EMAIL` ve `SUPERADMIN_PASSWORD` (opsiyonel; varsayılan `admin` / `123456`)
- `SECONDARY_ADMIN_EMAIL` ve `SECONDARY_ADMIN_PASSWORD` (opsiyonel; varsayılan `mukaddes` / `123456`)
- `BCRYPT_SALT_ROUNDS` (opsiyonel; varsayılan 12)

`.env.example` dosyasını kopyalayarak başlayın ve tüm alanları doldurun.

## Kurulum Adımları
1. **Projeyi klonlayın veya indirin.**
2. **Bağımlılıkları kurun:**
   ```bash
   npm install
   cd client && npm install
   ```
3. **Konfigürasyonu hazırlayın:**
   ```bash
   cp .env.example .env
   cp client/.env.example client/.env
   ```
4. **İlk yapılandırma scriptini çalıştırın (Windows):**
   ```powershell
   .\install.ps1
   ```
   Script; gerekli klasörleri oluşturur, bağımlılıkları indirir ve `.env` dosyasını doğrular.
5. **Geliştirme ortamını başlatın:**
   ```powershell
   .\start.ps1
   ```
   veya manuel olarak `npm run dev` (server) ve `npm start` (client).

> Hızlı bir özet için `BASLA.md` dosyasını inceleyin.

## Docker ile Çalıştırma
- Üretim benzeri kurulum:
  ```bash
  docker-compose up -d
  ```
- Geliştirme modu:
  ```bash
  docker-compose -f docker-compose.dev.yml up
  ```
Çalıştırma sonrası varsayılan adresler:
- Frontend: `http://localhost` veya `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Detaylı senaryolar için `DOCKER.md` dosyasına bakın.

## Kullanışlı Komutlar
- `npm run dev` → Nodemon ile API geliştirme sunucusu
- `npm start` (server) → Production modunda backend
- `npm run build` (client) → Frontend üretim çıktısı
- `npm test` → Tüm testleri çalıştırır
- `npm run lint` → Kod kalitesini kontrol eder
- `npm run seed` → Örnek veri yükler (varsa)

PowerShell scriptleri:
- `install.ps1` → İlk kurulum
- `start.ps1` → API ve frontend'i eşzamanlı başlatır

## Test ve Kalite Politikası
- Her yeni özellik için birim ve entegrasyon testleri zorunludur.
- CI/CD pipeline'ına `npm test` ve `npm run lint` adımlarını ekleyin.
- Testlerde istisna olması durumunda PR açıklamasına gerekçe ekleyin.
- E2E senaryolar için Playwright/Cypress önerilir.

## Güvenlik Notları
- Güçlü `JWT_SECRET` ve döngüsel key rotation.
- MongoDB erişimini IP kısıtlaması ve rol bazlı yetkilendirme ile güvene alın.
- HTTPS'i zorunlu tutun; Cloudflare `Full (Strict)` modu önerilir.
- Dosya yükleme limitleri ve MIME tip kontrollerini uygulayın.
- Rate limiting, request logging ve anomali alarmı ekleyin.
- Tüm girdi alanları için şema bazlı validation (Joi/Zod) kullanın.

## Operasyonel Öneriler
- CDN önbelleklemesi için cache invalidation stratejisi geliştirin.
- Logları merkezi bir izleme aracına (ELK, Datadog vb.) gönderin.
- Sağlık kontrollerini izleyerek altyapıyı alarm sistemlerine bağlayın.
- Yeni frontend sürümü dağıtırken `Purge Cache` veya versiyon bazlı cache busting kullanın.

## Katkı Rehberi
- Bir feature branch oluşturun (`feature/ozellik-adi`).
- Değişiklikler için testleri çalıştırın ve sonuçları PR'da paylaşın.
- Kod standartlarına uymak için lint ve format komutlarını çalıştırın.
- PR açıklamasında kapsamı, testleri ve bilinen riskleri belirtin.

## Lisans ve Destek
- Lisans: ISC
- Sorularınız için GitHub Issue açabilir veya ekip ile iletişime geçebilirsiniz.
- Operasyonel destek veya özel geliştirme ihtiyaçları için lütfen proje sahipleriyle iletişime geçin.