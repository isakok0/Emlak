# Login Test Rehberi

500 hatası alıyorsanız, backend console loglarını kontrol edin.

## Backend Console'da Kontrol Edin

Backend terminalinde (npm start çalıştırdığınız terminal) şu mesajları arayın:

1. **Login error:** ile başlayan mesajlar
2. **Error stack:** ile başlayan mesajlar

Bu mesajlar hangi hatanın oluştuğunu gösterecek.

## Manuel Test

PowerShell'de şu komutu çalıştırarak login endpoint'ini test edebilirsiniz:

```powershell
$body = @{
    email = "admin"
    password = "123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## Olası Sorunlar

1. **Admin kullanıcısı yok:** Backend console'da "Süper admin kullanıcısı oluşturuldu" mesajını görmelisiniz
2. **Şifre hash sorunu:** Admin şifresi düzgün hash'lenmemiş olabilir
3. **Veritabanı bağlantı sorunu:** MySQL bağlantısı kopmuş olabilir

## Çözüm

Backend console'daki hata mesajını paylaşın, birlikte çözelim.

