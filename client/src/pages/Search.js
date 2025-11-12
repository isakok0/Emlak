import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';
import './Search.css';

const Search = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: searchParams.get('guests') || '1',
    propertyType: searchParams.get('propertyType') || '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    searchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const res = await api.get(`/search?${params.toString()}`);

      if (Array.isArray(res.data)) {
        setProperties(res.data);
        setSuggestions(null);
      } else {
        setProperties(res.data.results || []);
        setSuggestions(res.data.suggestions || null);
      }
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchProperties();
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const hasResults = properties.length > 0;
  const hasNearBudgetSuggestions = suggestions?.nearBudget?.length > 0;

  return (
    <div className="search-page">
      <div className="container">
        <h1>Antalya - Arama Sonuçları</h1>

        <form className="search-filters" onSubmit={handleSearch}>
          <select
            value={filters.propertyType}
            onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            className="filter-select"
          >
            <option value="">Tüm Daire Tipleri</option>
            <option value="1+0">1+0</option>
            <option value="1+1">1+1</option>
            <option value="2+1">2+1</option>
            <option value="3+1">3+1</option>
            <option value="4+1">4+1</option>
          </select>
          <input
            type="date"
            placeholder="Giriş Tarihi"
            value={filters.checkIn}
            onChange={(e) => handleFilterChange('checkIn', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <input
            type="date"
            placeholder="Çıkış Tarihi"
            value={filters.checkOut}
            onChange={(e) => handleFilterChange('checkOut', e.target.value)}
            min={filters.checkIn || new Date().toISOString().split('T')[0]}
          />
          <input
            type="number"
            placeholder="Misafir Sayısı"
            min="1"
            value={filters.guests}
            onChange={(e) => handleFilterChange('guests', e.target.value)}
          />
          <input
            type="number"
            placeholder="Min Fiyat"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Fiyat"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Ara</button>
        </form>

        <div className="results-count">
          {properties.length} daire bulundu
        </div>

        {hasResults && (
          <div className="properties-grid">
            {properties.map(property => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}

        {!hasResults && (
          <div className="suggestions-wrapper">
            <p className="no-results">Arama kriterlerinize uygun daire bulunamadı.</p>

            {suggestions?.message && (
              <p className="suggestions-message">{suggestions.message}</p>
            )}

            {hasNearBudgetSuggestions && (
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

export default Search;
