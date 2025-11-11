import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Request interceptor - token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData gönderimlerinde Content-Type otomatik ayarlansın
    if (config.data instanceof FormData) {
      if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
    } else {
      // JSON isteklerde Content-Type'ı ayarla
      config.headers = { ...(config.headers||{}), 'Content-Type': 'application/json' };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    // 5xx hatalarında özel hata sayfasına yönlendir
    const status = error.response?.status;
    if (status && status >= 500) {
      const message = error.response?.data?.message;
      const isPerformanceCheck = error.config?.url?.includes('/admin/performance');
      if (isPerformanceCheck) {
        const errorInfo = encodeURIComponent(message || 'PageSpeed hatası');
        window.dispatchEvent(new CustomEvent('api:error', {
          detail: {
            config: error.config,
            status,
            message: message || 'Sunucu hatası'
          }
        }));
      } else {
        const code = status === 503 ? '503' : '500';
        window.location.href = `/error?code=${code}`;
      }
    }
    // Ağ hatası (offline vb.)
    if (!error.response && error.message === 'Network Error') {
      window.location.href = '/error?code=offline';
    }
    return Promise.reject(error);
  }
);

export default api;








