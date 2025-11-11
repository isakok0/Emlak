const nodemailer = require('nodemailer');

// Email transporter oluştur
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Rezervasyon talebi alındı e-postası
exports.sendRequestReceivedEmail = async (guestEmail, guestName, booking) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Günlük Kiralık Evim" <${process.env.EMAIL_USER}>`,
      to: guestEmail,
      subject: 'Rezervasyon Talebiniz Alındı',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Rezervasyon Talebiniz Alındı</h2>
          <p>Sayın ${guestName},</p>
          <p>Rezervasyon talebiniz başarıyla alınmıştır. Talebiniz en kısa sürede değerlendirilecek ve size geri dönüş yapılacaktır.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Rezervasyon Detayları</h3>
            <p><strong>Giriş Tarihi:</strong> ${new Date(booking.checkIn).toLocaleDateString('tr-TR')}</p>
            <p><strong>Çıkış Tarihi:</strong> ${new Date(booking.checkOut).toLocaleDateString('tr-TR')}</p>
            <p><strong>Misafir Sayısı:</strong> ${booking.guests.adults} Yetişkin ${booking.guests.children ? `, ${booking.guests.children} Çocuk` : ''}</p>
            <p><strong>Toplam Tutar:</strong> ₺${booking.pricing.total}</p>
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Önemli:</strong> Ödeme işlemi daire teslim edilirken veya ofisten yapılacaktır. Online ödeme bulunmamaktadır.</p>
          </div>
          
          <p>Size en kısa sürede geri dönüş yapılacaktır. Sorularınız için bizimle iletişime geçebilirsiniz.</p>
          <p>Teşekkürler,<br>Günlük Kiralık Evim Ekibi</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Rezervasyon talebi e-postası gönderildi:', guestEmail);
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
  }
};

// Rezervasyon onaylandı e-postası
exports.sendRequestApprovedEmail = async (guestEmail, guestName, booking, paymentInfo) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Günlük Kiralık Evim" <${process.env.EMAIL_USER}>`,
      to: guestEmail,
      subject: 'Rezervasyon Talebiniz Onaylandı',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Rezervasyon Talebiniz Onaylandı</h2>
          <p>Sayın ${guestName},</p>
          <p>Rezervasyon talebiniz onaylanmıştır!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Rezervasyon Detayları</h3>
            <p><strong>Giriş Tarihi:</strong> ${new Date(booking.checkIn).toLocaleDateString('tr-TR')}</p>
            <p><strong>Çıkış Tarihi:</strong> ${new Date(booking.checkOut).toLocaleDateString('tr-TR')}</p>
            <p><strong>Toplam Tutar:</strong> ₺${booking.pricing.total}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0;">Ödeme Bilgisi</h3>
            <p><strong>Ödeme, daire teslim edilirken veya ofisten yapılacaktır.</strong></p>
            <p>Lütfen rezervasyon günü belirlenen saatte daireyi teslim almak üzere hazır olunuz.</p>
            ${paymentInfo ? `<p><strong>Ek Bilgiler:</strong><br>${paymentInfo}</p>` : ''}
          </div>
          
          <p>Rezervasyonunuz kesinleşmiştir. Daire teslimi hakkında size ayrıca bilgi verilecektir.</p>
          <p>Teşekkürler,<br>Günlük Kiralık Evim Ekibi</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Rezervasyon onay e-postası gönderildi:', guestEmail);
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
  }
};

// Rezervasyon iptal edildi e-postası
exports.sendRequestCancelledEmail = async (guestEmail, guestName, booking, reason) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Günlük Kiralık Evim" <${process.env.EMAIL_USER}>`,
      to: guestEmail,
      subject: 'Rezervasyon Talebi İptal Edildi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Rezervasyon Talebi İptal Edildi</h2>
          <p>Sayın ${guestName},</p>
          <p>Maalesef rezervasyon talebiniz iptal edilmiştir.</p>
          ${reason ? `<p><strong>Sebep:</strong> ${reason}</p>` : ''}
          <p>Başka bir daire için rezervasyon yapmak isterseniz, lütfen web sitemizi ziyaret edin.</p>
          <p>Teşekkürler,<br>Günlük Kiralık Evim Ekibi</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Rezervasyon iptal e-postası gönderildi:', guestEmail);
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
  }
};

// Admin'e yeni rezervasyon talebi bildirimi
exports.notifyAdminNewRequest = async (adminEmail, booking) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Günlük Kiralık Evim" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'Yeni Rezervasyon Talebi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Yeni Rezervasyon Talebi</h2>
          <p>Yeni bir rezervasyon talebi alınmıştır. Lütfen admin panelinden değerlendirin.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Rezervasyon Detayları</h3>
            <p><strong>Müşteri:</strong> ${booking.guestInfo.name}</p>
            <p><strong>E-posta:</strong> ${booking.guestInfo.email}</p>
            <p><strong>Telefon:</strong> ${booking.guestInfo.phone}</p>
            <p><strong>Giriş:</strong> ${new Date(booking.checkIn).toLocaleDateString('tr-TR')}</p>
            <p><strong>Çıkış:</strong> ${new Date(booking.checkOut).toLocaleDateString('tr-TR')}</p>
            <p><strong>Toplam:</strong> ₺${booking.pricing.total}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin bildirim e-postası gönderildi');
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
  }
};

