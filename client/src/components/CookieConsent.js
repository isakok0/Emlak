import React, { useEffect, useState } from 'react';
import './CookieConsent.css';
import { getStoredConsent, storeConsent, defaultConsent } from '../utils/cookies';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState(defaultConsent());

  useEffect(() => {
    const saved = getStoredConsent();
    if (!saved) {
      setShowBanner(true);
    } else {
      setPrefs(saved);
    }
  }, []);

  const acceptAll = () => {
    const accepted = { ...defaultConsent(), preferences: true, analytics: true, marketing: true, timestamp: Date.now() };
    storeConsent(accepted);
    setPrefs(accepted);
    setShowBanner(false);
    setShowModal(false);
  };

  const rejectAll = () => {
    const rejected = { ...defaultConsent(), preferences: false, analytics: false, marketing: false, timestamp: Date.now() };
    storeConsent(rejected);
    setPrefs(rejected);
    setShowBanner(false);
    setShowModal(false);
  };

  const savePreferences = () => {
    const updated = { ...prefs, necessary: true, timestamp: Date.now() };
    storeConsent(updated);
    setShowBanner(false);
    setShowModal(false);
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {showBanner && (
        <div className="cookie-banner">
          <div className="cookie-banner__text">
            Bu sitede deneyiminizi iyileştirmek için çerezler kullanıyoruz. Daha fazla bilgi için
            <a className="cookie-banner__link" href="/cerez-politikasi"> Çerez Politikası</a> sayfasını ziyaret edin.
          </div>
          <div className="cookie-banner__actions">
            <button className="cookie-btn cookie-btn--secondary" onClick={rejectAll}>Reddet</button>
            <button className="cookie-btn cookie-btn--ghost" onClick={() => setShowModal(true)}>Çerezleri ayarla</button>
            <button className="cookie-btn cookie-btn--primary" onClick={acceptAll}>Tümünü kabul et</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="cookie-modal__backdrop" onClick={() => setShowModal(false)}>
          <div className="cookie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cookie-modal__header">
              <h3>Çerez Tercihleri</h3>
            </div>
            <div className="cookie-modal__body">
              <div className="cookie-toggle">
                <div>
                  <div className="cookie-toggle__title">Gerekli</div>
                  <div className="cookie-toggle__desc">Site çalışması için zorunludur ve kapatılamaz.</div>
                </div>
                <label className="cookie-switch">
                  <input type="checkbox" checked readOnly />
                  <span className="cookie-switch__slider" />
                </label>
              </div>

              <div className="cookie-toggle">
                <div>
                  <div className="cookie-toggle__title">Tercihler</div>
                  <div className="cookie-toggle__desc">Dil ve yerel ayarlar gibi özelleştirmeleri hatırlar.</div>
                </div>
                <label className="cookie-switch">
                  <input
                    type="checkbox"
                    checked={prefs.preferences}
                    onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })}
                  />
                  <span className="cookie-switch__slider" />
                </label>
              </div>

              <div className="cookie-toggle">
                <div>
                  <div className="cookie-toggle__title">Analitik</div>
                  <div className="cookie-toggle__desc">Site kullanımını analiz ederek geliştirmemize yardımcı olur.</div>
                </div>
                <label className="cookie-switch">
                  <input
                    type="checkbox"
                    checked={prefs.analytics}
                    onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  />
                  <span className="cookie-switch__slider" />
                </label>
              </div>

              <div className="cookie-toggle">
                <div>
                  <div className="cookie-toggle__title">Pazarlama</div>
                  <div className="cookie-toggle__desc">Size özel reklam ve içerik sunmamıza yardımcı olur.</div>
                </div>
                <label className="cookie-switch">
                  <input
                    type="checkbox"
                    checked={prefs.marketing}
                    onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                  />
                  <span className="cookie-switch__slider" />
                </label>
              </div>
            </div>
            <div className="cookie-modal__footer">
              <button className="cookie-btn cookie-btn--secondary" onClick={rejectAll}>Reddet</button>
              <button className="cookie-btn cookie-btn--ghost" onClick={() => setShowModal(false)}>İptal</button>
              <button className="cookie-btn cookie-btn--primary" onClick={savePreferences}>Tercihleri kaydet</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


