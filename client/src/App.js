import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Properties from './pages/Properties';
import RentProperties from './pages/RentProperties';
import SaleProperties from './pages/SaleProperties';
import Compare from './pages/Compare';
import PropertyDetail from './pages/PropertyDetail';
import Checkout from './pages/Checkout';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import ChatWidget from './components/ChatWidget';
import StickyBar from './components/StickyBar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import { KVKK, Cookies, Terms, Cancellation } from './pages/Legal';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
// FAQ sayfası kaldırıldı; SSS ana sayfaya taşındı
import Contact from './pages/Contact';
import { AuthProvider } from './context/AuthContext';
import './App.css';
// Admin stillerinin her zaman yüklenmesi için global import
import './pages/AdminDashboard.css';
import Maintenance from './pages/Maintenance';
import api, { API_URL } from './services/api';
import { initTracking, trackPageView, getTrackingConfig } from './utils/tracking';

function App() {
  const [maintenance, setMaintenance] = useState({ maintenanceMode: false, maintenanceMessage: '', contactEmail:'', contactPhone:'', contactAddress:'' });
  const trackingConfig = getTrackingConfig();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/settings`);
        const data = await res.json();
        setMaintenance({ 
          maintenanceMode: !!data.maintenanceMode,
          maintenanceMessage: data.maintenanceMessage || '',
          contactEmail: data.contactEmail || 'info@example.com',
          contactPhone: data.contactPhone || '+90 555 555 55 55',
          contactAddress: data.contactAddress || 'Atatürk Cad. No:123, Muratpaşa, Antalya'
        });
      } catch (_) {
        setMaintenance({ maintenanceMode: false, maintenanceMessage: '', contactEmail:'', contactPhone:'', contactAddress:'' });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    initTracking();
  }, []);

  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/admin-login');

  const showMaintenance = maintenance.maintenanceMode && !isAdminPath;

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <RouteTracker disabled={showMaintenance} />
        <TrackingPixels facebookPixelId={trackingConfig.facebookPixelId} />
        <div className="App">
          {!showMaintenance && <Navbar />}
          <main className="page-content">
          {showMaintenance ? (
            <Maintenance message={maintenance.maintenanceMessage} email={maintenance.contactEmail} phone={maintenance.contactPhone} address={maintenance.contactAddress} />
          ) : (
          <Routes>
            <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/kiralik" element={<RentProperties />} />
        <Route path="/satilik" element={<SaleProperties />} />
        <Route path="/karsilastir" element={<Compare />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/search" element={<Properties />} />
            <Route path="/checkout/:propertyId" element={<Checkout />} />
            <Route path="/error" element={<ServerError />} />
            <Route path="/kvkk" element={<KVKK />} />
            <Route path="/cerez-politikasi" element={<Cookies />} />
            <Route path="/kullanim-kosullari" element={<Terms />} />
            <Route path="/iptal-iade" element={<Cancellation />} />
        <Route path="*" element={<NotFound />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
          )}
          </main>
      {!showMaintenance && <CookieConsent />}
      {!showMaintenance && <ChatWidget />}
      {!showMaintenance && <StickyBar />}
      {!showMaintenance && <Footer />}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Sayfa değiştiğinde scroll'u en üste al
    // setTimeout ile biraz geciktiriyoruz ki diğer sayfa yükleme işlemleri tamamlansın
    const timer = setTimeout(() => {
      // Properties sayfasına geri dönüldüğünde scroll pozisyonunu korumak için
      // sessionStorage kontrolü yapıyoruz
      if (location.pathname === '/properties' && sessionStorage.getItem('listScroll')) {
        // Properties sayfasındaki scroll geri yükleme mekanizması çalışsın
        return;
      }
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
};

const RouteTracker = ({ disabled }) => {
  const location = useLocation();

  useEffect(() => {
    if (disabled) return;
    const path = `${location.pathname}${location.search}`;
    trackPageView(path);
  }, [location, disabled]);

  return null;
};

const TrackingPixels = ({ facebookPixelId }) => {
  if (!facebookPixelId) return null;
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
        alt="facebook pixel"
      />
    </div>
  );
};



