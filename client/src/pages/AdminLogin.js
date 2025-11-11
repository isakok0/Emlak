import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'admin',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Hide global footer on this page
  useEffect(() => {
    document.body.classList.add('no-footer');
    return () => {
      document.body.classList.remove('no-footer');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      
      // Sadece admin ise devam et
      if (user.role !== 'admin') {
        setError('Bu sayfaya sadece admin erişebilir');
        // Kullanıcıyı çıkış yaptır
        localStorage.removeItem('token');
        return;
      }
      
      navigate('/admin');
    } catch (error) {
      setError(error.response?.data?.message || 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Admin Girişi</h2>
        {/* Bilgilendirme metni kaldırıldı */}
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="admin"
            />
          </div>
          <div className="input-group">
            <label>Şifre</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{display:'block', margin:'0 auto'}}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
            Ana Sayfaya Dön
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

