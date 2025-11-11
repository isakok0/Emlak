import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my-bookings');
      setBookings(res.data);
    } catch (error) {
      console.error('Rezervasyonlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Profilim</h1>
        
        <div className="profile-section">
          <h2>Kişisel Bilgiler</h2>
          <div className="info-card">
            <p><strong>Ad Soyad:</strong> {user?.name}</p>
            <p><strong>E-posta:</strong> {user?.email}</p>
            <p><strong>Telefon:</strong> {user?.phone || 'Belirtilmemiş'}</p>
          </div>
        </div>

        <div className="profile-section">
          <h2>Rezervasyonlarım</h2>
          {bookings.length === 0 ? (
            <p className="no-bookings">Henüz rezervasyonunuz bulunmuyor.</p>
          ) : (
            <div className="bookings-list">
              {bookings.map(booking => (
                <div key={booking._id} className="booking-card">
                  <div className="booking-header">
                    <h3>{booking.property?.title}</h3>
                    <span className={`status status-${booking.status}`}>
                      {booking.status === 'pending_request' && 'Bekleyen Talep'}
                      {booking.status === 'confirmed' && 'Onaylanmış'}
                      {booking.status === 'cancelled' && 'İptal Edilmiş'}
                      {booking.status === 'completed' && 'Tamamlanmış'}
                    </span>
                  </div>
                  <div className="booking-info">
                    <p><strong>Giriş:</strong> {new Date(booking.checkIn).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Çıkış:</strong> {new Date(booking.checkOut).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Toplam:</strong> ₺{booking.pricing?.total}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;














