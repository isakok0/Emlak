import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FaShieldAlt } from 'react-icons/fa';
import api from '../services/api';

const Checkout = () => {
  const { propertyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestInfo, setGuestInfo] = useState({ name:'', email:'', phoneDigits:'', arrivalTime:'', notes:'' });
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [policiesAccepted, setPoliciesAccepted] = useState(false);

  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const adults = Number(searchParams.get('adults') || 1);
  const children = Number(searchParams.get('children') || 0);

  useEffect(()=>{
    (async()=>{
      try{
        const res = await api.get(`/properties/${propertyId}`);
        setProperty(res.data);
      } finally { setLoading(false); }
    })();
  },[propertyId]);

  // Hide footer on this page
  useEffect(()=>{
    const prev = document.body.className;
    document.body.classList.add('no-footer');
    return ()=>{ document.body.classList.remove('no-footer'); document.body.className = prev; };
  },[]);

  // Phone format helpers (TR): 0 (5xx) xxx xx xx
  const formatPhone = (digits) => {
    if (!digits) return '0 ( )';
    const d = digits.toString().slice(0, 10); // max 10 digit
    const p1 = d.slice(0, 3); // ilk 3 rakam (parantez içi)
    const p2 = d.slice(3, 6); // sonraki 3 rakam
    const p3 = d.slice(6, 8); // sonraki 2 rakam
    const p4 = d.slice(8, 10); // son 2 rakam
    
    let formatted = '0 (';
    if (p1) formatted += p1;
    else formatted += ' ';
    formatted += ')';
    if (p2) formatted += ' ' + p2;
    if (p3) formatted += ' ' + p3;
    if (p4) formatted += ' ' + p4;
    
    return formatted;
  };

  // Ad Soyad: her kelimenin baş harfi büyük (TR uyumlu), boşluklar korunur
  const toTitleCaseTr = (value) => value.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1));

  const handlePhoneChange = (val) => {
    // Sadece rakamları al, başındaki 0'ı kaldır
    const only = val.replace(/\D/g, '').replace(/^0+/, '');
    const digits = only.slice(0, 10); // max 10 rakam
    setGuestInfo(prev => ({ ...prev, phoneDigits: digits }));
  };

  const validateForm = () => {
    if (!guestInfo.name || guestInfo.name.trim() === '') {
      return 'Lütfen ad soyad bilginizi giriniz';
    }
    if (!guestInfo.email || guestInfo.email.trim() === '') {
      return 'Lütfen e-posta adresinizi giriniz';
    }
    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInfo.email.trim())) {
      return 'Lütfen geçerli bir e-posta adresi giriniz';
    }
    if (!guestInfo.phoneDigits || guestInfo.phoneDigits.trim() === '') {
      return 'Lütfen telefon numaranızı giriniz';
    }
    // Telefon numarası en az 10 karakter olmalı
    if (guestInfo.phoneDigits.trim().length < 10) {
      return 'Lütfen geçerli bir telefon numarası giriniz';
    }
    if (!policiesAccepted) {
      return 'Rezervasyon talebini göndermeden önce şartları onaylamalısınız';
    }
    return null;
  };

  const submit = async ()=>{
    // Form validasyonu
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMsg(''); // Önceki hataları temizle
    try {
      await api.post('/bookings', {
        property: propertyId,
        checkIn,
        checkOut,
        guests: { adults, children },
        guestInfo: {
          name: guestInfo.name.trim(),
          email: guestInfo.email.trim(),
          phone: `0${guestInfo.phoneDigits.trim()}`,
          arrivalTime: guestInfo.arrivalTime.trim(),
          notes: guestInfo.notes.trim()
        },
        policiesAccepted: true
      });
      setShowConfirm(true);
    } catch (e) {
      // Backend'den gelen hata(lar)ı detaylı göster
      let errorMessage = 'Rezervasyon talebi gönderilemedi. Lütfen tekrar deneyiniz.';
      if (e.response?.data?.errors && Array.isArray(e.response.data.errors)) {
        errorMessage = e.response.data.errors.map(er => er.msg).join('\n');
      } else if (e.response?.data?.message) {
        errorMessage = e.response.data.message;
      }

      // İstenen davranış: "müsaitlik yok" uyarısını göstermeyelim
      // Böyle bir mesaj gelirse kullanıcıyı engellemeyip talebi aldık modalını gösterelim
      if (/müsaitlik/i.test(errorMessage) || /tarihinde/i.test(errorMessage)) {
        setShowConfirm(true);
        setErrorMsg('');
        return;
      }

      setErrorMsg(errorMessage);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!property) return <div className="container"><p>Daire bulunamadı</p></div>;

  return (
    <div className="container" style={{padding:'40px 20px'}}>
      <div style={{display:'block', marginBottom:10}}>
        <div style={{marginBottom:8}}>
          <button className="btn btn-secondary" onClick={()=>navigate(-1)}>&larr; Geri</button>
        </div>
        <h1 style={{margin:0}}>Rezervasyon Bilgileri</h1>
      </div>
      <p>{property.title}</p>
      <div className="card">
        <div className="input-group">
          <label>Ad Soyad <span style={{color:'#ef4444'}}>*</span></label>
          <input 
            value={guestInfo.name} 
            onChange={e=>setGuestInfo({...guestInfo,name: toTitleCaseTr(e.target.value)})}
            placeholder="Adınız ve soyadınız"
            required
          />
        </div>
        <div className="input-group">
          <label>E-posta <span style={{color:'#ef4444'}}>*</span></label>
          <input 
            type="email" 
            value={guestInfo.email} 
            onChange={e=>setGuestInfo({...guestInfo,email:e.target.value})}
            placeholder="ornek@email.com"
            required
          />
        </div>
        <div className="input-group">
          <label>Telefon <span style={{color:'#ef4444'}}>*</span></label>
          <input
            type="tel"
            inputMode="numeric"
            value={formatPhone(guestInfo.phoneDigits)}
            onChange={e => handlePhoneChange(e.target.value)}
            onKeyDown={(e)=>{ // sadece rakam, backspace, delete, oklar
              const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
              if (!allowed.includes(e.key) && !/\d/.test(e.key)) {
                e.preventDefault();
              }
            }}
            placeholder="0 (5__) ___ __ __"
            required
          />
        </div>
        <div className="input-group">
          <label>Tahmini Geliş Saati (opsiyonel)</label>
          <input placeholder="14:00" value={guestInfo.arrivalTime} onChange={e=>setGuestInfo({...guestInfo,arrivalTime:e.target.value})} />
        </div>
        <div className="input-group">
          <label>Notlar (opsiyonel)</label>
          <textarea rows={4} placeholder="Özel isteklerinizi yazın" value={guestInfo.notes} onChange={e=>setGuestInfo({...guestInfo,notes:e.target.value})} />
        </div>
        <div className="policies-consent">
          <div className="policies-consent__icon">
            <FaShieldAlt />
          </div>
          <div className="policies-consent__content">
            <h4>Rezervasyon Şartları</h4>
            <p>
              Devam ederek platformumuzun politikalarını okuduğunuzu ve kabul ettiğinizi onaylamanız gerekir.
              Lütfen aşağıdaki belgeleri inceleyin:
            </p>
            <div className="policies-consent__links">
              <Link to="/kullanim-kosullari" target="_blank" rel="noopener noreferrer">Kullanım Koşulları</Link>
              <span>•</span>
              <Link to="/kvkk" target="_blank" rel="noopener noreferrer">Gizlilik/KVKK Politikası</Link>
              <span>•</span>
              <Link to="/iptal-iade" target="_blank" rel="noopener noreferrer">İptal/İade Şartları</Link>
            </div>
            <label className="policies-consent__checkbox">
              <input
                type="checkbox"
                checked={policiesAccepted}
                onChange={(e)=>setPoliciesAccepted(e.target.checked)}
              />
              <span>Yukarıdaki şartları okudum ve kabul ediyorum.</span>
            </label>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          disabled={submitting || !policiesAccepted} 
          onClick={submit}
          style={{width:'100%', marginTop:'20px'}}
        >
          {submitting ? 'Gönderiliyor...' : 'Rezervasyon Talebi Gönder'}
        </button>
        <p style={{fontSize:'12px', color:'#64748b', marginTop:'10px', textAlign:'center'}}>
          <span style={{color:'#ef4444'}}>*</span> ile işaretli alanlar zorunludur
        </p>
      </div>

      {(errorMsg) && (
        <div className="modal-overlay" onClick={()=>setErrorMsg('')}>
          <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Uyarı</h3>
            </div>
            <div style={{padding:'16px 20px'}}>
              {errorMsg.split('\n').map((line, idx) => (
                <p key={idx} style={{margin: idx > 0 ? '8px 0 0' : '0'}}>{line}</p>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={()=>setErrorMsg('')}>Tamam</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={()=>{setShowConfirm(false); navigate('/');}}>
          <div className="modal modal-confirm" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Talebiniz Alındı</h3>
            </div>
            <div style={{padding:'16px 20px'}}>
              <p>Rezervasyon talebiniz bize ulaştı. En kısa sürede sizinle iletişime geçeceğiz.</p>
              <p><strong>Tarih:</strong> {new Date(checkIn).toLocaleDateString()} → {new Date(checkOut).toLocaleDateString()}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>navigate('/properties')}>Dairelere Dön</button>
              <button className="btn btn-primary" onClick={()=>navigate('/')}>Ana Sayfa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;


