import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaCheck, FaTimes } from 'react-icons/fa';
import './BookingRequests.css';

const BookingRequests = ({ onUpdate }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, type: null, bookingId: null });
  

  useEffect(() => {
    fetchRequests();
  }, []);

  // Disable background scroll/interactions when a modal is open
  useEffect(() => {
    const modalOpen = Boolean(confirmState.open) || Boolean(selectedRequest);
    if (modalOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.setAttribute('data-prev-overflow', previousOverflow);
      document.body.style.overflow = 'hidden';
      return () => {
        const prev = document.body.getAttribute('data-prev-overflow') || '';
        document.body.style.overflow = prev;
        document.body.removeAttribute('data-prev-overflow');
      };
    }
    return undefined;
  }, [confirmState.open, selectedRequest]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/bookings/pending');
      setRequests(res.data);
    } catch (error) {
      console.error('Talepler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const openApproveConfirm = (bookingId) => {
    setConfirmState({ open: true, type: 'approve', bookingId });
  };

  const openRejectConfirm = (bookingId) => {
    setConfirmState({ open: true, type: 'reject', bookingId });
  };

  const performApprove = async (bookingId) => {
    try {
      await api.post(`/admin/bookings/${bookingId}/approve`, {
        paymentInfo: ''
      });
      setConfirmState({ open: false, type: null, bookingId: null });
      // Sessizce güncelle - bildirim gösterme
      setSelectedRequest(null);
      fetchRequests();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Onaylama hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const performReject = async (bookingId) => {
    try {
      await api.post(`/admin/bookings/${bookingId}/reject`, {
        reason: ''
      });
      setConfirmState({ open: false, type: null, bookingId: null });
      // Sessizce güncelle - bildirim gösterme
      setSelectedRequest(null);
      fetchRequests();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Reddetme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  // İletişim kaydı ekleme özelliği kaldırıldı

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (requests.length === 0) {
    return <div className="no-requests">Bekleyen rezervasyon talebi yok</div>;
  }

  return (
    <div className="booking-requests">
      <div className="requests-list grid">
        <h2>Bekleyen Rezervasyon Talepleri ({requests.length})</h2>
        <div className="requests-grid">
          {requests.map(request => (
            <div 
              key={request._id} 
              className={`request-item ${selectedRequest?._id === request._id ? 'active' : ''}`}
              onClick={() => setSelectedRequest(request)}
            >
              <div className="request-header">
                <h3>{request.property?.title}</h3>
                <span className="request-date">
                  {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
              <div className="request-info">
                <p><strong>{request.guestInfo.name}</strong></p>
                <p>{request.guestInfo.email}</p>
                <p>{request.guestInfo.phone}</p>
                <p>
                  {new Date(request.checkIn).toLocaleDateString('tr-TR')} - 
                  {new Date(request.checkOut).toLocaleDateString('tr-TR')}
                </p>
                <p className="request-total">₺{request.pricing.total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal message-modal request-detail" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rezervasyon Detayı</h3>
              <button className="close" onClick={()=>setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Müşteri Bilgileri</h3>
                <p><strong>Ad Soyad:</strong> {selectedRequest.guestInfo.name}</p>
                <p><strong>E-posta:</strong> {selectedRequest.guestInfo.email}</p>
                <p><strong>Telefon:</strong> {selectedRequest.guestInfo.phone}</p>
                {selectedRequest.guestInfo.notes && (
                  <p><strong>Notlar:</strong> <span style={{display:'inline', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere'}}>{selectedRequest.guestInfo.notes}</span></p>
                )}
              </div>

              <div className="detail-section">
                <h3>Rezervasyon Bilgileri</h3>
                <p><strong>Daire:</strong> {selectedRequest.property?.title}</p>
                {(() => {
                  const lt = selectedRequest.property?.listingType || selectedRequest.listingType;
                  const label = lt === 'rent_daily' ? 'Günlük Kiralık' : lt === 'rent_monthly' ? 'Aylık Kiralık' : lt === 'sale' ? 'Satılık' : '';
                  return label ? (<p><strong>İlan Türü:</strong> {label}</p>) : null;
                })()}
                <p><strong>Giriş:</strong> {new Date(selectedRequest.checkIn).toLocaleDateString('tr-TR')}</p>
                {(selectedRequest.property?.listingType || selectedRequest.listingType) === 'rent_daily' && (
                  <>
                    <p><strong>Çıkış:</strong> {new Date(selectedRequest.checkOut).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Misafir:</strong> {selectedRequest.guests.adults} Yetişkin {selectedRequest.guests.children > 0 && `, ${selectedRequest.guests.children} Çocuk`}</p>
                    <p><strong>Günlük Fiyat:</strong> ₺{selectedRequest.pricing.dailyRate}</p>
                    <p><strong>Toplam Gün:</strong> {selectedRequest.pricing.totalDays}</p>
                    <p><strong>Toplam Tutar:</strong> ₺{selectedRequest.pricing.total}</p>
                  </>
                )}
                {(selectedRequest.property?.listingType || selectedRequest.listingType) === 'rent_monthly' && (
                  <p><strong>Fiyat:</strong> ₺{selectedRequest.pricing.total || selectedRequest.pricing.monthly || 0}</p>
                )}
                {(selectedRequest.property?.listingType || selectedRequest.listingType) === 'sale' && (
                  <p><strong>Fiyat:</strong> ₺{selectedRequest.pricing.total || selectedRequest.pricing.monthly || selectedRequest.pricing.daily || 0}</p>
                )}
              </div>

              {Array.isArray(selectedRequest.communicationLog) && selectedRequest.communicationLog.length > 0 && (
                <div className="detail-section">
                  <h3>İletişim Geçmişi</h3>
                  {selectedRequest.communicationLog.map((log, index) => (
                    <div key={index} className="communication-log">
                      <div className="log-header">
                        <span className="log-type">{log.type}</span>
                        <span className="log-date">{new Date(log.date).toLocaleString('tr-TR')}</span>
                      </div>
                      <p>{log.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => openApproveConfirm(selectedRequest._id)}
                className="btn btn-success"
              >
                <FaCheck /> Onayla
              </button>
              <button 
                onClick={() => openRejectConfirm(selectedRequest._id)}
                className="btn btn-danger"
              >
                <FaTimes /> Reddet
              </button>
            </div>
          </div>
        </div>
      )}


      {confirmState.open && (
        <div className="modal-overlay" onClick={()=>setConfirmState({ open:false, type:null, bookingId:null })}>
          <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              {confirmState.type === 'approve' ? 'Onayla' : 'Reddet'}
            </div>
            <div className="modal-body">
              <p>
                {confirmState.type === 'approve' 
                  ? 'Bu rezervasyon talebini onaylamak istediğinize emin misiniz?'
                  : 'Bu rezervasyon talebini reddetmek istediğinize emin misiniz?'}
              </p>
            </div>
            <div className="modal-actions">
              {confirmState.type === 'approve' ? (
                <button className="btn btn-success" onClick={()=>performApprove(confirmState.bookingId)}><FaCheck /> Evet, Onayla</button>
              ) : (
                <button className="btn btn-danger" onClick={()=>performReject(confirmState.bookingId)}><FaTimes /> Evet, Reddet</button>
              )}
              <button className="btn btn-secondary" onClick={()=>setConfirmState({ open:false, type:null, bookingId:null })}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequests;

