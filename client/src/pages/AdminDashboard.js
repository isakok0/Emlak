import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from '../services/api';
import { FaChartBar, FaUsers, FaHome, FaCalendarCheck, FaMoneyBillWave, FaPlus, FaTrash, FaEdit, FaStar, FaRegStar, FaSyncAlt, FaSearch, FaBars, FaTimes } from 'react-icons/fa';
import BookingRequests from '../components/admin/BookingRequests';
import './AdminDashboard.css';

const MOBILE_BREAKPOINT = 640;

const TAB_LABELS = {
  dashboard: 'Dashboard',
  requests: 'Bekleyen Talepler',
  bookings: 'Tüm Rezervasyonlar',
  properties: 'Daireler',
  messages: 'Mesajlar',
  reviews: 'Yorumlar',
  calendar: 'Takvim',
  settings: 'Ayarlar'
};

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('adminActiveTab');
      const validTabs = ['dashboard', 'requests', 'bookings', 'properties', 'messages', 'reviews', 'calendar', 'settings'];
      if (stored && validTabs.includes(stored)) {
        return stored;
      }
    }
    return 'dashboard';
  });
  const [messages, setMessages] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'message'|'review'|'property', id: string, extra?: any }
  
  
  const [calendar, setCalendar] = useState({ properties: [], bookings: [] });
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [calendarRange, setCalendarRange] = useState(7);
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [calendarSearch, setCalendarSearch] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab]);

  const [dashboardData, setDashboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ maintenanceMode: false, maintenanceMessage: '', contactEmail:'', contactPhone:'', contactAddress:'' });
  const [maintenanceModalMsg, setMaintenanceModalMsg] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ contactEmail: 'info@example.com', contactPhone: '+90 555 555 55 55', contactAddress: 'Atatürk Cad. No:123, Muratpaşa, Antalya' });
  const [contactModalMsg, setContactModalMsg] = useState('');
  const [showHomepageModal, setShowHomepageModal] = useState(false);
  const [visionText, setVisionText] = useState('');
  const [missionText, setMissionText] = useState('');
  const [homepageStats, setHomepageStats] = useState({ happy:'999+', rating:'4.8', support:'7/24' });
  const [homepageBrand, setHomepageBrand] = useState({ title: 'Günlük Kiralık Evim', icon: 'FaHome' });
  const [showExtraPricingModal, setShowExtraPricingModal] = useState(false);
  const [extraPricingForm, setExtraPricingForm] = useState({ extraAdultPrice: 150, extraChildPrice: 75 });
  const [extraPricingLoading, setExtraPricingLoading] = useState(false);
  const [extraPricingMessage, setExtraPricingMessage] = useState('');
  const [showSecondaryAdminModal, setShowSecondaryAdminModal] = useState(false);
  const [secondaryAdminForm, setSecondaryAdminForm] = useState({ id: '', name: '', email: '', newPassword: '', confirmPassword: '' });
  const [secondaryAdminOriginal, setSecondaryAdminOriginal] = useState(null);
  const [secondaryAdminMessage, setSecondaryAdminMessage] = useState('');
  const [secondaryAdminLoading, setSecondaryAdminLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const SUBJECT_LABELS = {
    'bilgi': 'Genel Bilgi',
    'ozel-talep': 'Özel Talep',
    'sikayet': 'Şikayet / Öneri',
    'diger': 'Diğer',
    'rezervasyon': 'Rezervasyon' // geriye dönük kayıtlar için
  };
  const isSuperAdmin = Boolean(user?.superAdmin);
  const currentTabLabel = TAB_LABELS[activeTab] || 'Admin Paneli';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') || '';
    const pageTitle = 'Admin Paneli | Günlük Kiralık Evim';
    const pageDescription = 'Günlük Kiralık Evim yönetim panelinden daireleri, rezervasyonları ve müşteri mesajlarını yönetin.';

    document.title = pageTitle;
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription) {
        metaDescription.setAttribute('content', previousDescription);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/admin-login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
      setSettingsForm(s => ({ ...s, email: user.email || '' }));
    }
  }, [user]);

  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'settings') {
      setActiveTab('dashboard');
    }
  }, [isSuperAdmin, activeTab]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const stripTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const toDateKey = (value) => {
    const date = stripTime(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const start = stripTime(calendarStartDate);
    if (!start) return days;
    for (let i = 0; i < calendarRange; i += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      days.push(next);
    }
    return days;
  }, [calendarStartDate, calendarRange]);

  const calendarLayout = useMemo(() => {
    const dayCount = Math.max(calendarDays.length, 1);
    const compact = dayCount > 10;
    const dayWidth = compact
      ? (isMobile ? 56 : 72)
      : (isMobile ? 72 : 90);
    const propertyWidth = isMobile
      ? 180
      : (compact ? 220 : 260);
    return {
      dayCount,
      dayWidth,
      propertyWidth,
      template: `minmax(${propertyWidth}px, ${propertyWidth}px) repeat(${dayCount}, minmax(${dayWidth}px, 1fr))`
    };
  }, [calendarDays.length, isMobile]);

  const propertyBookingsMap = useMemo(() => {
    const map = {};
    (calendar.bookings || []).forEach((booking) => {
      const propertyId = booking?.property?._id || booking?.property;
      if (!propertyId) return;
      if (!map[propertyId]) map[propertyId] = [];
      map[propertyId].push(booking);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
    });
    return map;
  }, [calendar.bookings]);

  const filteredCalendarProperties = useMemo(() => {
    const items = Array.isArray(calendar.properties) ? calendar.properties : [];
    const sorted = [...items].sort((a, b) => (a?.title || '').localeCompare(b?.title || '', 'tr', { sensitivity: 'base' }));
    const term = calendarSearch.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((property) => {
      const title = (property?.title || '').toLowerCase();
      const locationText = [
        property?.location?.district,
        property?.location?.neighborhood,
        property?.location?.address
      ].filter(Boolean).join(' ').toLowerCase();
      return title.includes(term) || locationText.includes(term);
    });
  }, [calendar.properties, calendarSearch]);

  const calendarStartInputValue = useMemo(() => {
    const date = stripTime(calendarStartDate);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [calendarStartDate]);

  const handleCalendarStartChange = (event) => {
    const value = event.target.value;
    if (!value) return;
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return;
    setCalendarStartDate(new Date(year, month - 1, day));
  };

  const resetCalendarStart = () => {
    const today = new Date();
    setCalendarStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const formatDayLabel = (date) => date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  const formatWeekdayLabel = (date) => date.toLocaleDateString('tr-TR', { weekday: 'short' });

  const formatBookingRange = (booking) => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const startLabel = checkIn.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    const endLabel = checkOut.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    return `${startLabel} - ${endLabel}`;
  };

  const getBookingForDate = (bookings, day) => {
    if (!Array.isArray(bookings) || !bookings.length) return null;
    const dayStart = stripTime(day);
    if (!dayStart) return null;
    return bookings.find((booking) => {
      const checkIn = stripTime(booking.checkIn);
      const checkOut = stripTime(booking.checkOut);
      if (!checkIn || !checkOut) return false;
      return checkIn.getTime() <= dayStart.getTime() && checkOut.getTime() > dayStart.getTime();
    }) || null;
  };

  const getCellStatus = (property, day) => {
    const propertyBookings = propertyBookingsMap[property?._id] || [];
    const booking = getBookingForDate(propertyBookings, day);
    const dayKey = toDateKey(day);
    let status = 'available';
    let label = '';
    let tooltip = `${dayKey} • Müsait`;

    const slot = Array.isArray(property?.availability)
      ? property.availability.find((item) => toDateKey(item?.date) === dayKey)
      : null;

    if (slot) {
      if (slot.status === 'pending_request') {
        status = 'pending';
        label = '!';
        tooltip = `${dayKey} • Bekleyen talep`;
      } else if (slot.status === 'confirmed') {
        status = 'confirmed';
        label = '✓';
        tooltip = `${dayKey} • Onaylı rezervasyon`;
      }
    }

    if (booking) {
      const guestName = booking?.guestInfo?.name || booking?.guest?.name || 'Misafir';
      if (booking.status === 'pending_request') {
        status = 'pending';
        label = '!';
        tooltip = `${formatBookingRange(booking)} • ${guestName} • Beklemede`;
      } else if (booking.status === 'cancelled') {
        status = 'cancelled';
        label = '–';
        tooltip = `${formatBookingRange(booking)} • ${guestName} • İptal edildi`;
      } else if (booking.status === 'completed') {
        status = 'available';
        label = '';
        tooltip = `${formatBookingRange(booking)} • ${guestName} • Tamamlandı (boş)`;
      } else {
        status = 'confirmed';
        label = '✓';
        tooltip = `${formatBookingRange(booking)} • ${guestName} • Onaylı`;
      }
    }

    return { status, label, tooltip };
  };

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setDashboardData(res.data);
    } catch (error) {
      console.error('Dashboard verileri yüklenemedi:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get('/admin/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error);
    }
  }, []);

  const changeTab = (tab) => {
    if (tab === 'settings' && !isSuperAdmin) {
      return;
    }
    setActiveTab(tab);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const resetSecondaryAdminState = () => {
    setSecondaryAdminForm({ id: '', name: '', email: '', newPassword: '', confirmPassword: '' });
    setSecondaryAdminOriginal(null);
  };

  const handleOpenSecondaryAdminModal = async () => {
    if (!isSuperAdmin) return;
    setSecondaryAdminMessage('');
    resetSecondaryAdminState();
    setShowSecondaryAdminModal(true);
    setSecondaryAdminLoading(true);
    try {
      const response = await api.get('/admin/admin-users');
      const admins = Array.isArray(response.data) ? response.data : [];
      const secondary = admins.find((item) => item.role === 'admin' && !item.superAdmin);
      if (secondary) {
        const id = secondary.id || secondary._id || '';
        setSecondaryAdminForm({
          id,
          name: secondary.name || '',
          email: secondary.email || '',
          newPassword: '',
          confirmPassword: ''
        });
        setSecondaryAdminOriginal({
          id,
          name: secondary.name || '',
          email: secondary.email || ''
        });
      } else {
        setSecondaryAdminMessage('İkincil admin kullanıcısı bulunamadı.');
      }
    } catch (error) {
      setSecondaryAdminMessage('Hata: ' + (error.response?.data?.message || error.message));
    } finally {
      setSecondaryAdminLoading(false);
    }
  };

  const handleCloseSecondaryAdminModal = () => {
    setShowSecondaryAdminModal(false);
    setSecondaryAdminMessage('');
    setSecondaryAdminLoading(false);
    resetSecondaryAdminState();
  };

  const handleOpenExtraPricingModal = async () => {
    setExtraPricingMessage('');
    setShowExtraPricingModal(true);
    setExtraPricingLoading(true);
    try {
      const response = await api.get('/admin/settings');
      const settingsData = response.data || {};
      setExtraPricingForm({
        extraAdultPrice: typeof settingsData.extraAdultPrice === 'number' ? settingsData.extraAdultPrice : Number(settingsData.extraAdultPrice) || 150,
        extraChildPrice: typeof settingsData.extraChildPrice === 'number' ? settingsData.extraChildPrice : Number(settingsData.extraChildPrice) || 75
      });
    } catch (error) {
      setExtraPricingMessage('Ayarlar yüklenemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setExtraPricingLoading(false);
    }
  };

  const handleCloseExtraPricingModal = () => {
    setShowExtraPricingModal(false);
    setExtraPricingMessage('');
    setExtraPricingLoading(false);
  };

  const handleSecondaryAdminSubmit = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin) return;
    setSecondaryAdminMessage('');

    if (!secondaryAdminForm.id) {
      setSecondaryAdminMessage('Kullanıcı bulunamadı.');
      return;
    }

    const trimmedName = secondaryAdminForm.name?.trim() || '';
    const trimmedEmail = secondaryAdminForm.email?.trim() || '';
    const payload = {};

    if (trimmedName && trimmedName !== (secondaryAdminOriginal?.name || '')) {
      payload.name = trimmedName;
    }

    if (trimmedEmail && trimmedEmail !== (secondaryAdminOriginal?.email || '')) {
      payload.email = trimmedEmail;
    }

    if (secondaryAdminForm.newPassword) {
      if (secondaryAdminForm.newPassword !== secondaryAdminForm.confirmPassword) {
        setSecondaryAdminMessage('Yeni şifreler eşleşmiyor.');
        return;
      }
      payload.password = secondaryAdminForm.newPassword;
    }

    if (!payload.name && !payload.email && !payload.password) {
      setSecondaryAdminMessage('Güncellenecek bir alan seçmediniz.');
      return;
    }

    try {
      setSecondaryAdminLoading(true);
      const response = await api.patch(`/admin/admin-users/${secondaryAdminForm.id}`, payload);
      setSecondaryAdminMessage(response.data?.message || 'Kullanıcı bilgileri güncellendi.');
      setSecondaryAdminOriginal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: payload.name ?? prev.name,
          email: payload.email ?? prev.email
        };
      });
      setSecondaryAdminForm((prev) => ({
        ...prev,
        name: payload.name ?? (trimmedName || prev.name),
        email: payload.email ?? (trimmedEmail || prev.email),
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message;
      setSecondaryAdminMessage('Hata: ' + message);
    } finally {
      setSecondaryAdminLoading(false);
    }
  };

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const r = await api.get('/admin/reviews?debug=true');
      const reviewsData = r.data?.reviews || r.data || [];
      const debugInfo = r.data?.debug;

      console.log('Yorumlar yüklendi:', reviewsData);
      console.log('Yorum sayısı:', reviewsData.length);
      if (debugInfo) {
        console.log('Debug bilgisi:', debugInfo);
        console.log(`📊 Veritabanında toplam ${debugInfo.totalCount} yorum var`);
        console.log(`📋 Bulunan yorum sayısı: ${debugInfo.foundCount}`);
        console.log(`✅ Döndürülen yorum sayısı: ${debugInfo.returnedCount}`);

        if (debugInfo.totalCount > 0 && debugInfo.returnedCount === 0) {
          console.warn('⚠️ UYARI: Veritabanında yorum var ama döndürülemedi! Populate sorunu olabilir.');
        }
      }

      setReviews(reviewsData);
    } catch (e) {
      console.error('Yorumlar yüklenemedi:', e);
      console.error('Hata detayı:', e.response?.data);
      setReviewsError('Yorumlar yüklenirken bir hata oluştu: ' + (e.response?.data?.message || e.message));
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    } else if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, fetchMessages, loadReviews]);

  const fetchCalendarData = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError('');
    try {
      const [propertiesRes, bookingsRes] = await Promise.all([
        api.get('/properties?listingType=rent_daily'),
        api.get('/admin/calendar')
      ]);

      const propertyList = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
      const filteredProperties = propertyList.filter((property) => {
        const type = property?.listingType || 'rent_daily';
        const hasWeeklyPricing = Boolean(property?.pricing?.weekly);
        return ['rent', 'rent_daily'].includes(type) || hasWeeklyPricing;
      }).sort((a, b) => (a?.title || '').localeCompare(b?.title || '', 'tr', { sensitivity: 'base' }));

      const bookingList = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      setCalendar({
        properties: filteredProperties,
        bookings: bookingList
      });
      setCalendarLoaded(true);
    } catch (error) {
      console.error('Takvim verisi yüklenemedi:', error);
      setCalendarError(error.response?.data?.message || error.message || 'Takvim verisi alınamadı');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar' && user && user.role === 'admin' && !calendarLoaded && !calendarLoading) {
      fetchCalendarData();
    }
  }, [activeTab, user, calendarLoaded, calendarLoading, fetchCalendarData]);

  if (loading || loadingData) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-dashboard admin-page">
      <div className="container">
        {isMobile && (
          <div className="admin-mobile-bar">
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={toggleSidebar}
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
              <span>Menü</span>
            </button>
            <span className="admin-mobile-title">{currentTabLabel}</span>
          </div>
        )}
        <div className="admin-layout">
          <aside
            className={`admin-sidebar${isMobile ? ' is-mobile' : ''}${isMobile && isSidebarOpen ? ' is-open' : ''}`}
          >
            {isMobile && (
              <div className="admin-sidebar-header">
                <span>Menü</span>
                <button
                  type="button"
                  className="admin-menu-close"
                  onClick={closeSidebar}
                  aria-label="Menüyü kapat"
                >
                  <FaTimes />
                </button>
              </div>
            )}
            <div className="admin-tabs">
              <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => changeTab('dashboard')}>Dashboard</button>
              <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => changeTab('requests')}>Bekleyen Talepler</button>
              <button className={activeTab === 'bookings' ? 'active' : ''} onClick={() => changeTab('bookings')}>Tüm Rezervasyonlar</button>
              <button className={activeTab === 'properties' ? 'active' : ''} onClick={()=> changeTab('properties')}>Daireler</button>
              <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => changeTab('messages')}>Mesajlar</button>
              <button className={activeTab === 'reviews' ? 'active' : ''} onClick={()=>{ changeTab('reviews'); }}>
                Yorumlar
              </button>
              <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => changeTab('calendar')}>Takvim</button>
              <button
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={()=> changeTab('settings')}
                disabled={!isSuperAdmin}
                title={!isSuperAdmin ? 'Bu alan sadece ana yönetici için kullanılabilir' : undefined}
              >
                Ayarlar
              </button>
              
            </div>
          </aside>

          <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-stats">
              {dashboardData && (
                <>
                  {/** Toplam kullanıcı kartı kaldırıldı **/}
                  <div className="stat-card">
                    <FaHome />
                    <div>
                      <h3>{dashboardData.stats.totalProperties}</h3>
                      <p>Toplam Daire</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <FaCalendarCheck />
                    <div>
                      <h3>{dashboardData.stats.totalBookings}</h3>
                      <p>Toplam Rezervasyon</p>
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <FaCalendarCheck />
                    <div>
                      <h3>{dashboardData.stats.pendingRequests}</h3>
                      <p>Bekleyen Talep</p>
                    </div>
                  </div>
                  {/** Toplam gelir kartı kaldırıldı; finans sekmesinde görünüyor **/}
                </>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <BookingRequests onUpdate={fetchDashboardData} />
          )}

          {activeTab === 'bookings' && (
            <AllBookings />
          )}

          {activeTab === 'calendar' && (
            <div className="calendar-wrapper">
              <div className="calendar-toolbar">
                <div>
                  <h2>Bütünleşik Takvim Yönetimi</h2>
                  <p className="calendar-subtitle">Günlük ve haftalık kiralık dairelerin uygunluk durumunu tek bir ekrandan yönetin, çakışmaları önleyin.</p>
                </div>
                <div className="calendar-toolbar-actions">
                  <button
                    type="button"
                    className="calendar-refresh"
                    onClick={fetchCalendarData}
                    disabled={calendarLoading}
                  >
                    <FaSyncAlt /> {calendarLoading ? 'Yükleniyor...' : 'Yenile'}
                  </button>
                </div>
              </div>

              <div className="calendar-filters">
                <div className="calendar-filter-group">
                  <label>Başlangıç Tarihi</label>
                  <div className="calendar-date-control">
                    <input type="date" value={calendarStartInputValue} onChange={handleCalendarStartChange} />
                    <button type="button" onClick={resetCalendarStart}>Bugün</button>
                  </div>
                </div>
                <div className="calendar-filter-group calendar-search-group">
                  <label>Arama</label>
                  <div className="calendar-search">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Daire adı, ilçe ya da mahalle"
                      value={calendarSearch}
                      onChange={(event) => setCalendarSearch(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              {calendarError && (
                <div className="calendar-error">
                  {calendarError}
                </div>
              )}

              <div className="calendar-legend">
                <span><span className="legend-dot status-confirmed" /> Onaylı</span>
                <span><span className="legend-dot status-pending" /> Bekleyen</span>
                <span><span className="legend-dot status-available" /> Müsait</span>
                <span><span className="legend-dot status-cancelled" /> İptal</span>
              </div>

              <div className="calendar-grid-container">
                {calendarLoading && !calendarLoaded ? (
                  <div className="loading"><div className="spinner"></div></div>
                ) : filteredCalendarProperties.length > 0 ? (
                  isMobile ? (
                    <div className="calendar-mobile-list">
                      {filteredCalendarProperties.map((property) => (
                        <div className="calendar-mobile-card" key={property._id}>
                          <div className="calendar-mobile-card__info">
                            <strong>{property.title}</strong>
                            <span>
                              {[property?.location?.district, property?.location?.neighborhood]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </span>
                          </div>
                          <div className="calendar-mobile-days" role="list">
                            {calendarDays.map((day) => {
                              const cell = getCellStatus(property, day);
                              return (
                                <div
                                  key={`${property._id}-${toDateKey(day)}`}
                                  className={`calendar-mobile-day status-${cell.status}`}
                                  title={cell.tooltip}
                                  role="listitem"
                                >
                                  <span className="calendar-mobile-day__label">{formatDayLabel(day)}</span>
                                  <span className="calendar-mobile-day__weekday">{formatWeekdayLabel(day)}</span>
                                  {cell.label ? (
                                    <span className="calendar-mobile-day__mark">{cell.label}</span>
                                  ) : (
                                    <span className="calendar-mobile-day__dot">•</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="calendar-grid">
                      <div
                        className="calendar-grid-header"
                        style={{
                          gridTemplateColumns: calendarLayout.template,
                          '--property-width': `${calendarLayout.propertyWidth}px`,
                          '--day-width': `${calendarLayout.dayWidth}px`
                        }}
                      >
                        <div className="calendar-grid-property-col">Daire</div>
                        {calendarDays.map((day) => (
                          <div
                            key={toDateKey(day)}
                            className="calendar-grid-day"
                            style={{ minWidth: `${calendarLayout.dayWidth}px` }}
                          >
                            <span className="calendar-day-label">{formatDayLabel(day)}</span>
                            <span className="calendar-day-weekday">{formatWeekdayLabel(day)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="calendar-grid-body">
                        {filteredCalendarProperties.map((property) => (
                          <div
                            key={property._id}
                            className="calendar-grid-row"
                            style={{
                              gridTemplateColumns: calendarLayout.template,
                              '--property-width': `${calendarLayout.propertyWidth}px`,
                              '--day-width': `${calendarLayout.dayWidth}px`
                            }}
                          >
                            <div className="calendar-grid-property">
                              <div className="calendar-property-info">
                                <strong>{property.title}</strong>
                                <span>
                                  {[property?.location?.district, property?.location?.neighborhood]
                                    .filter(Boolean)
                                    .join(', ') || '—'}
                                </span>
                              </div>
                            </div>
                            {calendarDays.map((day) => {
                              const cell = getCellStatus(property, day);
                              return (
                                <div
                                  key={`${property._id}-${toDateKey(day)}`}
                                  className={`calendar-cell status-${cell.status}`}
                                  title={cell.tooltip}
                                  style={{ minWidth: `${calendarLayout.dayWidth}px` }}
                                >
                                  <span>{cell.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="calendar-empty">
                    <p>Listelenen kriterlerde daire bulunamadı.</p>
                    <p className="calendar-empty-hint">Günlük/haftalık kiralık daireler eklendiğinde takvim otomatik güncellenecektir.</p>
                  </div>
                )}

                {calendarLoading && calendarLoaded && (
                  <div className="calendar-inline-loader">
                    <div className="spinner"></div>
                    <span>Takvim tazeleniyor...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/** Manuel rezervasyon kaldırıldı **/}

          {activeTab === 'messages' && (
            <div>
              <h2>İletişim Mesajları</h2>
              {messages.length === 0 ? (
                <p>Mesaj bulunamadı</p>
              ) : (
                <div className="messages-grid">
                  {messages.map(m => (
                    <div key={m._id} className="message-item" onClick={()=>setActiveMessage(m)}>
                      <div className="message-header">
                        <strong>{m.name}</strong>
                        <span className="msg-date">{new Date(m.createdAt || m.date || m._id?.toString().slice(0,8)*1000).toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="message-subject">Konu: {SUBJECT_LABELS[m.subject] || m.subject}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeMessage && (
                <div className="modal-overlay" onClick={()=>setActiveMessage(null)}>
                  <div className="modal message-modal message-detail-modal" onClick={(e)=>e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Mesaj Detayı</h3>
                      <button className="close" onClick={()=>setActiveMessage(null)}>×</button>
                    </div>
                    <div className="modal-body">
                      <div className="message-detail-meta">
                        <div className="message-detail-meta__item">
                          <p className="message-detail-label">Ad Soyad</p>
                          <p className="message-detail-value">{activeMessage.name}</p>
                        </div>
                        <div className="message-detail-meta__item">
                          <p className="message-detail-label">E-posta</p>
                          <p className="message-detail-value">{activeMessage.email || '—'}</p>
                        </div>
                        <div className="message-detail-meta__item">
                          <p className="message-detail-label">Telefon</p>
                          <p className="message-detail-value">{activeMessage.phone || '—'}</p>
                        </div>
                        <div className="message-detail-meta__item">
                          <p className="message-detail-label">Gönderim</p>
                          <p className="message-detail-value">
                            {new Date(activeMessage.createdAt || activeMessage.date || activeMessage._id?.toString().slice(0,8)*1000).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <div className="message-detail-section">
                        <p className="message-detail-label">Konu</p>
                        <p className="message-detail-value">{SUBJECT_LABELS[activeMessage.subject] || activeMessage.subject}</p>
                      </div>
                      <div className="message-detail-section message-detail-section--message">
                        <p className="message-detail-label">Mesaj</p>
                        <div className="message-detail-text">
                          <p className="message-text">{activeMessage.message}</p>
                        </div>
                      </div>
                    </div>
                    <div className="modal-actions message-detail-actions">
                      <button className="btn btn-danger" onClick={()=>setConfirmDelete(activeMessage)}>Sil</button>
                    </div>
                  </div>
                </div>
              )}

              {confirmDelete && (
                <div className="modal-overlay" onClick={()=>setConfirmDelete(null)}>
                  <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
                    <div className="modal-header">Sil</div>
                    <div className="modal-body">
                      Bu mesajı silmek istediğinize emin misiniz?
                    </div>
                  <div className="modal-actions">
                      <button className="btn btn-danger" onClick={async()=>{ await api.delete(`/admin/messages/${confirmDelete._id}`); await fetchMessages(); setConfirmDelete(null); setActiveMessage(null); }}>Evet, Sil</button>
                      <button className="btn btn-secondary" onClick={()=>setConfirmDelete(null)}>Vazgeç</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/** Takvim sekmesi kaldırıldı **/}

          

          {activeTab === 'properties' && (
            <AdminProperties />
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-wrapper">
              <div className="reviews-header">
                <h2>Yorumlar</h2>
                <button 
                  className="btn btn-primary reviews-seed-btn" 
                  onClick={()=>setShowSeedConfirm(true)}
                >
                  Rastgele Yorumlar Oluştur
                </button>
              </div>
              {reviewsLoading ? (
                <div className="loading"><div className="spinner"></div></div>
              ) : reviewsError ? (
                <div className="error" style={{margin: '20px 0', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px'}}>
                  {reviewsError}
                </div>
              ) : reviews.length === 0 ? (
                <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>Yorum bulunamadı</p>
              ) : (
                <div className="reviews-grid">
                  {reviews.map(rv => {
                    // Populate edilmemiş veriler için fallback
                    const userName = rv.user?.name || (typeof rv.user === 'string' ? 'Kullanıcı' : 'Kullanıcı');
                    const createdAt = rv.createdAt ? new Date(rv.createdAt).toLocaleDateString('tr-TR') : 'Tarih yok';
                    
                    return (
                      <div key={rv._id || Math.random()} className="review-card">
                        <div className="review-card__meta">
                          <span className="review-card__name">{userName}</span>
                          <span className="review-card__date">{createdAt}</span>
                        </div>
                        <div className="review-card__body">
                          {rv.comment && (
                            <p className="review-card__comment">
                              {rv.comment}
                            </p>
                          )}
                        </div>
                        <div className="review-card__actions">
                          <button className="btn btn-danger review-card__delete" onClick={()=> setConfirmDelete({ type: 'review', id: rv._id })}>Sil</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-wrapper">
              <h2>Ayarlar</h2>
              <div className="settings-actions">
                <button className="btn btn-primary settings-actions__button settings-actions__button--primary" onClick={()=> {
                  setSettingsForm(s => ({ ...s, email: user?.email || s.email }));
                  setShowSettingsModal(true);
                }}>Hesap Ayarları</button>
                {isSuperAdmin && (
                  <button className="btn btn-secondary settings-actions__button" onClick={handleOpenSecondaryAdminModal}>
                    Admin Kullanıcı
                  </button>
                )}
                <button className="btn btn-secondary settings-actions__button" onClick={handleOpenExtraPricingModal}>
                  Ekstra Fiyat
                </button>
                <button className="btn btn-secondary settings-actions__button" onClick={async ()=> {
                  try {
                    const r = await api.get('/admin/settings');
                    const s = r.data || {};
                    setMaintenanceForm({ 
                      maintenanceMode: !!s.maintenanceMode, 
                      maintenanceMessage: s.maintenanceMessage || '',
                      contactEmail: s.contactEmail || 'info@example.com',
                      contactPhone: s.contactPhone || '+90 555 555 55 55',
                      contactAddress: s.contactAddress || 'Atatürk Cad. No:123, Muratpaşa, Antalya'
                    });
                  } catch (_) {
                    setMaintenanceForm({ maintenanceMode: false, maintenanceMessage: '', contactEmail:'', contactPhone:'', contactAddress:'' });
                  }
                  setShowMaintenanceModal(true);
                }}>Bakım Ayarı</button>
                <button className="btn settings-actions__button" onClick={async ()=>{
                  try { const r = await api.get('/admin/settings'); setVisionText(r.data?.visionText || ''); setMissionText(r.data?.missionText || ''); setHomepageStats({ happy: r.data?.statsHappyGuests || '999+', rating: r.data?.statsAvgRating || '4.8', support: r.data?.statsSupport || '7/24' }); setHomepageBrand({ title: r.data?.siteTitle || 'Günlük Kiralık Evim', icon: r.data?.siteIcon || 'FaHome' }); } catch(_) {}
                  setShowHomepageModal(true);
                }}>Ana Sayfa</button>
                <button className="btn settings-actions__button" onClick={async ()=>{
                  try {
                    const r = await api.get('/admin/settings');
                    const s = r.data || {};
                    setContactForm({
                      contactEmail: s.contactEmail || 'info@example.com',
                      contactPhone: s.contactPhone || '+90 555 555 55 55',
                      contactAddress: s.contactAddress || 'Atatürk Cad. No:123, Muratpaşa, Antalya',
                      openingHours: s.openingHours || 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)',
                      mapEmbedUrl: s.mapEmbedUrl || '',
                      instagramUrl: s.instagramUrl || ''
                    });
                  } catch(_) {}
                  setShowContactModal(true);
                }}>İletişim</button>
              </div>
            </div>
          )}
          {showHomepageModal && (
            <div className="modal-overlay" onClick={()=> setShowHomepageModal(false)}>
              <div className="modal message-modal" style={{maxWidth:'800px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Ana Sayfa İçerikleri</h3>
                  <button className="close" onClick={()=> setShowHomepageModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <form onSubmit={async(e)=>{
                    e.preventDefault();
                    try { await api.patch('/admin/settings', { visionText, missionText, statsHappyGuests: homepageStats.happy, statsAvgRating: homepageStats.rating, statsSupport: homepageStats.support, siteTitle: homepageBrand.title, siteIcon: homepageBrand.icon }); setShowHomepageModal(false);} catch(e){ alert('Hata: ' + (e.response?.data?.message || e.message)); }
                  }} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                    <div className="input-group">
                      <label>Vizyon</label>
                      <textarea rows={6} value={visionText} onChange={(e)=> setVisionText(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Misyon</label>
                      <textarea rows={6} value={missionText} onChange={(e)=> setMissionText(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Site Başlığı</label>
                      <input value={homepageBrand.title} onChange={(e)=> setHomepageBrand({...homepageBrand, title: e.target.value})} placeholder="Site başlığı" />
                    </div>
                    <div className="input-group">
                      <label>Site İkonu (react-icons/fa adı)</label>
                      <input value={homepageBrand.icon} onChange={(e)=> setHomepageBrand({...homepageBrand, icon: e.target.value})} placeholder="FaHome, FaStar, ..." />
                    </div>
                    <div className="input-group">
                      <label>Logo (görsel yükle)</label>
                      <input type="file" accept="image/*" onChange={async (e)=>{
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('logo', file);
                        try {
                          const r = await api.post('/admin/brand/logo', fd);
                          // Başarılı yükleme sonrası anlık olarak Navbar'da görünmesi için state'i güncelleyelim
                          setHomepageBrand(prev => ({ ...prev, logo: r.data?.url }));
                          alert('Logo yüklendi');
                        } catch (err) {
                          alert('Logo yüklenemedi: ' + (err.response?.data?.message || err.message));
                        }
                      }} />
                    </div>
                    <div className="input-group" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10}}>
                      <div>
                        <label>Mutlu Misafir (sayı)</label>
                        <input value={homepageStats.happy} onChange={(e)=> setHomepageStats({...homepageStats, happy:e.target.value})} placeholder="999+" />
                      </div>
                      <div>
                        <label>Ortalama Puan</label>
                        <input value={homepageStats.rating} onChange={(e)=> setHomepageStats({...homepageStats, rating:e.target.value})} placeholder="4.8" />
                      </div>
                      <div>
                        <label>Destek</label>
                        <input value={homepageStats.support} onChange={(e)=> setHomepageStats({...homepageStats, support:e.target.value})} placeholder="7/24" />
                      </div>
                    </div>
                    <div style={{display:'flex', gap:10}}>
                      <button className="btn btn-primary" type="submit">Kaydet</button>
                      <button className="btn btn-secondary" type="button" onClick={()=> setShowHomepageModal(false)}>İptal</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showExtraPricingModal && (
            <div className="modal-overlay" onClick={handleCloseExtraPricingModal}>
              <div className="modal message-modal" style={{maxWidth:'480px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Ekstra Misafir Ücretleri</h3>
                  <button className="close" onClick={handleCloseExtraPricingModal}>×</button>
                </div>
                <div className="modal-body">
                  {extraPricingMessage && (
                    <div className={extraPricingMessage.startsWith('Hata') ? 'error' : 'info'} style={{margin:'0 0 12px 0', padding:'10px', borderRadius:6}}>
                      {extraPricingMessage}
                    </div>
                  )}
                  <p style={{margin:'0 0 16px 0', color:'#475569', fontSize:'14px'}}>
                    İlk <strong>2 yetişkin</strong> ve <strong>1 çocuk</strong> ücretsizdir. Üstündeki her kişi için aşağıdaki gecelik ücretler uygulanır.
                  </p>
                  {extraPricingLoading ? (
                    <div className="loading"><div className="spinner"></div></div>
                  ) : (
                    <form onSubmit={async (e)=>{
                      e.preventDefault();
                      setExtraPricingMessage('');
                      setExtraPricingLoading(true);
                      try {
                        const payload = {
                          extraAdultPrice: Number(extraPricingForm.extraAdultPrice) || 0,
                          extraChildPrice: Number(extraPricingForm.extraChildPrice) || 0,
                          includedAdultsCount: 2,
                          includedChildrenCount: 1
                        };
                        await api.patch('/admin/settings', payload);
                        setExtraPricingMessage('Ekstra misafir ücretleri güncellendi');
                      } catch (error) {
                        setExtraPricingMessage('Hata: ' + (error.response?.data?.message || error.message));
                      } finally {
                        setExtraPricingLoading(false);
                      }
                    }} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                      <div className="input-group">
                        <label>Ekstra Yetişkin Ücreti (gecelik)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={extraPricingForm.extraAdultPrice}
                          onChange={(e)=>setExtraPricingForm({...extraPricingForm, extraAdultPrice: e.target.value })}
                          disabled={extraPricingLoading}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Ekstra Çocuk Ücreti (gecelik)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={extraPricingForm.extraChildPrice}
                          onChange={(e)=>setExtraPricingForm({...extraPricingForm, extraChildPrice: e.target.value })}
                          disabled={extraPricingLoading}
                          required
                        />
                      </div>
                      <div style={{display:'flex', gap:10}}>
                        <button className="btn btn-primary" type="submit" disabled={extraPricingLoading}>
                          {extraPricingLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={handleCloseExtraPricingModal}>
                          Kapat
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {showSettingsModal && (
            <div className="modal-overlay" onClick={()=>{ setShowSettingsModal(false); setSettingsMessage(''); }}>
              <div className="modal message-modal" style={{maxWidth:'520px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Hesap Ayarları</h3>
                  <button className="close" onClick={()=>{ setShowSettingsModal(false); setSettingsMessage(''); }}>×</button>
                </div>
                <div className="modal-body">
                  {settingsMessage && (
                    <div className="info" style={{margin:'0 0 10px 0', padding:'10px', background:'#eef6ff', color:'#0b5ed7', borderRadius:6}}>
                      {settingsMessage}
                    </div>
                  )}
                  <form onSubmit={async (e)=>{
                    e.preventDefault();
                    setSettingsMessage('');
                    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
                      setSettingsMessage('Yeni şifreler eşleşmiyor');
                      return;
                    }
                    try {
                      setSettingsLoading(true);
                      const payload = { currentPassword: settingsForm.currentPassword };
                      if (settingsForm.email && settingsForm.email !== (user?.email||'')) payload.email = settingsForm.email;
                      if (settingsForm.newPassword) payload.password = settingsForm.newPassword;
                      if (!payload.email && !payload.password) {
                        setSettingsMessage('Güncellenecek bir alan seçmediniz');
                        return;
                      }
                      await api.patch('/admin/me/credentials', payload);
                      setSettingsMessage('Bilgiler güncellendi');
                      try { const me = await api.get('/auth/me'); if (me.data?.user) { /* best-effort */ } } catch {}
                      setSettingsForm(sf => ({ ...sf, currentPassword: '', newPassword: '', confirmPassword: '' }));
                    } catch (e) {
                      const msg = e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || e.message;
                      setSettingsMessage('Hata: ' + msg);
                    } finally {
                      setSettingsLoading(false);
                    }
                  }} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                    <div className="input-group">
                      <label>Kullanıcı Adı / E-posta</label>
                      <input type="text" value={settingsForm.email} onChange={e=>setSettingsForm({...settingsForm, email:e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Mevcut Şifre</label>
                      <input type="password" required value={settingsForm.currentPassword} onChange={e=>setSettingsForm({...settingsForm, currentPassword:e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Yeni Şifre (isteğe bağlı)</label>
                      <input type="password" value={settingsForm.newPassword} onChange={e=>setSettingsForm({...settingsForm, newPassword:e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Yeni Şifre (Tekrar)</label>
                      <input type="password" value={settingsForm.confirmPassword} onChange={e=>setSettingsForm({...settingsForm, confirmPassword:e.target.value})} />
                    </div>
                    <div style={{display:'flex', gap:10}}>
                      <button className="btn btn-primary" type="submit" disabled={settingsLoading}>{settingsLoading ? 'Kaydediliyor...' : 'Kaydet'}</button>
                      <button className="btn btn-secondary" type="button" onClick={()=>{
                        setSettingsForm({ email: user?.email || '', currentPassword:'', newPassword:'', confirmPassword:'' });
                        setSettingsMessage('');
                      }}>Temizle</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showSecondaryAdminModal && (
            <div className="modal-overlay" onClick={handleCloseSecondaryAdminModal}>
              <div className="modal message-modal" style={{maxWidth:'520px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Admin Kullanıcı Yönetimi</h3>
                  <button className="close" onClick={handleCloseSecondaryAdminModal}>×</button>
                </div>
                <div className="modal-body">
                  {secondaryAdminMessage && (
                    <div className={secondaryAdminMessage.startsWith('Hata') ? 'error' : 'info'} style={{margin:'0 0 10px 0', padding:'10px', borderRadius:6}}>
                      {secondaryAdminMessage}
                    </div>
                  )}
                  {secondaryAdminLoading && !secondaryAdminOriginal ? (
                    <div className="loading"><div className="spinner"></div></div>
                  ) : secondaryAdminForm.id ? (
                    <form onSubmit={handleSecondaryAdminSubmit} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                      <div className="input-group">
                        <label>Ad Soyad</label>
                        <input
                          type="text"
                          value={secondaryAdminForm.name}
                          onChange={(e)=> setSecondaryAdminForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={secondaryAdminLoading}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Kullanıcı Adı</label>
                        <input
                          type="text"
                          value={secondaryAdminForm.email}
                          onChange={(e)=> setSecondaryAdminForm(prev => ({ ...prev, email: e.target.value }))}
                          disabled={secondaryAdminLoading}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Yeni Şifre (isteğe bağlı)</label>
                        <input
                          type="password"
                          value={secondaryAdminForm.newPassword}
                          onChange={(e)=> setSecondaryAdminForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          disabled={secondaryAdminLoading}
                        />
                      </div>
                      <div className="input-group">
                        <label>Yeni Şifre (Tekrar)</label>
                        <input
                          type="password"
                          value={secondaryAdminForm.confirmPassword}
                          onChange={(e)=> setSecondaryAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          disabled={secondaryAdminLoading}
                        />
                      </div>
                      <div className="input-group">
                        <small style={{color:'#666'}}>Not: Bu kullanıcı Ayarlar sekmesine erişemez.</small>
                      </div>
                      <div style={{display:'flex', gap:10}}>
                        <button className="btn btn-primary" type="submit" disabled={secondaryAdminLoading}>
                          {secondaryAdminLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={handleCloseSecondaryAdminModal}>
                          Kapat
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p style={{color:'#666'}}>Güncellenecek admin kullanıcısı bulunamadı.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {showMaintenanceModal && (
            <div className="modal-overlay" onClick={()=> setShowMaintenanceModal(false)}>
              <div className="modal message-modal" style={{maxWidth:'520px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Bakım Modu</h3>
                  <button className="close" onClick={()=> setShowMaintenanceModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  {maintenanceModalMsg && (
                    <div className="info" style={{margin:'0 0 10px 0', padding:'10px', background:'#e8f5e9', color:'#1b5e20', borderRadius:6}}>
                      {maintenanceModalMsg}
                    </div>
                  )}
                  <form onSubmit={async (e)=>{
                    e.preventDefault();
                    try {
                      await api.patch('/admin/settings', {
                        maintenanceMode: !!maintenanceForm.maintenanceMode,
                        maintenanceMessage: maintenanceForm.maintenanceMessage
                      });
                      setMaintenanceModalMsg('Bakım ayarı güncellendi');
                      setTimeout(()=>{ setMaintenanceModalMsg(''); }, 2500);
                    } catch (e) {
                      setMaintenanceModalMsg('Hata: ' + (e.response?.data?.message || e.message));
                    }
                  }} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                    <div className="input-group">
                      <label>Bakım Modu</label>
                      <select value={maintenanceForm.maintenanceMode ? 'on' : 'off'} onChange={(e)=> setMaintenanceForm({...maintenanceForm, maintenanceMode: e.target.value === 'on'})}>
                        <option value="off">Kapalı</option>
                        <option value="on">Açık</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Bakım Mesajı</label>
                      <textarea rows={4} value={maintenanceForm.maintenanceMessage} onChange={(e)=> setMaintenanceForm({...maintenanceForm, maintenanceMessage: e.target.value})} placeholder="Sitemiz şu anda bakımda. Lütfen daha sonra tekrar deneyiniz." />
                    </div>
                    <div style={{display:'flex', gap:10}}>
                      <button className="btn btn-primary" type="submit">Kaydet</button>
                      <button className="btn btn-secondary" type="button" onClick={()=> setShowMaintenanceModal(false)}>İptal</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showContactModal && (
            <div className="modal-overlay" onClick={()=> { setShowContactModal(false); setContactModalMsg(''); }}>
              <div className="modal message-modal" style={{maxWidth:'520px', width:'90%'}} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <h3>İletişim Bilgileri</h3>
                  <button className="close" onClick={()=> setShowContactModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  {contactModalMsg && (
                    <div className="info" style={{margin:'0 0 10px 0', padding:'10px', background:'#e8f5e9', color:'#1b5e20', borderRadius:6}}>{contactModalMsg}</div>
                  )}
                  <form onSubmit={async (e)=>{
                    e.preventDefault();
                    try {
                      await api.patch('/admin/settings', {
                        contactEmail: contactForm.contactEmail,
                        contactPhone: contactForm.contactPhone,
                        contactAddress: contactForm.contactAddress,
                        openingHours: contactForm.openingHours,
                        mapEmbedUrl: contactForm.mapEmbedUrl,
                        instagramUrl: contactForm.instagramUrl
                      });
                      setContactModalMsg('İletişim bilgileri güncellendi');
                      setTimeout(()=> setContactModalMsg(''), 2500);
                    } catch(e) {
                      setContactModalMsg('Hata: ' + (e.response?.data?.message || e.message));
                    }
                  }} className="modal-grid" style={{gridTemplateColumns:'1fr'}}>
                    <div className="input-group">
                      <label>İletişim E-posta</label>
                      <input value={contactForm.contactEmail} onChange={(e)=> setContactForm({...contactForm, contactEmail: e.target.value})} placeholder="info@example.com" />
                    </div>
                    <div className="input-group">
                      <label>İletişim Telefon</label>
                      <input value={contactForm.contactPhone} onChange={(e)=> setContactForm({...contactForm, contactPhone: e.target.value})} placeholder="+90 555 555 55 55" />
                    </div>
                    <div className="input-group">
                      <label>Adres</label>
                      <textarea rows={2} value={contactForm.contactAddress} onChange={(e)=> setContactForm({...contactForm, contactAddress: e.target.value})} placeholder="Adres bilgisi" />
                    </div>
                    <div className="input-group">
                      <label>Çalışma Saatleri</label>
                      <input value={contactForm.openingHours || ''} onChange={(e)=> setContactForm({...contactForm, openingHours: e.target.value})} placeholder="Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)" />
                    </div>
                    <div className="input-group">
                      <label>Google Maps Embed URL</label>
                      <input value={contactForm.mapEmbedUrl || ''} onChange={(e)=> setContactForm({...contactForm, mapEmbedUrl: e.target.value})} placeholder="https://www.google.com/maps/embed?... veya komple iframe kodu" />
                    </div>
                    <div className="input-group">
                      <label>Instagram URL</label>
                      <input value={contactForm.instagramUrl || ''} onChange={(e)=> setContactForm({...contactForm, instagramUrl: e.target.value})} placeholder="https://instagram.com/kullanici" />
                    </div>
                    <div style={{display:'flex', gap:10}}>
                      <button className="btn btn-primary" type="submit">Kaydet</button>
                      <button className="btn btn-secondary" type="button" onClick={()=> setShowContactModal(false)}>İptal</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Logo yükleme alanını da Ana Sayfa modalına ekleyelim */}

          {showSeedConfirm && (
            <div className="modal-overlay" onClick={()=>setShowSeedConfirm(false)}>
              <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">Onay</div>
                <div className="modal-body">
                  Tüm yorumlar silinecek ve yeni rastgele yorumlar oluşturulacak. Devam etmek istiyor musunuz?
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={async()=>{
                      setShowSeedConfirm(false);
                      try {
                        setReviewsLoading(true);
                        setReviewsError('');
                        
                        console.log('Yorumlar oluşturuluyor...');
                        const r = await api.post('/admin/reviews/seed', { count: 15 });
                        
                        console.log('Seed response:', r.data);
                        setSeedResult({
                          message: r.data.message,
                          deleted: r.data.deleted,
                          created: r.data.created,
                          total: r.data.total
                        });
                        
                        // Kısa bir bekleme sonrası yorumları yeniden yükle
                        setTimeout(async () => {
                          try {
                            console.log('Yorumlar yeniden yükleniyor...');
                            const refresh = await api.get('/admin/reviews?debug=true');
                            console.log('Refresh response:', refresh.data);
                            
                            const reviewsData = refresh.data?.reviews || refresh.data || [];
                            console.log('Yüklenen yorumlar:', reviewsData);
                            console.log('Yorum sayısı:', reviewsData.length);
                            
                            setReviews(reviewsData);
                            
                            if (reviewsData.length === 0 && r.data.total > 0) {
                              console.warn('⚠️ Yorumlar oluşturuldu ama görüntülenemedi!');
                              setReviewsError('Yorumlar oluşturuldu ama görüntülenemedi. Sayfayı yenileyin.');
                            }
                          } catch(refreshError) {
                            console.error('Yenileme hatası:', refreshError);
                          }
                        }, 500);
                      } catch(e) {
                        console.error('Seed hatası:', e);
                        console.error('Hata response:', e.response);
                        console.error('Hata detayı:', e.response?.data);
                        const errorMsg = e.response?.data?.message || e.message || 'Bilinmeyen hata';
                        setSeedResult({
                          error: true,
                          message: errorMsg
                        });
                        setReviewsError(errorMsg);
                      } finally {
                        setReviewsLoading(false);
                      }
                    }}
                  >
                    Evet
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={()=>setShowSeedConfirm(false)}
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmDelete && confirmDelete.type === 'review' && (
            <div className="modal-overlay" onClick={()=>setConfirmDelete(null)}>
              <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">Onay</div>
                <div className="modal-body">Bu yorum silinsin mi?</div>
                <div className="modal-actions">
                  <button className="btn btn-danger" onClick={async()=>{
                    try {
                      await api.delete(`/admin/reviews/${confirmDelete.id}`);
                      const r = await api.get('/admin/reviews?debug=true');
                      const reviewsData = r.data?.reviews || r.data || [];
                      setReviews(reviewsData);
                    } catch(e) {
                      alert('Yorum silinirken bir hata oluştu: ' + (e.response?.data?.message || e.message));
                    } finally {
                      setConfirmDelete(null);
                    }
                  }}>Evet, Sil</button>
                  <button className="btn btn-secondary" onClick={()=>setConfirmDelete(null)}>Vazgeç</button>
                </div>
              </div>
            </div>
          )}

          {seedResult && (
            <div className="modal-overlay" onClick={()=>setSeedResult(null)}>
              <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">{seedResult.error ? 'Hata' : 'Başarılı'}</div>
                <div className="modal-body">
                  {seedResult.error ? (
                    <p style={{color: '#dc3545'}}>❌ {seedResult.message}</p>
                  ) : (
                    <div>
                      <p style={{color: '#28a745', marginBottom: '15px'}}>✅ {seedResult.message}</p>
                      <div style={{fontSize: '14px', color: '#666'}}>
                        <p><strong>Silinen:</strong> {seedResult.deleted}</p>
                        <p><strong>Oluşturulan:</strong> {seedResult.created}</p>
                        <p><strong>Toplam:</strong> {seedResult.total}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={()=>setSeedResult(null)}
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          )}

          
          </div>
        </div>
      </div>
      {isMobile && isSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

const AllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, booking: null });

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      const url = statusFilter ? `/admin/bookings?status=${statusFilter}` : '/admin/bookings';
      const res = await api.get(url);
      setBookings(res.data);
    } catch (error) {
      console.error('Rezervasyonlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeConfirmModal = () => setConfirmModal({ open: false, type: null, booking: null });

  const performAction = async () => {
    if (!confirmModal.open || !confirmModal.booking) return;
    const booking = confirmModal.booking;
    const type = confirmModal.type;
    try {
      if (type === 'paid') {
        await api.patch(`/bookings/${booking._id}/status`, { paymentStatus: 'completed' });
      } else if (type === 'completed') {
        await api.patch(`/bookings/${booking._id}/status`, { status: 'completed' });
      } else if (type === 'cancelled') {
        await api.patch(`/bookings/${booking._id}/status`, { status: 'cancelled' });
      } else if (type === 'delete') {
        await api.delete(`/admin/bookings/${booking._id}`);
      }
      await fetchBookings();
      closeConfirmModal();
    } catch (error) {
      alert('Güncelleme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const confirmTitles = {
    paid: 'Ödeme alındı olarak işaretlensin mi?',
    completed: 'Rezervasyon tamamlandı olarak işaretlensin mi?',
    cancelled: 'Rezervasyon iptal edilsin mi? (Tarihler yeniden müsait yapılır)',
    delete: 'Bu rezervasyon kalıcı olarak silinsin mi?'
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="all-bookings">
      <div className="all-bookings-header">
        <h2>Tüm Rezervasyonlar</h2>
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="pending_request">Bekleyen Talep</option>
            <option value="confirmed">Onaylanmış</option>
            <option value="cancelled">İptal Edilmiş</option>
            <option value="completed">Tamamlanmış</option>
          </select>
        </div>
      </div>

      <div className="all-bookings-grid">
        {bookings.map((booking, index) => (
          <BookingCard
            key={booking._id}
            booking={booking}
            index={index + 1}
            onAction={(type) => setConfirmModal({ open: true, type, booking })}
          />
        ))}
      </div>

      {confirmModal.open && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">Onay</div>
            <div className="modal-body">
              <p>{confirmTitles[confirmModal.type] || 'Bu işlem gerçekleştirilsin mi?'}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-success" onClick={performAction}>Evet</button>
              <button className="btn btn-secondary" onClick={closeConfirmModal}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BookingCard = ({ booking, index, onAction }) => {
  const statusLabels = {
    pending_request: 'Bekleyen Talep',
    confirmed: 'Onaylanmış',
    cancelled: 'İptal Edildi',
    completed: 'Tamamlandı'
  };

  const statusClassMap = {
    pending_request: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    completed: 'completed'
  };

  const entryDate = new Date(booking.checkIn).toLocaleDateString('tr-TR');
  const exitDate = booking.property?.listingType === 'rent_daily'
    ? new Date(booking.checkOut).toLocaleDateString('tr-TR')
    : null;
  const totalAmount = booking.pricing?.total || booking.pricing?.monthly || booking.pricing?.daily || 0;
  const paymentCompleted = booking.payment?.status === 'completed';

  return (
    <div className={`request-item booking-card request-item--${statusClassMap[booking.status] || 'default'}`}>
      <div className="request-header">
        <div>
          <h3>{booking.property?.title || `Rezervasyon #${index}`}</h3>
          <p className="request-date">#{String(index).padStart(2, '0')} • {booking.guestInfo.name}</p>
          <p className="request-subtext">{booking.guestInfo.email} • {booking.guestInfo.phone}</p>
        </div>
        <span className={`booking-status booking-status--${statusClassMap[booking.status] || 'default'}`}>
          {statusLabels[booking.status] || 'Bilinmiyor'}
        </span>
      </div>

      <div className="request-info booking-card-info">
        <p><strong>Giriş:</strong> {entryDate}</p>
        {exitDate && (
          <p><strong>Çıkış:</strong> {exitDate}</p>
        )}
        <p><strong>Toplam:</strong> ₺{totalAmount}</p>
        <p>
          <strong>Ödeme:</strong>
          <span className={`booking-pill ${paymentCompleted ? 'booking-pill--success' : 'booking-pill--warning'}`}>
            {paymentCompleted ? 'Ödeme Alındı' : 'Bekliyor'}
          </span>
        </p>
      </div>

      <div className="booking-card-actions">
        {booking.status === 'completed' || booking.status === 'cancelled' ? (
          <button className="btn btn-danger" onClick={()=>onAction('delete')}>Sil</button>
        ) : (
          <>
            {!paymentCompleted && (
              <button className="btn btn-success" onClick={()=>onAction('paid')}>Ödeme Alındı</button>
            )}
            {booking.status !== 'completed' && (
              <button className="btn btn-primary" onClick={()=>onAction('completed')}>Tamamlandı</button>
            )}
            {booking.status !== 'cancelled' && (
              <button className="btn btn-danger" onClick={()=>onAction('cancelled')}>İptal Edildi</button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

const AdminProperties = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteProperty, setConfirmDeleteProperty] = useState(null); // { id: string }
  const [form, setForm] = useState({
    title:'', description:'', propertyType:'1+1', listingType:'rent_daily', size:60, bedrooms:1, bathrooms:1,
    pricing:{ daily:1000, weekly:0, monthly:0, sale:0 }, location:{ city:'Antalya', district:'' }, amenities:[], rules:[]
  });
  const [images, setImages] = useState([]); // yeni eklenecek dosyalar
  const [existingImages, setExistingImages] = useState([]); // mevcut görseller

  useEffect(()=>{ fetchItems(); },[]);

  const formatPriceInputValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''));
    if (!Number.isFinite(numberValue)) return '';
    return numberValue.toLocaleString('tr-TR');
  };

  const handlePriceChange = (field, linkedFields = []) => (event) => {
    const rawValue = event.target.value || '';
    const digits = rawValue.replace(/\D/g, '');
    const numeric = digits ? Number(digits) : null;
    setForm(prev => {
      const pricing = { ...prev.pricing, [field]: numeric };
      linkedFields.forEach((linkedField) => {
        pricing[linkedField] = numeric;
      });
      return { ...prev, pricing };
    });
  };

  const getPropertyPriceLabel = (property) => {
    const pricing = property?.pricing || {};
    const listingType = property?.listingType;
    if (listingType === 'rent_monthly') {
      const formatted = formatPriceInputValue(pricing.monthly);
      return formatted ? `₺${formatted}/ay` : 'Fiyat Sorunuz';
    }
    if (listingType === 'rent_daily') {
      const formatted = formatPriceInputValue(pricing.daily);
      return formatted ? `₺${formatted}/gece` : 'Fiyat Sorunuz';
    }
    const saleValue = pricing.sale ?? pricing.monthly ?? pricing.daily;
    const formatted = formatPriceInputValue(saleValue);
    return formatted ? `₺${formatted}` : 'Fiyat Sorunuz';
  };

  const fetchItems = async() => {
    try { setLoading(true); const r = await api.get('/admin/properties'); setItems(r.data); } finally { setLoading(false); }
  };

  const toggleFeatured = async (property, value) => {
    try {
      await api.patch(`/properties/${property._id}/featured`, { isFeatured: value });
      await fetchItems();
    } catch (e) {
      alert('Hata: ' + (e.response?.data?.message || e.message));
    }
  };

  const resetForm = () => {
    setForm({ 
      title:'', 
      description:'', 
      propertyType:'1+1', 
      listingType:'rent_daily', 
      size:60, 
      bedrooms:1, 
      bathrooms:1, 
      pricing:{ daily:0, weekly:0, monthly:0, sale:0 }, 
      location:{ city:'Antalya', district:'' }, 
      amenities:[], 
      rules:[] 
    });
    setImages([]);
    setExistingImages([]);
    setEditing(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      description: p.description || '',
      propertyType: p.propertyType || '1+1',
      listingType: p.listingType || 'rent_daily',
      size: p.size || 60,
      bedrooms: p.bedrooms || 1,
      bathrooms: p.bathrooms || 1,
      pricing: { 
        daily: p.pricing?.daily || 0, 
        weekly: p.pricing?.weekly || 0,
        monthly: p.pricing?.monthly || 0,
        sale: p.pricing?.sale || p.pricing?.monthly || p.pricing?.daily || 0
      },
      location: { city: p.location?.city || 'Antalya', district: p.location?.district || '' },
      amenities: Array.isArray(p.amenities)? p.amenities : [],
      rules: Array.isArray(p.rules)? p.rules : []
    });
    setImages([]);
    setExistingImages(Array.isArray(p.images) ? p.images : []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const save = async (e) => {
    e.preventDefault();
    
    // Fiyat kontrolü
    if (form.listingType === 'rent_daily' && (!form.pricing.daily || !form.pricing.weekly)) {
      alert('Günlük kiralık için günlük ve haftalık fiyat zorunludur.');
      return;
    }
    if (form.listingType === 'rent_monthly' && !form.pricing.monthly) {
      alert('Aylık kiralık için aylık fiyat zorunludur.');
      return;
    }
    if (form.listingType === 'sale' && !form.pricing.sale && !form.pricing.monthly && !form.pricing.daily) {
      alert('Satılık için fiyat zorunludur.');
      return;
    }
    
    const fd = new FormData();
    // primitive fields
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('propertyType', String(form.propertyType));
    fd.append('listingType', String(form.listingType));
    fd.append('size', String(form.size));
    fd.append('bedrooms', String(form.bedrooms));
    fd.append('bathrooms', String(form.bathrooms));
    fd.append('location', JSON.stringify(form.location));
    fd.append('amenities', JSON.stringify(form.amenities || []));
    fd.append('rules', JSON.stringify(form.rules || []));
    
    // Pricing - seçilen türe göre fiyat gönder
    const pricingData = {};
    if (form.listingType === 'rent_daily') {
      pricingData.daily = form.pricing.daily;
      pricingData.weekly = form.pricing.weekly;
    } else if (form.listingType === 'rent_monthly') {
      pricingData.monthly = form.pricing.monthly;
    } else if (form.listingType === 'sale') {
      const salePrice = form.pricing.sale || form.pricing.monthly || form.pricing.daily;
      pricingData.monthly = salePrice;
    }
    fd.append('pricing', JSON.stringify(pricingData));
    
    (images || []).forEach(file => fd.append('images', file));
    // Mevcut görsellerin güncel listesini JSON olarak gönder (ayrı alan)
    fd.append('existingImages', JSON.stringify(existingImages || []));
    try {
      if (editing) {
        await api.put(`/properties/${editing._id}`, fd);
      } else {
        await api.post('/properties', fd);
      }
      await fetchItems();
      closeModal();
      // Bildirim kaldırıldı - sessizce güncelle
    } catch (e) {
      alert('Hata: ' + (e.response?.data?.message || e.message));
    }
  };

  const del = async(id) => {
    setConfirmDeleteProperty({ id });
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
        <h2 style={{margin: 0}}>Daire Yönetimi</h2>
        <button className="btn btn-primary" onClick={openNewModal}>
          <FaPlus /> Yeni Daire Ekle
        </button>
      </div>
      

      <h3 style={{marginTop:15, marginBottom: 15}}>Mevcut Daireler</h3>
      <div className="requests-grid">
        {items.map(p => (
          <div key={p._id} className="request-item">
            <div className="request-header">
              <div>
                <h3 style={{margin:0}}>{p.title}</h3>
                <p style={{margin: '5px 0', color: '#666', fontSize: '14px'}}>
                  {p.propertyType} • {p.listingType} • {p.size} m² • {p.bedrooms} oda
                </p>
              </div>
            </div>
            <div className="request-info">
              <p><strong>Fiyat:</strong> {getPropertyPriceLabel(p)}</p>
            </div>
            <div className="action-buttons" style={{display:'flex', gap:12, marginTop:12}}>
              <button
                className="btn btn-secondary"
                onClick={()=>toggleFeatured(p, !p.isFeatured)}
                style={{display:'flex', alignItems:'center', justifyContent:'center', gap:6, borderRadius:8, padding:'10px 12px'}}
              >
                {p.isFeatured ? (
                  <FaStar color="#f59e0b" size={16} />
                ) : (
                  <FaRegStar color="#d1d5db" size={16} />
                )}
                <span>Popüler</span>
              </button>
              <button className="btn btn-secondary" onClick={()=>openEditModal(p)}><FaEdit /> Düzenle</button>
              <button className="btn btn-danger" onClick={()=>del(p._id)}><FaTrash /> Sil</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal message-modal property-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Daire Düzenle' : 'Yeni Daire Ekle'}</h3>
              <button className="close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save} encType="multipart/form-data">
                <div className="property-form-section">
                  <h4>Temel Bilgiler</h4>
                  <div className="property-form-grid">
                    <div className="input-group full-width">
                      <label>Başlık</label>
                      <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>Tip</label>
                      <select value={form.propertyType} onChange={e=>setForm({...form, propertyType:e.target.value})}>
                        <option>1+0</option><option>1+1</option><option>2+1</option><option>3+1</option><option>4+1</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>İlan Türü</label>
                      <select value={form.listingType} onChange={e=>setForm({...form, listingType:e.target.value})}>
                        <option value="rent_daily">Günlük Kiralık</option>
                        <option value="rent_monthly">Aylık Kiralık</option>
                        <option value="sale">Satılık</option>
                      </select>
                    </div>
                    <div className="input-group full-width">
                      <label>Açıklama</label>
                      <textarea rows={3} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>m²</label>
                      <input type="number" value={form.size} onChange={e=>setForm({...form, size:Number(e.target.value)})} required />
                    </div>
                    <div className="input-group">
                      <label>Oda</label>
                      <input type="number" value={form.bedrooms} onChange={e=>setForm({...form, bedrooms:Number(e.target.value)})} required />
                    </div>
                    <div className="input-group">
                      <label>Banyo</label>
                      <input type="number" value={form.bathrooms} onChange={e=>setForm({...form, bathrooms:Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="property-form-section">
                  <h4>Fiyatlandırma</h4>
                  <div className="property-form-grid property-form-grid--pricing">
                    {form.listingType === 'rent_daily' && (
                      <>
                        <div className="input-group">
                          <label>Günlük Fiyat *</label>
                          <input type="text" inputMode="numeric" value={formatPriceInputValue(form.pricing.daily)} onChange={handlePriceChange('daily')} required />
                        </div>
                        <div className="input-group">
                          <label>Haftalık Fiyat *</label>
                          <input type="text" inputMode="numeric" value={formatPriceInputValue(form.pricing.weekly)} onChange={handlePriceChange('weekly')} required />
                        </div>
                      </>
                    )}
                    {form.listingType === 'rent_monthly' && (
                      <div className="input-group full-width">
                        <label>Aylık Fiyat *</label>
                        <input type="text" inputMode="numeric" value={formatPriceInputValue(form.pricing.monthly)} onChange={handlePriceChange('monthly')} required />
                      </div>
                    )}
                    {form.listingType === 'sale' && (
                      <div className="input-group full-width">
                        <label>Fiyat *</label>
                        <input type="text" inputMode="numeric" value={formatPriceInputValue(form.pricing.sale ?? form.pricing.monthly ?? form.pricing.daily)} onChange={handlePriceChange('sale', ['monthly', 'daily'])} required />
                      </div>
                    )}
                  </div>
                </div>

                <div className="property-form-section">
                  <h4>Konum &amp; Görseller</h4>
                  <div className="property-form-grid">
                    <div className="input-group">
                      <label>İl</label>
                      <input value={form.location.city} onChange={e=>setForm({...form, location:{...form.location, city:e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label>İlçe</label>
                      <input value={form.location.district} onChange={e=>setForm({...form, location:{...form.location, district:e.target.value}})} />
                    </div>
                    <div className="input-group full-width property-form-file">
                      <label>Görseller (birden fazla seçebilirsiniz)</label>
                      <input type="file" multiple accept="image/*" onChange={e=>setImages(Array.from(e.target.files||[]))} />
                    </div>
                  </div>

                  {existingImages && existingImages.length > 0 && (
                    <div className="property-existing-images">
                      <p className="property-existing-images__title">Mevcut Görseller</p>
                      <div className="property-existing-images__grid">
                        {existingImages.map((img, idx) => {
                          let src = '';
                          if (img && img.url) {
                            if (img.url.startsWith('http')) {
                              src = img.url;
                            } else if (img.url.startsWith('/uploads')) {
                              src = `${API_URL}${img.url}`;
                            } else if (img.url.startsWith('uploads')) {
                              src = `${API_URL}/${img.url}`;
                            } else {
                              src = `${API_URL}/uploads/${img.url}`;
                            }
                          }
                          const name = img?.caption || (img?.url ? img.url.split('/').pop() : `resim-${idx + 1}`);
                          const hasSrc = Boolean(src);
                          return (
                            <div key={idx} className="property-existing-images__item">
                              {hasSrc ? (
                                <img
                                  src={src}
                                  alt={name}
                                  title={name}
                                  onError={(e)=>{e.currentTarget.style.display='none'; const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.add('is-visible');}}
                                />
                              ) : null}
                              <span className={`property-existing-images__fallback${hasSrc ? '' : ' is-visible'}`}>
                                <span>Görsel</span>
                                <span>{name}</span>
                              </span>
                              <span className="property-existing-images__caption" title={name}>{name}</span>
                              <button
                                type="button"
                                className="property-existing-images__remove"
                                onClick={()=> setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="property-form-actions">
                  <button className="btn btn-primary" type="submit">{editing ? 'Güncelle' : 'Ekle'}</button>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>İptal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteProperty && (
        <div className="modal-overlay" onClick={()=>setConfirmDeleteProperty(null)}>
          <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">Onay</div>
            <div className="modal-body">Bu daire silinsin mi?</div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={async()=>{
                try {
                  await api.delete(`/properties/${confirmDeleteProperty.id}`);
                  await fetchItems();
                } finally {
                  setConfirmDeleteProperty(null);
                }
              }}>Evet, Sil</button>
              <button className="btn btn-secondary" onClick={()=>setConfirmDeleteProperty(null)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


