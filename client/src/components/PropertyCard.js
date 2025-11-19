import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaBed } from 'react-icons/fa';
import './PropertyCard.css';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return '';
  return numberValue.toLocaleString('tr-TR');
};

const PropertyCard = ({ property }) => {
  const [hoverIndex, setHoverIndex] = useState(0);
  // images'ın array olduğundan emin ol (JSON string olarak gelebilir veya null olabilir)
  const imagesArray = (() => {
    if (!property.images) return [];
    if (Array.isArray(property.images)) return property.images;
    if (typeof property.images === 'string') {
      try {
        const parsed = JSON.parse(property.images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  const hasImages = imagesArray.length > 0;
  const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="20" font-family="Arial, Helvetica, sans-serif">Görsel Yok</text></svg>';
  const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000');
  const toFull = (u) => {
    if (!u) return u;
    u = u.replace(/\\/g,'/');
    if (u.startsWith('http')) return u;
    if (u.startsWith('/uploads')) return `${apiBase}${u}`;
    if (u.startsWith('uploads')) return `${apiBase}/${u}`;
    return u;
  };
  const imageUrls = (() => {
    const urls = hasImages ? imagesArray.map(img => (typeof img === 'string' ? img : img?.url)).filter(Boolean) : [];
    const fulls = urls.map(u => encodeURI(toFull(u)));
    return fulls.length > 0 ? fulls : [placeholder];
  })();
  const imageUrl = imageUrls[0];

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
  const timerRef = useRef(null);

  const location = `${property.location?.district || ''}, ${property.location?.city || ''}`;
  const listingLabelMap = {
    rent_daily: 'Günlük Kiralık',
    rent_monthly: 'Aylık Kiralık',
    sale: 'Satılık'
  };

  // Favorileme özelliği kaldırıldı

  // Hover ile otomatik görsel kaydırma
  const startSlide = () => {
    if (!imageUrls || imageUrls.length < 2) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const max = Math.min(imageUrls.length, 8);
    timerRef.current = setInterval(() => {
      setHoverIndex((i) => (i + 1) % max);
    }, 2000);
  };

  const stopSlide = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHoverIndex(0);
  };

  const handleOpen = () => {
    try { sessionStorage.setItem('listScroll', String(window.scrollY || window.pageYOffset || 0)); } catch(_){}
  };

  return (
    <div className="property-card">
      <Link to={`/properties/${property._id}`} onClick={handleOpen}>
        <div className="property-image" onMouseEnter={startSlide} onMouseLeave={stopSlide}>
          <img src={imageUrls[hoverIndex] || imageUrl} alt={property.title} onError={(e)=>{ e.currentTarget.src = placeholder; }} />
          {(property.listingType && property.listingType !== 'rent') && (
            <div className="listing-type-badge">{listingLabelMap[property.listingType]}</div>
          )}
          <div className="hover-overlay">
            <div className="hover-info">
              <span className="pill">{property.propertyType}</span>
              <span className="pill">
                {(() => {
                  const pricing = property?.pricing || {};
                  if (property.listingType === 'rent_monthly') {
                    const formatted = formatCurrency(pricing.monthly);
                    return formatted ? `₺${formatted}/ay` : 'Fiyat Sorunuz';
                  }
                  if (property.listingType === 'sale') {
                    const saleValue = pricing.sale ?? pricing.monthly ?? pricing.daily;
                    const formatted = formatCurrency(saleValue);
                    return formatted ? `₺${formatted}` : 'Fiyat Sorunuz';
                  }
                  const formatted = formatCurrency(pricing.daily);
                  return formatted ? `₺${formatted}/gece` : 'Fiyat Sorunuz';
                })()}
              </span>
            </div>
          </div>
          {/* Doğrulanmış rozeti kaldırıldı */}
          {(property.views > 100) && (
            <div className="trend-badge">Sıcak Fırsat</div>
          )}
          {(property.views > 50 && property.views <= 100) && (
            <div className="trend-badge">Trend</div>
          )}
          {imageUrls.length > 1 && (
            <div className="image-dots" onMouseEnter={()=>{}}>
              {imageUrls.slice(0,5).map((_, idx) => (
                <span key={idx} className={`dot ${hoverIndex===idx?'active':''}`}
                  onMouseEnter={()=>setHoverIndex(idx)} />
              ))}
            </div>
          )}
        </div>
        <div className="property-info">
          <h3>{fixTitle(property.title)}</h3>
          <div className="property-location">
            <FaMapMarkerAlt /> {location}
          </div>
          <div className="property-details">
            <span><FaBed /> {property.bedrooms} Yatak</span>
          </div>
          <div className="property-price">
            {property.listingType === 'rent_monthly' ? (
              (() => {
                const formatted = formatCurrency(property.pricing?.monthly);
                return (
                  <>
                    <span className="price">{formatted ? `₺${formatted}` : 'Fiyat Sorunuz'}</span>
                    {formatted && <span className="period">/ ay</span>}
                  </>
                );
              })()
            ) : property.listingType === 'sale' ? (
              (() => {
                const saleValue = property.pricing?.sale ?? property.pricing?.monthly ?? property.pricing?.daily;
                const formatted = formatCurrency(saleValue);
                return (
                  <span className="price">{formatted ? `₺${formatted}` : 'Fiyat Sorunuz'}</span>
                );
              })()
            ) : (
              (() => {
                const dailyFormatted = formatCurrency(property.pricing?.daily);
                const weeklyFormatted = formatCurrency(property.pricing?.weekly);
                return (
                  <>
                    <span className="price">{dailyFormatted ? `₺${dailyFormatted}` : 'Fiyat Sorunuz'}</span>
                    {dailyFormatted && <span className="period">/ gece</span>}
                    {weeklyFormatted && (
                      <span className="weekly-price">Haftalık: ₺{weeklyFormatted}</span>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;




