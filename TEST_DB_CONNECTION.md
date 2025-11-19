# MySQL Bağlantı Testi

500 hatası alıyorsanız, muhtemelen MySQL bağlantısı başarısız. Aşağıdaki adımları takip edin:

## 1. MySQL'in Çalıştığını Kontrol Edin

**XAMPP/WAMP kullanıyorsanız:**
- XAMPP/WAMP Control Panel'i açın
- MySQL servisinin çalıştığından emin olun (yeşil işaret)

**MySQL Service olarak kuruluysa:**
- Windows Services'i açın (Win+R, services.msc)
- MySQL servisinin "Running" durumunda olduğundan emin olun

## 2. Veritabanını Oluşturun

phpMyAdmin'e gidin (http://localhost/phpmyadmin) ve şu komutu çalıştırın:

```sql
CREATE DATABASE gunluk_kiralik_evim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. .env Dosyasını Kontrol Edin

Proje kök dizinindeki `.env` dosyasında şu değerler olmalı:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gunluk_kiralik_evim
DB_USER=root
DB_PASSWORD=
```

**Not:** Eğer MySQL root şifreniz varsa, `DB_PASSWORD=` satırına şifrenizi yazın.

## 4. Server'ı Yeniden Başlatın

1. Çalışan tüm Node.js process'lerini durdurun
2. `npm start` komutuyla server'ı yeniden başlatın
3. Console'da "MySQL bağlantısı başarılı" mesajını görmelisiniz

## 5. Hata Devam Ederse

Server console loglarını kontrol edin. Şu hatalardan biri görülebilir:

- `Access denied for user 'root'@'localhost'` → MySQL şifresi yanlış veya kullanıcı yetkisi yok
- `Unknown database 'gunluk_kiralik_evim'` → Veritabanı oluşturulmamış
- `ECONNREFUSED` → MySQL servisi çalışmıyor

## 6. Alternatif: Yeni MySQL Kullanıcısı Oluşturun

Eğer root şifresi sorun çıkarıyorsa, yeni bir kullanıcı oluşturun:

```sql
CREATE USER 'gunluk_evim'@'localhost' IDENTIFIED BY 'sifreniz';
GRANT ALL PRIVILEGES ON gunluk_kiralik_evim.* TO 'gunluk_evim'@'localhost';
FLUSH PRIVILEGES;
```

Sonra `.env` dosyasını güncelleyin:
```env
DB_USER=gunluk_evim
DB_PASSWORD=sifreniz
```

