import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';
import { FaSearch, FaFilter, FaHome, FaTag, FaTimes, FaSort } from 'react-icons/fa';
import './Properties.css';
import { setSEO } from '../utils/seo';

const Properties = ({ initialFilters = {} }) => {
  const location = useLocation();
  const {
    propertyType: initialPropertyType = '',
    minPrice: initialMinPrice = '',
    maxPrice: initialMaxPrice = '',
    listingType: initialListingType = ''
  } = initialFilters;
  const forceFilters = Boolean(location.state?.forceFilters);
  const clearFiltersState = Boolean(location.state?.clearFilters);
  const [properties, setProperties] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const paramsFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      propertyType: params.get('propertyType') || initialPropertyType,
      minPrice: params.get('minPrice') || initialMinPrice,
      maxPrice: params.get('maxPrice') || initialMaxPrice,
      listingType: params.get('listingType') || initialListingType
    };
  }, [location.search, initialPropertyType, initialMinPrice, initialMaxPrice, initialListingType]);

  const hasParamsFilters = useMemo(() => Object.values(paramsFilters).some(Boolean), [paramsFilters]);

  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem('propertiesFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Boş olmayan değerler varsa localStorage'dan kullan
        if (parsed && (parsed.propertyType || parsed.minPrice || parsed.maxPrice || parsed.listingType)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Filtreler yüklenemedi:', e);
    }
    return null;
  };

  // localStorage'dan filtreleri yükle veya varsayılan değerleri kullan
  const getInitialFilters = () => {
    if (clearFiltersState) {
      try {
        localStorage.removeItem('propertiesFilters');
      } catch (e) {
        console.warn('Filtreler temizlenemedi:', e);
      }
      return {
        propertyType: '',
        minPrice: '',
        maxPrice: '',
        listingType: ''
      };
    }

    if (forceFilters || hasParamsFilters) {
      return paramsFilters;
    }

    const saved = loadSavedFilters();
    if (saved) {
      return saved;
    }

    // localStorage yoksa URL parametrelerinden veya initialFilters'dan al
    return paramsFilters;
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [tempFilters, setTempFilters] = useState(filters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sort, setSort] = useState('');

  useEffect(() => {
    fetchProperties();
  }, [filters, sort]);

  // Modal açıldığında tempFilters'ı güncelle
  useEffect(() => {
    if (isFiltersOpen) {
      setTempFilters(filters);
    }
  }, [isFiltersOpen, filters]);

  useEffect(() => {
    if (clearFiltersState) {
      const cleared = {
        propertyType: '',
        minPrice: '',
        maxPrice: '',
        listingType: ''
      };
      setFilters(prev => {
        if (JSON.stringify(prev) === JSON.stringify(cleared)) {
          return prev;
        }
        return cleared;
      });
      setTempFilters(cleared);
      try {
        localStorage.removeItem('propertiesFilters');
      } catch (e) {
        console.warn('Filtreler temizlenemedi:', e);
      }
      return;
    }

    if (!(forceFilters || hasParamsFilters)) {
      return;
    }

    setFilters(prev => {
      const next = paramsFilters;
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      return next;
    });
    setTempFilters(paramsFilters);

    try {
      localStorage.setItem('propertiesFilters', JSON.stringify(paramsFilters));
    } catch (e) {
      console.warn('Filtreler kaydedilemedi:', e);
    }
  }, [paramsFilters, forceFilters, hasParamsFilters, clearFiltersState]);

  useEffect(() => {
    // önceki listeden dönüldüyse pozisyona kaydır
    try {
      const y = sessionStorage.getItem('listScroll');
      if (y) {
        window.scrollTo({ top: parseInt(y, 10), behavior: 'instant' });
        sessionStorage.removeItem('listScroll');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const typeLabel = filters.listingType === 'sale'
      ? 'Satılık'
      : (filters.listingType === 'rent_daily'
        ? 'Günlük Kiralık'
        : (filters.listingType === 'rent_monthly' ? 'Aylık Kiralık' : 'Tüm'));
    setSEO({
      title: `${typeLabel} Daireler | Günlük Kiralık Evim`,
      description: `Antalya'da ${typeLabel.toLowerCase()} daireler. Filtreleyin, karşılaştırın ve size en uygun ilanı seçin.`,
      canonical: '/properties'
    });
  }, [filters.listingType]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      if (sort) params.append('sort', sort);
      
      const res = await api.get(`/properties?${params.toString()}`);
      if (Array.isArray(res.data)) {
        setProperties(res.data);
        setSuggestions(null);
      } else {
        setProperties(res.data.results || []);
        setSuggestions(res.data.suggestions || null);
      }
    } catch (error) {
      console.error('Daireler yüklenemedi:', error);
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Filtreleri localStorage'a kaydet
    try {
      localStorage.setItem('propertiesFilters', JSON.stringify(tempFilters));
    } catch (e) {
      console.warn('Filtreler kaydedilemedi:', e);
    }
    setFilters(tempFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      propertyType: '',
      minPrice: '',
      maxPrice: '',
      listingType: ''
    };
    // localStorage'dan da temizle
    try {
      localStorage.removeItem('propertiesFilters');
    } catch (e) {
      console.warn('Filtreler temizlenemedi:', e);
    }
    setTempFilters(cleared);
    setFilters(cleared);
    setSuggestions(null);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="properties-page">
      <div className="container">
        <div className="page-header">
          <h1>
            Antalya - {
              filters.listingType === 'sale'
                ? 'Satılık Daireler'
                : filters.listingType === 'rent_daily'
                  ? 'Günlük Kiralık Daireler'
                  : filters.listingType === 'rent_monthly'
                    ? 'Aylık Kiralık Daireler'
                    : 'Tüm Daireler'
            }
          </h1>
          <p>Size en uygun daireyi bulmak için filtreleri kullanın</p>
        </div>
        
        <div className="filters-toolbar">
          <button className="btn btn-primary" onClick={()=>setIsFiltersOpen(true)}>
            <FaFilter className="btn-icon" />
            Filtrele
          </button>
          <div className="sort-wrapper">
            <label className="sort-label">
              <FaSort className="sort-icon" />
              Sırala
            </label>
            <div className="sort-select-wrapper">
              <select 
                className="sort-select"
                value={sort} 
                onChange={(e)=>setSort(e.target.value)}
              >
                <option value="">Önerilen</option>
                <option value="price_asc">Fiyat (Artan)</option>
                <option value="price_desc">Fiyat (Azalan)</option>
                <option value="views_desc">Popüler</option>
              </select>
            </div>
          </div>
        </div>

        {isFiltersOpen && (
          <div className="filters-modal-overlay" onClick={()=>setIsFiltersOpen(false)}>
            <div className="filters-modal" onClick={(e)=>e.stopPropagation()}>
              <div className="filters-modal-header">
                <div className="filters-modal-icon">
                  <FaFilter />
                </div>
                <h3>Filtrele</h3>
                <p className="filters-modal-subtitle">Size en uygun daireyi bulun</p>
                <button className="filters-modal-close" onClick={()=>setIsFiltersOpen(false)} aria-label="Kapat">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSearch} className="filters-form">
                <div className="filters-form-content">
                  <div className="filter-group">
                    <label htmlFor="listingType">
                      <FaTag className="filter-icon" />
                      İlan Tipi
                    </label>
                    <select 
                      id="listingType"
                      value={tempFilters.listingType} 
                      onChange={(e)=>handleFilterChange('listingType', e.target.value)}
                    >
                      <option value="">Hepsi</option>
                      <option value="rent_daily">Günlük Kiralık</option>
                      <option value="rent_monthly">Aylık Kiralık</option>
                      <option value="sale">Satılık</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label htmlFor="propertyType">
                      <FaHome className="filter-icon" />
                      Daire Tipi
                    </label>
                    <select 
                      id="propertyType"
                      value={tempFilters.propertyType} 
                      onChange={(e)=>handleFilterChange('propertyType', e.target.value)}
                    >
                      <option value="">Tümü</option>
                      <option value="1+0">1+0</option>
                      <option value="1+1">1+1</option>
                      <option value="2+1">2+1</option>
                      <option value="3+1">3+1</option>
                      <option value="4+1">4+1</option>
                    </select>
                  </div>
                  
                  <div className="filter-group filter-group-price">
                    <label>
                      <FaTag className="filter-icon" />
                      Fiyat Aralığı
                    </label>
                    <div className="price-range-inputs">
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        placeholder="Min Fiyat" 
                        value={tempFilters.minPrice} 
                        onChange={(e)=>handleFilterChange('minPrice', e.target.value.replace(/[^0-9]/g, ''))} 
                      />
                      <span className="price-separator">–</span>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        placeholder="Max Fiyat" 
                        value={tempFilters.maxPrice} 
                        onChange={(e)=>handleFilterChange('maxPrice', e.target.value.replace(/[^0-9]/g, ''))} 
                      />
                    </div>
                  </div>
                </div>
                <div className="filters-modal-actions">
                  <button type="button" className="btn-filter-clear" onClick={clearFilters}>
                    <FaTimes className="btn-icon" />
                    Temizle
                  </button>
                  <button type="submit" className="btn-filter-apply">
                    <FaSearch className="btn-icon" />
                    Filtrele
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {properties.length > 0 ? (
          <div className="properties-grid">
            {properties.map(property => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        ) : (
          <div className="suggestions-wrapper">
            <p className="empty-state">Filtrelerinize uygun daire bulunamadı.</p>

            {suggestions?.message && (
              <p className="suggestions-message">{suggestions.message}</p>
            )}

            {suggestions?.nearBudget?.length > 0 && (
              <div className="properties-grid">
                {suggestions.nearBudget.map(property => (
                  <PropertyCard key={property._id} property={property} />
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;



