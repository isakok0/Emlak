# Günlük Kiralık Evim - Platformu

Günlük kiralık ev platformu için tam özellikli bir web uygulaması. Node.js, Express.js ve MongoDB kullanılarak geliştirilmiştir.

## Özellikler

### 🏠 Daire İlanı Özellikleri
- Detaylı ilan sayfaları
- Yüksek kaliteli görsel/video desteği
- Açıklama, konum, olanaklar bilgileri
- Günlük ve haftalık fiyatlandırma
- Dinamik fiyatlandırma (sezonsal)
- Müsaitlik takvimi

### 📅 Rezervasyon ve Ödeme Sistemi
- Gelişmiş arama ve filtreleme
- Konum bazlı arama
- Tarih ve misafir sayısına göre filtreleme
- Rezervasyon talebi oluşturma (online ödeme yok)
- **Ödeme sadece daire teslim edilirken veya ofisten yapılır**
- Admin onay sistemi ile rezervasyon yönetimi
- Anlık onay/bildirim sistemi (e-posta)

### 🌟 Kullanıcı Etkileşimi
- Kullanıcı kaydı/girişi
- Misafir yorumları ve puanlama (sadece konaklamış kişiler)
- SSS sayfası
- İletişim bilgileri ve canlı destek

### 👨‍💼 Admin Paneli
- Dashboard istatistikleri
- Daire yönetimi
- Rezervasyon yönetimi
- Kullanıcı yönetimi

## Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- MongoDB (yerel veya MongoDB Atlas)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın veya indirin**

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Ortam değişkenlerini ayarlayın**
   ```bash
   cp .env.example .env
   ```
   
   `.env` dosyasını düzenleyin ve gerekli bilgileri girin:
   - `MONGODB_URI`: MongoDB bağlantı URL'iniz
   - `JWT_SECRET`: Güvenli bir JWT secret anahtarı
   - Email ayarları (bildirimler için)

4. **Uploads klasörünü oluşturun**
   ```bash
   mkdir -p server/uploads
   ```

5. **Sunucuyu başlatın**
   ```bash
   npm start
   ```
   
   Geliştirme modu için:
   ```bash
   npm run dev
   ```

6. **API'yi test edin**
   - API `http://localhost:5000` adresinde çalışıyor
   - Endpoints:
     - `POST /api/auth/register` - Kullanıcı kaydı
     - `POST /api/auth/login` - Giriş
     - `GET /api/properties` - Tüm daireler
     - `GET /api/search` - Gelişmiş arama

## API Endpoints

### Kimlik Doğrulama
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

### Daireler
- `GET /api/properties` - Tüm daireleri listele
- `GET /api/properties/:id` - Tek daire detayı
- `POST /api/properties` - Yeni daire ekle (auth gerekli)
- `PUT /api/properties/:id` - Daire güncelle (auth gerekli)
- `DELETE /api/properties/:id` - Daire sil (auth gerekli)

### Rezervasyonlar
- `POST /api/bookings` - Yeni rezervasyon (auth gerekli)
- `GET /api/bookings/my-bookings` - Kullanıcı rezervasyonları (auth gerekli)
- `GET /api/bookings/:id` - Rezervasyon detayı (auth gerekli)
- `PATCH /api/bookings/:id/status` - Rezervasyon durumu güncelle (auth gerekli)

### Yorumlar
- `POST /api/reviews` - Yeni yorum (auth gerekli, sadece konaklamış kişiler)
- `GET /api/reviews/property/:propertyId` - Daire yorumları
- `GET /api/reviews/my-reviews` - Kullanıcı yorumları (auth gerekli)

### Arama
- `GET /api/search` - Gelişmiş arama (query parametreleri ile)

### Admin
- `GET /api/admin/dashboard` - Dashboard istatistikleri (admin gerekli)
- `GET /api/admin/users` - Tüm kullanıcılar (admin gerekli)
- `GET /api/admin/bookings` - Tüm rezervasyonlar (admin gerekli)
- `GET /api/admin/properties` - Tüm daireler (admin gerekli)
- `PATCH /api/admin/users/:id/role` - Kullanıcı rolü güncelle (admin gerekli)

## Frontend (React)

Frontend kısmı için ayrı bir React uygulaması oluşturulabilir. Örnek bir frontend yapısı:

```
client/
  src/
    components/
      PropertyCard.js
      BookingForm.js
      ReviewForm.js
      AdminDashboard.js
    pages/
      Home.js
      PropertyDetail.js
      Search.js
      Booking.js
      Admin.js
    services/
      api.js
    App.js
```

## Güvenlik Notları

1. **JWT Secret**: Production'da güçlü bir JWT secret kullanın
2. **MongoDB**: Production'da MongoDB Atlas gibi güvenli bir servis kullanın
3. **HTTPS**: SSL sertifikası ile HTTPS kullanın
4. **File Uploads**: Dosya yükleme için güvenlik kontrolleri ekleyin
5. **Rate Limiting**: API'ye rate limiting ekleyin
6. **Input Validation**: Tüm inputları validate edin

## Ödeme Entegrasyonu

Ödeme sistemi şu anda simüle edilmiştir. Gerçek ödeme entegrasyonu için:
- İyzico
- PayTR
- Stripe
gibi servisler kullanılabilir.

## Bildirim Sistemi

Email bildirimleri için `nodemailer` kullanılmıştır. SMS bildirimleri için ek bir servis eklenebilir.

## Lisans

ISC

## Destek

Sorularınız için issue açabilir veya iletişime geçebilirsiniz.

