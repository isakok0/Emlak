import React from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;
  return (
    <footer style={{marginTop:40, background:'#fff', borderTop:'1px solid #eee'}}>
      <div className="container" style={{padding:'24px 0', display:'flex', flexWrap:'wrap', gap:16, justifyContent:'space-between'}}>
        <div>© {new Date().getFullYear()} Antalya Daire</div>
        <nav style={{display:'flex', gap:16}}>
          <Link to="/kvkk">KVKK</Link>
          <Link to="/cerez-politikasi">Çerez Politikası</Link>
          <Link to="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link to="/iptal-iade">İptal & İade Şartları</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;


