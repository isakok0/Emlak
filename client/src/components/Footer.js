import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_URL } from '../services/api';
import './Footer.css';

const infoLinks = [
  { to: '/kvkk', label: 'KVKK' },
  { to: '/cerez-politikasi', label: 'Çerez Politikası' },
  { to: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { to: '/iptal-iade', label: 'İptal & İade Şartları' }
];

const quickLinks = [
  { to: '/properties', label: 'Tüm Daireler' },
  { to: '/rent', label: 'Günlük Kiralık' },
  { to: '/rent-monthly', label: 'Aylık Kiralık' },
  { to: '/sale', label: 'Satılık' },
  { to: '/contact', label: 'İletişim' }
];

const defaultState = {
  siteTitle: 'Günlük Kiralık Evim',
  contactPhone: '+90 (242) 000 00 00',
  contactEmail: 'info@gunlukkiralikevim.com',
  contactAddress: 'Lara, Muratpaşa\nAntalya / Türkiye',
  instagramUrl: '',
  footerNotice: 'Tüm hakları saklıdır.',
  footerYear: new Date().getFullYear()
};

const Footer = () => {
  const location = useLocation();
  const [settings, setSettings] = useState(defaultState);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/settings`);
        if (!response.ok) throw new Error('Settings fetch failed');
        const data = await response.json();
        if (!isMounted || !data) return;
        setSettings({
          siteTitle: data.siteTitle || defaultState.siteTitle,
          contactPhone: data.contactPhone || defaultState.contactPhone,
          contactEmail: data.contactEmail || defaultState.contactEmail,
          contactAddress: data.contactAddress || defaultState.contactAddress,
          instagramUrl: data.instagramUrl || '',
          footerNotice: data.footerNotice || defaultState.footerNotice,
          footerYear: data.footerYear || defaultState.footerYear,
        });
      } catch (error) {
        // Sessizce varsayılan değerlere düş
        console.warn('Footer settings yüklenemedi:', error?.message || error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const contactPhone = settings.contactPhone || defaultState.contactPhone;
  const contactEmail = settings.contactEmail || defaultState.contactEmail;

  const addressLines = useMemo(() => {
    const value = settings.contactAddress || '';
    return value.split(/\n|<br\s*\/?>/i).map((line) => line.trim()).filter(Boolean);
  }, [settings.contactAddress]);

  const whatsappUrl = useMemo(() => {
    const numeric = (contactPhone || '').replace(/\D+/g, '');
    if (!numeric) return '';
    return `https://wa.me/${numeric}`;
  }, [contactPhone]);

  const footerYear = settings.footerYear || defaultState.footerYear || new Date().getFullYear();

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer__wave" aria-hidden />
      <div className="container">
        <div className="site-footer__content">
          <div className="site-footer__brand">
            <div className="site-footer__logo">{settings.siteTitle}</div>
            <p className="site-footer__mission">
              Antalya&apos;nın en seçkin bölgelerinde, güvenli ve konforlu konaklama deneyimi sunuyoruz.
            </p>
            <div className="site-footer__contact">
              <a className="site-footer__highlight" href={`tel:${contactPhone}`}>
                {contactPhone}
              </a>
              <a className="site-footer__highlight" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </div>
          </div>

          <div className="site-footer__links">
            <div>
              <h4>Hızlı Erişim</h4>
              <ul>
                {quickLinks.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Bilgilendirme</h4>
              <ul>
                {infoLinks.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Adres</h4>
              <p>
                {addressLines.length
                  ? addressLines.map((line, idx) => (
                      <React.Fragment key={`${line}-${idx}`}>
                        {line}
                        {idx !== addressLines.length - 1 && <br />}
                      </React.Fragment>
                    ))
                  : (
                    <>
                      Lara, Muratpaşa
                      <br />
                      Antalya / Türkiye
                    </>
                  )}
              </p>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {footerYear} {settings.footerNotice || defaultState.footerNotice}</span>
          <div className="site-footer__social">
            {settings.instagramUrl ? (
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
                <span>Instagram</span>
              </a>
            ) : null}
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <span>WhatsApp</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


