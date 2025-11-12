import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';
import { FaSearch, FaFilter } from 'react-icons/fa';
import './Properties.css';
import { setSEO } from '../utils/seo';

const Properties = ({ initialFilters = {} }) => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // localStorage'dan filtreleri yükle veya varsayılan değerleri kullan
  const getInitialFilters = () => {
    // Önce localStorage'dan kontrol et
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
    // localStorage yoksa URL parametrelerinden veya initialFilters'dan al
    return {
      propertyType: searchParams.get('propertyType') || initialFilters.propertyType || '',
      minPrice: searchParams.get('minPrice') || initialFilters.minPrice || '',
      maxPrice: searchParams.get('maxPrice') || initialFilters.maxPrice || '',
      listingType: searchParams.get('listingType') || initialFilters.listingType || ''
    };
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
    const titleBase = 'Antalya Daireler | Günlük Kiralık Evim';
    const typeLabel = filters.listingType === 'sale' ? 'Satılık' : (filters.listingType === 'rent_daily' ? 'Günlük Kiralık' : (filters.listingType === 'rent_monthly' ? 'Aylık Kiralık' : 'Tüm'));
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
          <h1>Antalya - {filters.listingType === 'sale' ? 'Satılık Daireler' : filters.listingType === 'rent' ? 'Günlük Kiralık Daireler' : 'Tüm Daireler'}</h1>
          <p>Size en uygun daireyi bulmak için filtreleri kullanın</p>
        </div>
        
        <div className="filters-toolbar">
          <button className="btn btn-primary" onClick={()=>setIsFiltersOpen(true)}><FaFilter /> Filtrele</button>
          <div className="sort-inline">
            <label>Sırala</label>
            <select value={sort} onChange={(e)=>setSort(e.target.value)}>
              <option value="">Önerilen</option>
              <option value="price_asc">Fiyat (Artan)</option>
              <option value="price_desc">Fiyat (Azalan)</option>
              <option value="views_desc">Popüler</option>
            </select>
          </div>
        </div>

        {isFiltersOpen && (
          <div className="modal-overlay" onClick={()=>setIsFiltersOpen(false)}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h3>Filtrele</h3>
                <button className="close" onClick={()=>setIsFiltersOpen(false)}>×</button>
              </div>
              <form onSubmit={handleSearch}>
                <div className="modal-grid">
                  <div className="filter-chip">
                    <label>İlan</label>
                    <select value={tempFilters.listingType} onChange={(e)=>handleFilterChange('listingType', e.target.value)}>
                      <option value="">Hepsi</option>
                      <option value="rent_daily">Günlük Kiralık</option>
                      <option value="rent_monthly">Aylık Kiralık</option>
                      
                      <option value="sale">Satılık</option>
                    </select>
                  </div>
                  <div className="filter-chip">
                    <label>Tip</label>
                    <select value={tempFilters.propertyType} onChange={(e)=>handleFilterChange('propertyType', e.target.value)}>
                      <option value="">Tümü</option>
                      <option value="1+0">1+0</option>
                      <option value="1+1">1+1</option>
                      <option value="2+1">2+1</option>
                      <option value="3+1">3+1</option>
                      <option value="4+1">4+1</option>
                    </select>
                  </div>
                  
                  
                  <div className="filter-chip">
                    <label>Fiyat</label>
                    <div className="price-inline">
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        placeholder="Min" 
                        value={tempFilters.minPrice} 
                        onChange={(e)=>handleFilterChange('minPrice', e.target.value.replace(/[^0-9]/g, ''))} 
                      />
                      <span>–</span>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        placeholder="Max" 
                        value={tempFilters.maxPrice} 
                        onChange={(e)=>handleFilterChange('maxPrice', e.target.value.replace(/[^0-9]/g, ''))} 
                      />
                    </div>
                  </div>
                  
                  
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>Temizle</button>
                  <button type="submit" className="btn btn-primary"><FaSearch /> Uygula</button>
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



