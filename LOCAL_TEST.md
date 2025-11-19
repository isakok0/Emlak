# Yerel Test Rehberi

## Ön Gereksinimler

1. **Node.js** kurulu olmalı (v14 veya üzeri)
2. **MySQL** veya **MariaDB** kurulu ve çalışıyor olmalı
3. **npm** kurulu olmalı

## Adım 1: MySQL Veritabanını Oluşturun

MySQL/MariaDB'ye bağlanın ve aşağıdaki komutu çalıştırın:

```sql
CREATE DATABASE gunluk_kiralik_evim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**XAMPP/WAMP kullanıyorsanız:**
- XAMPP/WAMP Control Panel'den MySQL'i başlatın
- phpMyAdmin'e giriş yapın (http://localhost/phpmyadmin)
- "SQL" sekmesine gidin ve yukarıdaki komutu çalıştırın

## Adım 2: .env Dosyasını Oluşturun

Proje kök dizininde `.env` dosyası oluşturun:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gunluk_kiralik_evim
DB_USER=root
DB_PASSWORD=
JWT_SECRET=test-jwt-secret-key-for-development
```

**Not:** Eğer MySQL root şifreniz varsa, `DB_PASSWORD=` satırına şifrenizi yazın.

## Adım 3: Bağımlılıkları Yükleyin

```bash
npm install
```

## Adım 4: Uygulamayı Başlatın

### Seçenek 1: PowerShell Script ile (Önerilen)

```powershell
.\start.ps1
```

### Seçenek 2: Manuel Başlatma

```bash
npm start
```

Server `http://localhost:5000` adresinde çalışacak.

## İlk Çalıştırma

Uygulama ilk çalıştığında:
- Tüm tablolar otomatik olarak oluşturulacak
- Admin kullanıcısı oluşturulacak:
  - Email: `admin`
  - Şifre: `123456`
- İkincil admin oluşturulacak:
  - Email: `mukaddes`
  - Şifre: `123456`

## Sorun Giderme

### MySQL Bağlantı Hatası

**Hata:** `MySQL bağlantı hatası: Access denied for user 'root'@'localhost'`

**Çözüm:**
1. MySQL root şifrenizi `.env` dosyasındaki `DB_PASSWORD` alanına ekleyin
2. Veya yeni bir MySQL kullanıcısı oluşturun:
   ```sql
   CREATE USER 'gunluk_evim'@'localhost' IDENTIFIED BY 'sifreniz';
   GRANT ALL PRIVILEGES ON gunluk_kiralik_evim.* TO 'gunluk_evim'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. `.env` dosyasında `DB_USER=gunluk_evim` ve `DB_PASSWORD=sifreniz` olarak güncelleyin

### Port 5000 Kullanımda

**Hata:** `Port 5000 zaten kullanımda`

**Çözüm:**
`.env` dosyasında `PORT=` değerini değiştirin (örn: `PORT=5001`)

### Tablolar Oluşmuyor

**Çözüm:**
1. Veritabanı bağlantısının başarılı olduğundan emin olun
2. Veritabanı kullanıcısının yeterli yetkilere sahip olduğundan emin olun
3. `server/index.js` dosyasında `sequelize.sync({ alter: false })` satırını kontrol edin

## Test Etme

1. Tarayıcıda `http://localhost:5000/api/health` adresine gidin
2. `{"status":"OK","message":"Server çalışıyor"}` yanıtını görmelisiniz
3. Admin paneline giriş yapmak için `http://localhost:5000` veya client tarafını başlatın

