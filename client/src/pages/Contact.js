import React, { useState, useEffect } from 'react';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaClock, FaWhatsapp, FaInstagram, FaFacebook, FaCheckCircle } from 'react-icons/fa';
import './Contact.css';
import api from '../services/api';
import { setSEO, addJSONLD } from '../utils/seo';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contactInfo, setContactInfo] = useState({ phone: '+90 (555) 123 45 67', email: 'info@gunlukkiralikevim.com', addressLine1: 'Altıntaş, Kardeş Kentler Cd. no:49 E, 07230', addressLine2: 'Muratpaşa / Antalya', openingHours: 'Pazartesi - Pazar: 09:00 - 22:00', mapEmbedUrl: '', instagramUrl: '' });

  useEffect(() => {
    setSEO({
      title: 'İletişim | Günlük Kiralık Evim',
      description: 'Rezervasyon, soru ve destek için bizimle iletişime geçin. Telefon, e‑posta veya WhatsApp ile ulaşın.',
      canonical: '/contact'
    });
    // LocalBusiness JSON-LD
    addJSONLD('localBusiness', {
      '@context':'https://schema.org',
      '@type':'LocalBusiness',
      name:'Günlük Kiralık Evim',
      address:{ '@type':'PostalAddress', streetAddress:'Altıntaş, Kardeş Kentler Cd. no:49 E', addressLocality:'Muratpaşa', addressRegion:'Antalya', postalCode:'07230', addressCountry:'TR' },
      telephone:'+90-555-123-45-67',
      openingHours:['Mo-Su 09:00-22:00']
    });
    // Public settings'ten iletişim bilgilerini çek
    (async () => {
      try {
        const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/public/settings`);
        const data = await res.json();
        const phone = data.contactPhone || '+90 555 555 55 55';
        const email = data.contactEmail || 'info@example.com';
        const address = (data.contactAddress || '').trim();
        let addressLine1 = address;
        let addressLine2 = '';
        if (address.includes('\n')) {
          const [l1, ...rest] = address.split('\n');
          addressLine1 = l1;
          addressLine2 = rest.join(' ').trim();
        }
        setContactInfo({ phone, email, addressLine1: addressLine1 || 'Adres', addressLine2, openingHours: data.openingHours || 'Pazartesi - Pazar: 09:00 - 22:00', mapEmbedUrl: data.mapEmbedUrl || '', instagramUrl: data.instagramUrl || '' });
      } catch (_) {}
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      alert(error.response?.data?.message || 'Mesaj gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="container">
          <h1>Size nasıl yardımcı olabiliriz?</h1>
        </div>
      </section>

      <div className="container">
        <div className="info-header global">
          <h2>Bizimle İletişime Geçin</h2>
          <p className="contact-intro">
            Rezervasyon, soru veya destek için bize ulaşabilirsiniz. 
            Size en kısa sürede geri dönüş yapacağız.
          </p>
        </div>
        <div className="contact-content">
          {/* İletişim Bilgileri */}
          <div className="contact-info-section">

            <div className="contact-cards">
              <div className="contact-card">
                <div className="contact-icon phone">
                  <FaPhoneAlt />
                </div>
                <h3>Telefon</h3>
                <p>7/24 Destek Hattı</p>
                <a href={`tel:${contactInfo.phone.replace(/\s|\(|\)|-/g,'')}`}>{contactInfo.phone}</a>
              </div>

              <div className="contact-card">
                <div className="contact-icon email">
                  <FaEnvelope />
                </div>
                <h3>E-posta</h3>
                <p>Genel İletişim</p>
                <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
              </div>

              <div className="contact-card">
                <div className="contact-icon whatsapp">
                  <FaWhatsapp />
                </div>
                <h3>WhatsApp</h3>
                <p>Hızlı Mesajlaşma</p>
                <a href={`https://wa.me/${contactInfo.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp'tan Yazın
                </a>
              </div>

              {/* Sosyal Medyayı WhatsApp ile yan yana olacak şekilde hemen ardından getirdik */}
              <div className="contact-card">
                <div className="contact-icon social">
                  <FaInstagram />
                </div>
                <h3>Sosyal Medya</h3>
                <p>Bizi Takip Edin</p>
                <div className="social-links">
                  <a href={contactInfo.instagramUrl || '#'} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                    <FaInstagram /> Instagram
                  </a>
                </div>
              </div>

              {/* Alt sırada Adres ve Çalışma Saatleri yan yana */}
              <div className="contact-card">
                <div className="contact-icon location">
                  <FaMapMarkerAlt />
                </div>
                <h3>Adres</h3>
                <p>Ofis Konumumuz</p>
                <address>
                  {contactInfo.addressLine1}<br />
                  {contactInfo.addressLine2}
                </address>
              </div>

              <div className="contact-card">
                <div className="contact-icon clock">
                  <FaClock />
                </div>
                <h3>Çalışma Saatleri</h3>
                <p>Hafta İçi & Hafta Sonu</p>
                <div className="hours">
                  <p>{contactInfo.openingHours || '09:00 - 22:00'}</p>
                  <p className="note">7/24 Acil Destek</p>
                </div>
              </div>
            </div>
          </div>

          {/* İletişim Formu */}
          <div className="contact-form-section">
            <h2>Mesaj Gönderin</h2>
            <p className="form-intro">
              Formu doldurup gönderin, size en kısa sürede geri dönüş yapalım.
            </p>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Adınız Soyadınız *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div className="input-group">
                  <label>E-posta Adresiniz *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Telefon Numaranız *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="05XX XXX XX XX"
                  />
                </div>

                <div className="input-group">
                  <label>Konu *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Konu Seçiniz</option>
                    <option value="bilgi">Genel Bilgi</option>
                    <option value="ozel-talep">Özel Talep</option>
                    <option value="sikayet">Şikayet / Öneri</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Mesajınız *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Mesajınızı buraya yazın..."
                />
              </div>

              <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Mesaj Gönder'}
              </button>

              <p className="form-note">
                <FaClock /> Mesajınıza genellikle 2 saat içinde yanıt veriyoruz.
              </p>
            </form>
          </div>
        </div>

        {/* Harita Bölümü */}
        <section className="map-section">
          <h2>Ofis Konumumuz</h2>
          <div className="map-container">
            <iframe
              src={contactInfo.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d199.48501896733512!2d30.81925443004665!3d36.8721558418272!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1str!2str!4v1762164311741!5m2!1str!2str"}
              width="100%"
              height="450"
              style={{ border: 0, borderRadius: '12px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ofis Konumu"
            ></iframe>
          </div>
          
          {/** Adres/Telefon alanı kullanıcı talebiyle kaldırıldı **/}
        </section>

        {/** SSS linki ana sayfaya taşındı **/}
      </div>

      {/* Mesaj Başarı Modalı */}
      {submitted && (
        <div className="contact-success-overlay" onClick={() => setSubmitted(false)}>
          <div className="contact-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contact-success-header">
              <div className="contact-success-icon">
                <FaEnvelope />
              </div>
              <h3>Mesajınız Bize Ulaştı</h3>
              <p className="contact-success-subtitle">Teşekkür ederiz!</p>
            </div>
            <div className="contact-success-body">
              <p className="contact-success-message">
                Mesajınız başarıyla gönderildi. En kısa sürede size geri dönüş yapacağız.
              </p>
            </div>
            <div className="contact-success-actions">
              <button 
                type="button"
                className="btn-contact-ok"
                onClick={() => setSubmitted(false)}
              >
                <FaCheckCircle className="btn-icon" />
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;


