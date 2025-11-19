# .env Dosyası Kurulum Rehberi

Proje kök dizininde `.env` dosyası oluşturun ve aşağıdaki içeriği ekleyin:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MySQL Database Configuration
# Hosting'inizden aldığınız MySQL bilgilerini buraya girin
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gunluk_kiralik_evim
DB_USER=root
DB_PASSWORD=your_password

# JWT Secret Key (güvenli bir rastgele string kullanın)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (Opsiyonel - e-posta gönderimi için)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@yourdomain.com

# Frontend URL (Opsiyonel)
# REACT_APP_API_URL=http://localhost:5000
```

## Hosting için Önemli Notlar

1. **DB_HOST**: Genellikle `localhost` olur, ancak bazı hostingler farklı bir host adresi verebilir (örn: `mysql.yourhosting.com`)

2. **DB_NAME ve DB_USER**: Hosting panelinizde oluşturduğunuz veritabanı ve kullanıcı adlarını kullanın. Genellikle hosting kullanıcı adınızla başlar (örn: `kullanici_gunluk_evim`)

3. **DB_PASSWORD**: Hosting'inizde oluşturduğunuz veritabanı kullanıcısının şifresini girin

4. **JWT_SECRET**: Güvenli bir rastgele string kullanın. Örnek:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## PHPMyAdmin ile Veritabanı Oluşturma

1. Hosting panelinizden PHPMyAdmin'e giriş yapın
2. "SQL" sekmesine gidin
3. Aşağıdaki komutu çalıştırın:

```sql
CREATE DATABASE gunluk_kiralik_evim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Yeni bir kullanıcı oluşturun ve veritabanına tam yetki verin

