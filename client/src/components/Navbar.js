import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBars, FaTimes, FaHome } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import './Navbar.css';
import { API_URL } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [site, setSite] = useState({ title: 'Günlük Kiralık Evim', icon: 'FaHome' });

  useEffect(() => {
    (async()=>{
      try{ const r = await fetch(`${API_URL}/api/public/settings`); const s = await r.json(); setSite({ title: s.siteTitle || 'Günlük Kiralık Evim', icon: s.siteIcon || 'FaHome', siteLogoUrl: s.siteLogoUrl || '', siteLogoWidth: s.siteLogoWidth || 0, siteLogoHeight: s.siteLogoHeight || 24 }); } catch(_){ }
    })();
  }, []);

  const IconComp = FaIcons[site.icon] || FaHome;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Admin route'larında navbar gösterilmesin
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <Link to="/" className="logo">
            {site.siteLogoUrl ? (
              <img className="logo-img" src={(site.siteLogoUrl.startsWith('/uploads') ? `${API_URL}${site.siteLogoUrl}` : site.siteLogoUrl)} alt={site.title} />
            ) : (
              <IconComp />
            )}
            {site.title}
          </Link>

          <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>Ana Sayfa</Link>
            <Link to="/properties" onClick={() => setMobileMenuOpen(false)} state={{ clearFilters: true }}>Daireler</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>İletişim</Link>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;



