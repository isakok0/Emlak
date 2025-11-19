import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaMapMarkerAlt, FaUsers, FaWifi, FaCar, FaSnowflake, FaUtensils, FaInfoCircle, FaShareAlt } from 'react-icons/fa';
import { haversineDistanceKm, LANDMARKS_ANTALYA } from '../utils/geo';
import { fetchCurrentWeather } from '../utils/weather';
import './PropertyDetail.css';
import { setSEO, addJSONLD } from '../utils/seo';

const CALENDAR_RANGE = 10;
const CALENDAR_COLUMNS_DESKTOP = 5;
const CALENDAR_COLUMNS_MOBILE = 2;

const mapPropertiesResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getSimilarPerView = (width) => {
  if (width <= 640) return 1;
  if (width <= 1024) return 2;
  return 3;
};

const formatCurrency = (value, options = {}) => {
  if (value === null || value === undefined || value === '') return '';
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return '';
  return numberValue.toLocaleString('tr-TR', options);
};

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState({ adults: 1, children: 0 });
  const [calculating, setCalculating] = useState(false);
  const [priceSummary, setPriceSummary] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  // İletişim bilgileri Checkout sayfasında alınacak
  const [similar, setSimilar] = useState([]);
  const [similarPerView, setSimilarPerView] = useState(() => (
    typeof window !== 'undefined' ? getSimilarPerView(window.innerWidth) : 3
  ));
  const [similarPage, setSimilarPage] = useState(0);
  const [weather, setWeather] = useState(null);
  const [excludedDates, setExcludedDates] = useState([]);
  const [extraPricing, setExtraPricing] = useState({
    includedAdultsCount: 2,
    includedChildrenCount: 1,
    extraAdultPrice: 150,
    extraChildPrice: 75
  });
  const [shareStatus, setShareStatus] = useState(null);
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [calendarColumns, setCalendarColumns] = useState(CALENDAR_COLUMNS_DESKTOP);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

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
    for (let i = 0; i < CALENDAR_RANGE; i += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      days.push(next);
    }
    return days;
  }, [calendarStartDate]);

  const calendarDayChunks = useMemo(() => {
    if (!calendarDays.length) return [];
    const chunks = [];
    const chunkSize = Math.max(calendarColumns, 1);
    for (let i = 0; i < calendarDays.length; i += chunkSize) {
      chunks.push(calendarDays.slice(i, i + chunkSize));
    }
    return chunks;
  }, [calendarDays, calendarColumns]);

  const calendarCellMinWidth = useMemo(() => (
    calendarColumns === CALENDAR_COLUMNS_MOBILE ? 120 : 100
  ), [calendarColumns]);

  const isPrevDisabled = useMemo(() => (
    calendarStartDate.getTime() <= today.getTime()
  ), [calendarStartDate, today]);

  const normalizedBookings = useMemo(() => {
    if (!Array.isArray(calendarBookings)) return [];
    return calendarBookings.map((booking) => ({
      ...booking,
      checkInDate: stripTime(booking.checkIn),
      checkOutDate: stripTime(booking.checkOut)
    }));
  }, [calendarBookings]);

  const formatDayLabel = (date) => date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  const formatWeekdayLabel = (date) => date.toLocaleDateString('tr-TR', { weekday: 'short' });

  const calendarRangeLabel = useMemo(() => {
    if (!calendarDays.length) return '';
    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];
    const firstLabel = first.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    const lastLabel = last.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    return `${firstLabel} - ${lastLabel}`;
  }, [calendarDays]);

  const getBookingForDate = (day) => {
    const dayStart = stripTime(day);
    if (!dayStart) return null;
    const dayTime = dayStart.getTime();
    return normalizedBookings.find((booking) => {
      if (!booking.checkInDate || !booking.checkOutDate) return false;
      const checkInTime = booking.checkInDate.getTime();
      const checkOutTime = booking.checkOutDate.getTime();
      // Giriş tarihi <= gün <= çıkış tarihi (çıkış dahil)
      return checkInTime <= dayTime && checkOutTime >= dayTime;
    }) || null;
  };

  const getDayStatus = (day) => {
    const dayKey = toDateKey(day);
    const dayStart = stripTime(day);
    let status = 'available';
    let label = 'Müsait';
    let tooltip = `${dayKey} • Müsait`;

    // Önce booking kontrolü yap (booking durumu öncelikli)
    const booking = getBookingForDate(day);
    if (booking) {
      const paymentStatus = booking?.payment?.status || 'pending';
      const rangeLabel = (() => {
        const checkInLabel = booking.checkInDate?.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        const checkOutLabel = booking.checkOutDate?.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        if (!checkInLabel || !checkOutLabel) return '';
        return `${checkInLabel} - ${checkOutLabel}`;
      })();

      // Çıkış tarihi kontrolü: çıkış tarihi de rezervasyonun bir parçası
      const isCheckOutDate = dayStart && booking.checkOutDate && 
        dayStart.getTime() === booking.checkOutDate.getTime();

      if (booking.status === 'pending_request') {
        status = 'pending';
        label = 'Talep';
        tooltip = `${rangeLabel} • Bekleyen talep`;
      } else if (booking.status === 'confirmed' && paymentStatus !== 'completed') {
        status = 'pending';
        label = 'Bekleniyor';
        tooltip = `${rangeLabel} • Bekleniyor`;
      } else if (booking.status === 'cancelled') {
        status = 'available';
        label = 'Müsait';
        tooltip = `${rangeLabel} • İptal edildi (boş)`;
      } else if (booking.status === 'completed') {
        status = 'available';
        label = 'Müsait';
        tooltip = `${rangeLabel} • Tamamlandı (boş)`;
      } else {
        // confirmed ve payment completed - çıkış tarihi de dahil
        status = 'confirmed';
        label = 'Dolu';
        tooltip = isCheckOutDate 
          ? `${rangeLabel} • Çıkış günü (Ödeme alındı)`
          : `${rangeLabel} • Ödeme alındı`;
      }
      return { status, label, tooltip };
    }

    // Booking yoksa slot durumuna bak
    const slot = Array.isArray(property?.availability)
      ? property.availability.find((item) => toDateKey(item?.date) === dayKey)
      : null;

    if (slot) {
      if (slot.status === 'pending_request') {
        status = 'pending';
        label = 'Talep';
        tooltip = `${dayKey} • Bekleyen talep`;
      } else if (slot.status === 'confirmed') {
        status = 'confirmed';
        label = 'Dolu';
        tooltip = `${dayKey} • Onaylı rezervasyon`;
      } else if (slot.status === 'available') {
        status = 'available';
        label = 'Müsait';
      }
    }

    return { status, label, tooltip };
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  useEffect(() => {
    if (property && checkIn && checkOut) {
      calculatePrice();
    }
  }, [property, checkIn, checkOut, guests, extraPricing]);

  const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="32" font-family="Arial, Helvetica, sans-serif">Görsel Yok</text></svg>';

  // Helper: görüntü URL'leri
  function getImageUrls(p) {
    const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000');
    const toFull = (u) => {
      if (!u) return u;
      if (u.startsWith('http')) return u;
      if (u.startsWith('/uploads')) return `${apiBase}${u}`;
      if (u.startsWith('uploads')) return `${apiBase}/${u}`;
      return u;
    };
    // images'ın array olduğundan emin ol (JSON string olarak gelebilir veya null olabilir)
    const imagesArray = (() => {
      if (!p?.images) return [];
      if (Array.isArray(p.images)) return p.images;
      if (typeof p.images === 'string') {
        try {
          const parsed = JSON.parse(p.images);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    })();
    const urls = imagesArray.map(img => {
      const url = typeof img === 'string' ? img : (img?.url || '');
      return encodeURI(toFull(url.replace(/\\/g,'/')));
    }).filter(Boolean);
    if (urls.length === 0) urls.push(placeholderImage);
    return urls;
  }

  // Türkçe karakter mojibake düzeltme
  const fixTitle = (s) => {
    if (!s) return '';
    return s
      .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
      .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
      .replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
      .replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ')
      .replace(/ÅŸ/g, 'ş').replace(/Åž/g, 'Ş')
      .replace(/ÄŸ/g, 'ğ').replace(/Äž/g, 'Ğ');
  };

  // Görselleri 5 sn'de bir otomatik değiştir
  useEffect(() => {
    const total = getImageUrls(property).length;
    if (total <= 1) return;
    const id = setInterval(() => {
      setCurrentImage((i) => (i + 1) % total);
    }, 5000);
    return () => clearInterval(id);
  }, [property]);

  useEffect(() => {
    document.body.classList.add('property-detail-page');
    return () => {
      document.body.classList.remove('property-detail-page');
      document.body.classList.remove('property-detail-sale');
      document.body.classList.remove('property-detail-rent_daily');
      document.body.classList.remove('property-detail-rent_monthly');
    };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/settings`);
        const data = await res.json();
        setExtraPricing({
          includedAdultsCount: typeof data.includedAdultsCount === 'number' ? data.includedAdultsCount : 2,
          includedChildrenCount: typeof data.includedChildrenCount === 'number' ? data.includedChildrenCount : 1,
          extraAdultPrice: typeof data.extraAdultPrice === 'number' ? data.extraAdultPrice : 150,
          extraChildPrice: typeof data.extraChildPrice === 'number' ? data.extraChildPrice : 75
        });
      } catch (_) {
        // Varsayılan değerler kullanılacak
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!property?.listingType) return;
    const typeClass = `property-detail-${property.listingType}`;
    document.body.classList.add(typeClass);
    return () => {
      document.body.classList.remove(typeClass);
    };
  }, [property?.listingType]);

  useEffect(() => {
    if (!shareStatus) return;
    const timeout = setTimeout(() => setShareStatus(null), 3500);
    return () => clearTimeout(timeout);
  }, [shareStatus]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 480px)');
    const updateColumns = () => {
      setCalendarColumns(mediaQuery.matches ? CALENDAR_COLUMNS_MOBILE : CALENDAR_COLUMNS_DESKTOP);
    };
    updateColumns();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateColumns);
      return () => mediaQuery.removeEventListener('change', updateColumns);
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updateColumns);
      return () => mediaQuery.removeListener(updateColumns);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setSimilarPerView(getSimilarPerView(window.innerWidth));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetCalendarToToday = () => {
    setCalendarStartDate(new Date(today));
  };

  const handlePrevRange = () => {
    setCalendarStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - CALENDAR_RANGE);
      return next.getTime() < today.getTime() ? new Date(today) : next;
    });
  };

  const handleNextRange = () => {
    setCalendarStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + CALENDAR_RANGE);
      return next;
    });
  };

  const loadCalendarBookings = async (propertyId) => {
    if (!propertyId) {
      setCalendarBookings([]);
      return;
    }
    setCalendarLoading(true);
    try {
      const statuses = ['confirmed', 'pending_request', 'cancelled', 'completed'];
      const responses = await Promise.all(
        statuses.map((status) =>
          api
            .get(`/bookings?property=${propertyId}&status=${status}`)
            .catch(() => ({ data: [] }))
        )
      );
      const merged = responses.flatMap((response) =>
        Array.isArray(response?.data) ? response.data : []
      );
      const seen = new Set();
      const unique = [];
      merged.forEach((booking) => {
        const bookingId = booking?._id || `${booking?.checkIn}-${booking?.checkOut}-${booking?.status}`;
        if (!bookingId || seen.has(bookingId)) return;
        seen.add(bookingId);
        unique.push(booking);
      });
      setCalendarBookings(unique);
    } catch (calendarError) {
      console.error('Takvim verisi yüklenemedi:', calendarError);
      setCalendarBookings([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchProperty = async () => {
    try {
      const res = await api.get(`/properties/${id}`);
      setProperty(res.data);
      resetCalendarToToday();

      if (res.data.listingType === 'rent_daily') {
        loadCalendarBookings(res.data?._id);
        
        // Dolu tarihleri çıkar (confirmed booking'ler)
        const excluded = [];
        if (res.data.availability) {
          res.data.availability.forEach((slot) => {
            if (['confirmed', 'pending_request'].includes(slot.status) && slot.date) {
              const date = new Date(slot.date);
              date.setHours(0, 0, 0, 0);
              excluded.push(date);
            }
          });
        }
        
        // Ayrıca confirmed booking'leri de çek (availability array'inde olmayanlar için)
        try {
          const bookingsRes = await api.get(`/bookings?property=${id}&status=confirmed`);
          if (bookingsRes.data && Array.isArray(bookingsRes.data)) {
            bookingsRes.data.forEach(booking => {
              const checkIn = new Date(booking.checkIn);
              const checkOut = new Date(booking.checkOut);
              // checkIn'den checkOut'a kadar (checkOut dahil) tüm günleri exclude et
              for (let d = new Date(checkIn); d <= checkOut; d.setDate(d.getDate() + 1)) {
                const date = new Date(d);
                date.setHours(0, 0, 0, 0);
                if (!excluded.some(ex => ex.getTime() === date.getTime())) {
                  excluded.push(date);
                }
              }
            });
          }
        } catch (err) {
          // Endpoint yoksa sadece availability array'ini kullan
          console.log('Booking tarihleri çekilemedi, sadece availability kullanılıyor');
        }
        
        setExcludedDates(excluded);
      } else {
        setCalendarBookings([]);
        setExcludedDates([]);
      }
      
      // Similar recommendations (en az 2 öğe olacak şekilde doldur)
      try {
        let rec = [];
        try {
          const sRes = await api.get(`/properties?propertyType=${encodeURIComponent(res.data.propertyType)}&listingType=${res.data.listingType||''}`);
          rec = mapPropertiesResponse(sRes.data).filter(p=>p._id !== res.data._id);
        } catch(_){ rec = []; }
        if (rec.length < 2) {
          try {
            const allRes = await api.get('/properties');
            const all = mapPropertiesResponse(allRes.data);
            for (const p of all) {
              if (p._id !== res.data._id && !rec.find(r=>r._id===p._id)) {
                rec.push(p);
                if (rec.length >= 6) break;
              }
            }
          } catch(_){ /* ignore */ }
        }
        const recommendations = rec.slice(0,6);
        setSimilar(recommendations);
        setSimilarPage(0);
      } catch(_){}
      // Weather fetch
      if (res.data.location?.coordinates?.lat && res.data.location?.coordinates?.lng) {
        try {
          const w = await fetchCurrentWeather(res.data.location.coordinates.lat, res.data.location.coordinates.lng);
          setWeather(w);
        } catch(_){}
      }
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Apartment',
        name: res.data.title,
        address: {
          '@type': 'PostalAddress',
          addressLocality: res.data.location?.district || 'Antalya',
          addressRegion: 'Antalya',
          addressCountry: 'TR'
        },
        numberOfRooms: res.data.bedrooms,
        floorSize: { '@type':'QuantitativeValue', value: res.data.size, unitCode: 'MTK' },
        aggregateRating: res.data.rating?.count ? {
          '@type':'AggregateRating', ratingValue: res.data.rating.average, reviewCount: res.data.rating.count
        } : undefined,
        offers: { '@type':'Offer', priceCurrency:'TRY', price: res.data.pricing?.daily }
      };
      addJSONLD('property', ld);

      // SEO: title/description/canonical
      const desc = res.data.description ? String(res.data.description).slice(0, 160) : `${res.data.bedrooms} oda, ${res.data.size} m², ${res.data.location?.district||'Antalya'}.`;
      setSEO({
        title: `${fixTitle(res.data.title)} | Günlük Kiralık Evim`,
        description: desc,
        canonical: `/properties/${res.data._id}`
      });

      // Breadcrumb
      addJSONLD('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type':'ListItem', position:1, name:'Ana Sayfa', item: window.location.origin + '/' },
          { '@type':'ListItem', position:2, name:'Daireler', item: window.location.origin + '/properties' },
          { '@type':'ListItem', position:3, name: fixTitle(res.data.title), item: window.location.href }
        ]
      });
    } catch (error) {
      if (error.response?.status === 404) {
        navigate('/properties');
        return;
      }
      console.error('Daire yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!property || !checkIn || !checkOut) return;

    setCalculating(true);
    try {
      const totalDays = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
      let dailyRate = property.pricing.daily;

      // Sezonsal fiyat kontrolü
      if (property.pricing.seasonalRates && property.pricing.seasonalRates.length > 0) {
        for (const rate of property.pricing.seasonalRates) {
          if (checkIn >= new Date(rate.startDate) && checkOut <= new Date(rate.endDate)) {
            dailyRate = dailyRate * rate.multiplier;
            break;
          }
        }
      }

      const adultCountRaw = Number(guests?.adults);
      const adultCount = Number.isFinite(adultCountRaw) && adultCountRaw >= 1 ? adultCountRaw : 1;
      const childCountRaw = Number(guests?.children);
      const childCount = Number.isFinite(childCountRaw) && childCountRaw >= 0 ? childCountRaw : 0;

      // Ekstra kişi ücreti - yönetici panelinden gelen değerleri kullan
      const includedAdults = extraPricing.includedAdultsCount ?? 2;
      const includedChildren = extraPricing.includedChildrenCount ?? 1;
      const extraPerAdult = extraPricing.extraAdultPrice ?? 150;
      const extraPerChild = extraPricing.extraChildPrice ?? 75;
      const extraAdults = Math.max(0, adultCount - includedAdults);
      const extraChildren = Math.max(0, childCount - includedChildren);
      const extraPerDay = (extraAdults * extraPerAdult) + (extraChildren * extraPerChild);
      const subtotal = (dailyRate + extraPerDay) * totalDays;
      const serviceFee = 0;
      const tax = 0;
      const total = subtotal;

      setPriceSummary({
        dailyRate,
        totalDays,
        subtotal,
        extraPerDay,
        extraAdults,
        extraChildren,
        extraPerAdult,
        extraPerChild,
        children: childCount,
        total
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleRequestBooking = async () => {
    if (!checkIn) {
      setErrorMsg('Lütfen giriş tarihini seçiniz');
      return;
    }

    // Aylık kiralık veya satılıkta çıkış ve misafir sayısı gerekmez
    const requireCheckout = property.listingType === 'rent_daily';
    const requireGuests = property.listingType === 'rent_daily';

    if (requireCheckout && !checkOut) {
      setErrorMsg('Lütfen giriş ve çıkış tarihlerini seçiniz');
      return;
    }

    // Tarihleri normalize et (sadece tarih kısmı, saat kısmı UTC midnight)
    const normalizeDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Eğer çıkış tarihi gerekmiyorsa, tipine göre örnek aralık ata (sistemsel zorunluluk için)
    let effectiveCheckOut;
    if (requireCheckout) {
      effectiveCheckOut = checkOut || new Date((checkIn || new Date()).getTime() + 24 * 60 * 60 * 1000);
    } else if (property.listingType === 'rent_monthly') {
      // Aylık kiralıkta geçici olarak 30 gün sonrası
      effectiveCheckOut = new Date((checkIn || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      // Satılık için sistem zorunluluğu nedeniyle sembolik 7 gün sonrası
      effectiveCheckOut = new Date((checkIn || new Date()).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const adultCountRaw = Number(guests?.adults);
    const adultCount = Number.isFinite(adultCountRaw) && adultCountRaw >= 1 ? adultCountRaw : 1;
    const childCountRaw = Number(guests?.children);
    const childCount = Number.isFinite(childCountRaw) && childCountRaw >= 0 ? childCountRaw : 0;

    const params = new URLSearchParams({
      checkIn: normalizeDate(checkIn),
      checkOut: normalizeDate(effectiveCheckOut),
      adults: String(requireGuests ? adultCount : 1),
      children: String(requireGuests ? childCount : 0)
    });
    window.location.href = `/checkout/${property._id}?${params.toString()}`;
  };

  const handleShare = async () => {
    if (!property) return;
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const title = fixTitle(property.title);
    const textParts = [title];
    if (property.location?.district) {
      textParts.push(property.location.district);
    }
    textParts.push('Antalya');
    const shareData = {
      title,
      text: textParts.filter(Boolean).join(' - '),
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus('Bağlantı kopyalandı');
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShareStatus('Bağlantı kopyalandı');
    } catch (err) {
      console.error('Paylaşım başarısız:', err);
      setShareStatus('Paylaşım tamamlanamadı');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!property) {
    return <div className="container"><p>Daire bulunamadı</p></div>;
  }

  const imageUrls = getImageUrls(property);
  const isSale = property.listingType === 'sale';

  return (
    <div className="property-detail">
      <div className="container">
        <div className="page-head">
          <div className="page-head-top">
            <button className="btn btn-secondary" onClick={() => window.history.back()}>&larr; Geri</button>
            <button className="btn btn-share" onClick={handleShare}>
              <FaShareAlt />
              Paylaş
            </button>
          </div>
          {shareStatus && (
            <div className={`share-status${shareStatus.includes('tamamlanamadı') ? ' error' : ''}`}>
              {shareStatus}
            </div>
          )}
          <h1 style={{margin:'0 0 6px 0'}}>{fixTitle(property.title)}</h1>
          <div className="property-location">
            <FaMapMarkerAlt /> {property.location.district ? property.location.district + ', ' : ''}Antalya
          </div>
        </div>

        <div className="property-content">
          <div className="property-main">
            <div className="property-images slider">
              <div className="slides" style={{transform:`translateX(-${currentImage * 100}%)`}}>
                {imageUrls.map((u, idx) => (
                  <div className="slide" key={idx}>
                    <img src={u} alt={`${property.title} ${idx+1}`} />
                  </div>
                ))}
              </div>
              {imageUrls.length > 1 && (
                <>
                  <button className="nav prev" onClick={()=>setCurrentImage((i)=> i>0 ? i-1 : imageUrls.length-1)}>&lsaquo;</button>
                  <button className="nav next" onClick={()=>setCurrentImage((i)=> (i+1)%imageUrls.length)}>&rsaquo;</button>
                  <div className="dots">
                    {imageUrls.map((_,i)=>(
                      <span key={i} className={i===currentImage?'dot active':'dot'} onClick={()=>setCurrentImage(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="property-info-section">
              <h2>Açıklama</h2>
              <p>{property.description}</p>
            </div>

            <div className="property-info-section">
              <h2>Özellikler</h2>
              <div className="features-grid">
                <div className="feature-item">
                  <FaInfoCircle /> Tip: {property.propertyType}
                </div>
                <div className="feature-item">
                  <FaInfoCircle /> {property.size} m²
                </div>
                <div className="feature-item">
                  <FaInfoCircle /> {property.bedrooms} Oda
                </div>
                <div className="feature-item">
                  <FaInfoCircle /> {property.bathrooms} Banyo
                </div>
              </div>
            </div>

            {property.listingType === 'rent_daily' && (
              <div className="property-info-section property-calendar">
                <div className="property-calendar__header">
                  <h2>Müsaitlik Takvimi</h2>
                  <div className="property-calendar__controls">
                    <button
                      type="button"
                      onClick={handlePrevRange}
                      className="property-calendar__control-btn"
                      disabled={isPrevDisabled}
                    >
                      Önceki 10 Gün
                    </button>
                    <span className="property-calendar__range">{calendarRangeLabel}</span>
                    <button type="button" onClick={handleNextRange} className="property-calendar__control-btn">Sonraki 10 Gün</button>
                    <button type="button" onClick={resetCalendarToToday} className="property-calendar__control-btn property-calendar__control-btn--ghost">Bugün</button>
                  </div>
                </div>

                <div className="property-calendar__legend">
                  <span><span className="property-calendar__dot status-confirmed"></span> Dolu</span>
                  <span><span className="property-calendar__dot status-pending"></span> Bekleyen</span>
                <span><span className="property-calendar__dot status-available"></span> Müsait</span>
                </div>

                {calendarLoading ? (
                  <div className="property-calendar__loading">
                    <div className="spinner"></div>
                    <span>Takvim yükleniyor...</span>
                  </div>
                ) : (
                  <div className="property-calendar__grid">
                    {calendarDayChunks.map((chunk, chunkIndex) => (
                      <React.Fragment key={`chunk-${chunkIndex}`}>
                        <div
                          className="property-calendar__row"
                          style={{ gridTemplateColumns: `repeat(${chunk.length || 1}, minmax(${calendarCellMinWidth}px, 1fr))` }}
                        >
                          {chunk.map((day) => {
                            const cell = getDayStatus(day);
                            return (
                              <div
                                key={`cell-${chunkIndex}-${toDateKey(day)}`}
                                className={`property-calendar__cell status-${cell.status}`}
                                title={cell.tooltip}
                              >
                                <span className="property-calendar__cell-date">{formatDayLabel(day)}</span>
                                <span className="property-calendar__cell-weekday">{formatWeekdayLabel(day)}</span>
                                {cell.label ? (
                                  <span className="property-calendar__cell-status">{cell.label}</span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {similar.length > 0 && (
            <div className="property-info-section">
              <h2>Sizin İçin Önerilenler</h2>
              <div className="recs">
                {(() => {
                  const total = similar.length;
                  const perView = Math.min(similarPerView, total);
                  const start = ((similarPage % total) + total) % total;
                  const visible = Array.from({ length: perView }, (_, idx) => similar[(start + idx) % total]);
                  return (
                    <>
                      <div
                        className="recs-grid"
                        style={{ gridTemplateColumns: `repeat(${Math.max(1, perView)}, minmax(0, 1fr))` }}
                      >
                        {visible.map((sp) => {
                          const similarImageUrls = getImageUrls(sp);
                          const similarImageUrl = similarImageUrls[0];
                          const listingBadge = sp.listingType === 'rent_monthly'
                            ? 'Aylık Kiralık'
                            : sp.listingType === 'sale'
                              ? 'Satılık'
                              : 'Günlük Kiralık';
                          return (
                            <div key={sp._id} className="recs-card" style={{ position: 'relative' }}>
                              <a href={`/properties/${sp._id}`}>
                                {(sp.listingType && sp.listingType !== 'rent') && (
                                  <div className="badge">{listingBadge}</div>
                                )}
                                <img src={similarImageUrl} alt={sp.title} />
                                <div className="meta">
                                  <strong>{sp.title}</strong>
                                  {(() => {
                                    if (sp.listingType === 'rent_monthly') {
                                      const monthlyValue = sp.pricing?.monthly ?? sp.pricing?.daily ?? '';
                                      const monthlyFormatted = formatCurrency(monthlyValue);
                                      return (
                                        <div className="property-price">
                                          {monthlyFormatted ? (
                                            <>
                                              <span className="price">₺{monthlyFormatted}</span>
                                              <span className="period">/ ay</span>
                                            </>
                                          ) : (
                                            <span className="period">Fiyat Sorunuz</span>
                                          )}
                                        </div>
                                      );
                                    }
                                    if (sp.listingType === 'sale') {
                                      const saleValue = sp.pricing?.sale ?? sp.pricing?.monthly ?? sp.pricing?.daily ?? '';
                                      const saleFormatted = formatCurrency(saleValue);
                                      return (
                                        <div className="property-price">
                                          {saleFormatted ? (
                                            <span className="price">₺{saleFormatted}</span>
                                          ) : (
                                            <span className="period">Fiyat Sorunuz</span>
                                          )}
                                        </div>
                                      );
                                    }
                                    const dailyValueRaw = sp.pricing?.daily ?? '';
                                    const numericDaily = Number(dailyValueRaw);
                                    const dailyValue = Number.isFinite(numericDaily) ? numericDaily : '';
                                    const weeklyValue = numericDaily > 0 ? numericDaily * 7 : '';
                                    const dailyFormatted = formatCurrency(dailyValue);
                                    const weeklyFormatted = numericDaily > 0 ? formatCurrency(weeklyValue) : '';
                                    return (
                                      <div className="property-price">
                                        {dailyFormatted ? (
                                          <>
                                            <span className="price">₺{dailyFormatted}</span>
                                            <span className="period">/ gece</span>
                                          </>
                                        ) : (
                                          <span className="period">Fiyat Sorunuz</span>
                                        )}
                                        {weeklyFormatted && numericDaily > 0 ? (
                                          <span className="weekly-price">Haftalık: ₺{weeklyFormatted}</span>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                      {total > perView && (
                        <>
                          <button
                            className="nav prev"
                            onClick={() => setSimilarPage((p) => p - 1)}
                            aria-label="Önceki öneriler"
                          >
                            ‹
                          </button>
                          <button
                            className="nav next"
                            onClick={() => setSimilarPage((p) => p + 1)}
                            aria-label="Sonraki öneriler"
                          >
                            ›
                          </button>
                          <div className="recs-indicator">
                            {((start + 1 - 1 + total) % total) + 1} / {total}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {property.location?.coordinates?.lat && (
            <div className="property-info-section">
              <h2>Çevre Bilgileri</h2>
              {weather && (
                <p>Hava Durumu: {weather.weather?.[0]?.description} • {Math.round(weather.main?.temp)}°C</p>
              )}
              <div className="amenities-list">
                {LANDMARKS_ANTALYA.map(lm => {
                  const km = haversineDistanceKm(
                    { lat: property.location.coordinates.lat, lng: property.location.coordinates.lng },
                    { lat: lm.lat, lng: lm.lng }
                  );
                  return <span key={lm.name} className="amenity-tag">{lm.name}: {km.toFixed(1)} km</span>;
                })}
              </div>
            </div>
          )}
          </div>

          <div className="property-sidebar" id="bookingSection">
            <div className="booking-card">
              <div className="price-display">
                {(() => {
                  if (property.listingType === 'rent_monthly') {
                    const monthlyValue = property.pricing?.monthly ?? property.pricing?.daily ?? '';
                    const monthlyFormatted = formatCurrency(monthlyValue);
                    return monthlyFormatted ? (
                      <>
                        <span className="daily-price">₺{monthlyFormatted}</span>
                        <span className="price-period">/ ay</span>
                      </>
                    ) : (
                      <span className="daily-price">Fiyat Sorunuz</span>
                    );
                  }
                  if (property.listingType === 'sale') {
                    const saleValue = property.pricing?.sale ?? property.pricing?.monthly ?? property.pricing?.daily ?? '';
                    const saleFormatted = formatCurrency(saleValue);
                    return (
                      <span className="daily-price">
                        {saleFormatted ? `₺${saleFormatted}` : 'Fiyat Sorunuz'}
                      </span>
                    );
                  }
                  const dailyValue = property.pricing?.daily ?? '';
                  const dailyFormatted = formatCurrency(dailyValue);
                  return dailyFormatted ? (
                    <>
                      <span className="daily-price">₺{dailyFormatted}</span>
                      <span className="price-period">/ gece</span>
                    </>
                  ) : (
                    <span className="daily-price">Fiyat Sorunuz</span>
                  );
                })()}
              </div>

              <div className="booking-form">
                <div className={`booking-dates${property.listingType === 'rent_daily' ? ' has-checkout' : ''}`}>
                  <div className="input-group">
                    <label>{property.listingType === 'rent_daily' ? 'Giriş Tarihi' : 'Rezervasyon Tarihi'}</label>
                    <DatePicker
                      selected={checkIn}
                      onChange={(date) => {
                        setCheckIn(date);
                        // CheckIn değiştiğinde checkOut'u sıfırla (eğer checkOut checkIn'den önceyse)
                        if (checkOut && date && checkOut <= date) {
                          setCheckOut(null);
                        }
                      }}
                      minDate={new Date()}
                      excludeDates={excludedDates}
                      dateFormat="dd/MM/yyyy"
                      placeholderText={property.listingType === 'rent_daily' ? 'Giriş tarihi seçin' : 'Rezervasyon tarihi seçin'}
                      className="date-input"
                      filterDate={(date) => {
                        // Dolu tarihleri engelle
                        const dateStr = date.toISOString().split('T')[0];
                        return !excludedDates.some(ex => ex.toISOString().split('T')[0] === dateStr);
                      }}
                    />
                  </div>

                  {property.listingType === 'rent_daily' && (
                    <div className="input-group">
                      <label>Çıkış Tarihi</label>
                      <DatePicker
                        selected={checkOut}
                        onChange={(date) => setCheckOut(date)}
                        minDate={checkIn ? new Date(checkIn.getTime() + 24 * 60 * 60 * 1000) : new Date()}
                        excludeDates={excludedDates}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Çıkış tarihi seçin"
                        className="date-input"
                        filterDate={(date) => {
                          // Dolu tarihleri engelle
                          const dateStr = date.toISOString().split('T')[0];
                          return !excludedDates.some(ex => ex.toISOString().split('T')[0] === dateStr);
                        }}
                      />
                    </div>
                  )}
                </div>

                {property.listingType === 'rent_daily' && (
                  <>
                    <div className="input-group">
                      <label>Misafir Sayısı</label>
                      <div className="guests-input">
                        <div>
                          <label>Yetişkin</label>
                          <input
                            type="number"
                            min="1"
                            value={guests.adults}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setGuests({ ...guests, adults: '' });
                                return;
                              }
                              const numeric = parseInt(value, 10);
                              setGuests({ ...guests, adults: Number.isNaN(numeric) || numeric < 1 ? 1 : numeric });
                            }}
                          />
                        </div>
                        <div>
                          <label>Çocuk</label>
                          <input
                            type="number"
                            min="0"
                            value={guests.children}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setGuests({ ...guests, children: '' });
                                return;
                              }
                              const numeric = parseInt(value, 10);
                              setGuests({ ...guests, children: Number.isNaN(numeric) || numeric < 0 ? 0 : numeric });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* İletişim bilgileri Checkout sayfasında alınacak */}

                {priceSummary && (() => {
                  const nightlyTotal = priceSummary.dailyRate * priceSummary.totalDays;
                  const extraTotal = priceSummary.extraPerDay * priceSummary.totalDays;
                  const totalFormatted = formatCurrency(priceSummary.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
                  const nightlyTotalFormatted = formatCurrency(nightlyTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
                  const extraTotalFormatted = formatCurrency(extraTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
                  const dailyRateFormatted = formatCurrency(priceSummary.dailyRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
                  return (
                    <div className="price-summary">
                      <div className="price-row">
                        <span>₺{dailyRateFormatted} x {priceSummary.totalDays} gece</span>
                        <span>₺{nightlyTotalFormatted}</span>
                      </div>
                      {(priceSummary.extraPerDay > 0) && (
                        <div className="price-row">
                          <span>Ekstra Kişi Ücreti ({priceSummary.extraAdults} yetişkin{priceSummary.extraChildren>0?`, ${priceSummary.extraChildren} çocuk`:''})</span>
                          <span>₺{extraTotalFormatted}</span>
                        </div>
                      )}
                      <div className="price-row total">
                        <span>Toplam</span>
                        <span>₺{totalFormatted}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={handleRequestBooking}
                  className="btn btn-primary btn-block"
                  disabled={!checkIn || (property.listingType==='rent_daily' && !checkOut) || calculating}
                >
                  {calculating ? 'Hesaplanıyor...' : 'Devam Et'}
                </button>

                {!isSale && (
                  <p className="booking-note" style={{marginTop: '10px'}}>
                    * Müsait olduğumuz tarihler seçilebilir; seçilemeyen tarihler doludur.
                  </p>
                )}

                <p className="booking-note">
                  Rezervasyon talebiniz alındıktan sonra size geri dönüş yapılacaktır. Ödeme işlemi daire teslim edilirken veya ofisten yapılacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {errorMsg && (
        <div className="modal-overlay" onClick={()=>setErrorMsg('')}>
          <div className="modal property-detail-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Uyarı</h3>
            </div>
            <div style={{padding:'16px 20px'}}>
              <p>{errorMsg}</p>
            </div>
            <div className="modal-actions" style={{justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={()=>setErrorMsg('')}>Tamam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;

