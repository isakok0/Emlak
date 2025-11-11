import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';

const StickyBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+90 555 555 55 55');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/settings`);
        const data = await res.json();
        if (mounted && data?.contactPhone) setPhone(data.contactPhone);
      } catch(_) {}
    })();
    return () => { mounted = false; };
  }, []);
  if (location.pathname.startsWith('/admin')) return null;

  const onAction = () => {
    if (location.pathname.startsWith('/properties/')) {
      const el = document.getElementById('bookingSection');
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    navigate('/properties');
  };

  return (
    <div className="sticky-ad">
      <div className="sticky-ad-inner">
        <div className="sticky-title">Hızlı İşlem</div>
        <a className="btn btn-secondary" href={`tel:${phone.replace(/\s|\(|\)|-/g,'')}`}>Ara</a>
        <a className="btn btn-secondary" href={`https://wa.me/${phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="btn btn-primary" onClick={onAction}>{location.pathname.startsWith('/properties/') ? 'Devam' : 'Rezervasyon'}</button>
      </div>
    </div>
  );
};

export default StickyBar;


