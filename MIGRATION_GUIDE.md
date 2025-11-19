# MongoDB'den MySQL/MariaDB'ye Geçiş Rehberi

Bu proje MongoDB'den MySQL/MariaDB'ye başarıyla geçirilmiştir. Sequelize ORM kullanılmaktadır.

## Yapılan Değişiklikler

1. **Paketler:**
   - `mongoose` kaldırıldı
   - `sequelize` ve `mysql2` eklendi

2. **Modeller:**
   - Tüm Mongoose modelleri Sequelize modellerine dönüştürüldü
   - Modeller `server/models/` klasöründe

3. **Veritabanı Bağlantısı:**
   - `server/config/database.js` dosyası oluşturuldu
   - MongoDB bağlantısı MySQL bağlantısına çevrildi

4. **Route Dosyaları:**
   - Tüm MongoDB sorguları Sequelize sorgularına çevrildi
   - `findById` → `findByPk`
   - `findOne({ email })` → `findOne({ where: { email } })`
   - `find()` → `findAll()`
   - `new Model()` + `save()` → `Model.create()`
   - `populate()` → `include`

## Kurulum

1. **Paketleri yükleyin:**
```bash
npm install
```

2. **Veritabanı ayarlarını yapın:**
`.env` dosyasına aşağıdaki değişkenleri ekleyin:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gunluk_kiralik_evim
DB_USER=root
DB_PASSWORD=your_password
```

3. **MySQL/MariaDB veritabanını oluşturun:**
```sql
CREATE DATABASE gunluk_kiralik_evim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. **Uygulamayı başlatın:**
```bash
npm start
```

Uygulama ilk çalıştırmada tabloları otomatik olarak oluşturacaktır.

## Notlar

- Modeller Mongoose uyumluluğu için `toJSON()` metodunu kullanır
- `_id` alanı `id` olarak dönüştürülür
- Nested objeler (location, pricing, rating) JSON formatında saklanır
- Tüm ilişkiler Sequelize associations ile tanımlanmıştır

## Hosting'e Yükleme

### 1. Veritabanı Oluşturma

Hosting panelinizden (cPanel, Plesk, vb.) MySQL/MariaDB veritabanı oluşturun:

**cPanel için:**
1. cPanel'e giriş yapın
2. "MySQL Veritabanları" bölümüne gidin
3. Yeni bir veritabanı oluşturun (örn: `kullanici_gunluk_evim`)
4. Yeni bir kullanıcı oluşturun ve veritabanına tam yetki verin
5. Veritabanı bilgilerini not edin

**PHPMyAdmin ile:**
1. PHPMyAdmin'e giriş yapın
2. Yeni veritabanı oluşturun:
   ```sql
   CREATE DATABASE gunluk_kiralik_evim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 2. .env Dosyası Oluşturma

Proje kök dizininde `.env` dosyası oluşturun ve hosting'inizden aldığınız bilgileri girin:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MySQL Database Configuration
# Hosting'inizden aldığınız MySQL bilgilerini buraya girin
DB_HOST=localhost
# veya hosting'inizin verdiği host adresi (örn: mysql.yourhosting.com)
DB_PORT=3306
DB_NAME=kullanici_gunluk_evim  # Hosting'inizde oluşturduğunuz veritabanı adı
DB_USER=kullanici_dbuser       # Hosting'inizde oluşturduğunuz kullanıcı adı
DB_PASSWORD=your_secure_password # Veritabanı şifresi

# JWT Secret Key (güvenli bir rastgele string kullanın)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (Opsiyonel)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@yourdomain.com
```

**Önemli Notlar:**
- `DB_HOST` genellikle `localhost` olur, ancak bazı hostingler farklı bir host adresi verebilir
- `DB_NAME` ve `DB_USER` genellikle hosting kullanıcı adınızla başlar (örn: `kullanici_veritabani`)
- Şifrelerde özel karakterler varsa tırnak içine almayın, direkt yazın

### 3. Dosyaları Yükleme

1. Tüm proje dosyalarını hosting'inize yükleyin (FTP, SFTP veya hosting paneli üzerinden)
2. `node_modules` klasörünü yüklemeyin (hosting'de `npm install` çalıştıracaksınız)

### 4. Bağımlılıkları Yükleme

Hosting'inizde SSH erişimi varsa:
```bash
npm install --production
```

SSH yoksa, hosting panelinizden Node.js uygulamanızı başlatın (genellikle otomatik olarak `npm install` çalıştırır).

### 5. Uygulamayı Başlatma

Uygulama ilk çalıştırmada tabloları otomatik olarak oluşturacaktır. Başlangıçta:
- Admin kullanıcısı otomatik oluşturulur (email: `admin`, şifre: `123456`)
- İkincil admin kullanıcısı oluşturulur (email: `mukaddes`, şifre: `123456`)

**Güvenlik:** İlk girişten sonra admin şifrelerini değiştirin!

### 6. Sorun Giderme

**Bağlantı hatası alıyorsanız:**
- `.env` dosyasındaki veritabanı bilgilerini kontrol edin
- Hosting'inizin MySQL portunu kontrol edin (genellikle 3306)
- Veritabanı kullanıcısının doğru yetkilere sahip olduğundan emin olun
- Firewall ayarlarını kontrol edin

**Tablolar oluşmuyorsa:**
- Veritabanı bağlantısının başarılı olduğundan emin olun
- `server/index.js` dosyasında `sequelize.sync({ alter: false })` satırını kontrol edin
- Log dosyalarını inceleyin

