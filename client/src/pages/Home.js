import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PropertyCard from '../components/PropertyCard';
import { FaMapMarkerAlt, FaHome, FaCheckCircle, FaPhoneAlt, FaStar, FaLock, FaSmile, FaClock } from 'react-icons/fa';
import './Home.css';
import { useAuth } from '../context/AuthContext';
import { setSEO } from '../utils/seo';
import { API_URL } from '../services/api';

const getPerView = (width) => {
  if (width <= 600) return 1;
  if (width <= 1024) return 2;
  return 3;
};

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [carouselPage, setCarouselPage] = useState(0); // Popüler Daireler için sayfa
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsIndex, setReviewsIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visionMission, setVisionMission] = useState({ vision:'', mission:'', statsHappyGuests:'', statsAvgRating:'', statsSupport:'' });
  const [perView, setPerView] = useState(() => (
    typeof window !== 'undefined' ? getPerView(window.innerWidth) : 3
  ));

  useEffect(() => {
    fetchFeaturedProperties();
    fetchLatestReviews();
    // JSON-LD: Organization & WebSite
    try {
      const org = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Günlük Kiralık Evim',
        url: window.location.origin,
        contactPoint: [{ '@type':'ContactPoint', telephone: '+90-000-000-0000', contactType:'customer service', areaServed:'TR', availableLanguage:['tr'] }]
      };
      const site = {
        '@context':'https://schema.org',
        '@type':'WebSite',
        name:'Günlük Kiralık Evim',
        url: window.location.origin,
        potentialAction: { '@type':'SearchAction', target:`${window.location.origin}/properties?query={search_term_string}`, 'query-input':'required name=search_term_string' }
      };
      const add = (id, obj) => {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.dataset.ld = id;
        s.text = JSON.stringify(obj);
        document.head.appendChild(s);
      };
      add('org', org);
      add('site', site);
    } catch(_){/* ignore */}

    // Public settings - vision/mission
    (async()=>{
      try{
        const r = await fetch(`${API_URL}/api/public/settings`);
        const s = await r.json();
        setVisionMission({ 
          vision: s.visionText || '', 
          mission: s.missionText || '',
          statsHappyGuests: s.statsHappyGuests || '999+',
          statsAvgRating: s.statsAvgRating || '4.8',
          statsSupport: s.statsSupport || '7/24'
        });
      }catch(_){ }
    })();

    // SEO: title/description/canonical
    setSEO({
      title: 'Antalya Günlük ve Aylık Kiralık Daireler | Günlük Kiralık Evim',
      description: 'Antalya\'da günlük ve aylık kiralık daireler. Doğru fiyat, güvenli rezervasyon ve 7/24 destek.',
      canonical: '/'
    });
  }, []);

  // Popüler Daireler carousel'i otomatik kaydırma
  useEffect(() => {
    if (properties.length <= perView) return; // Yeterli öğe yoksa oto-kaydırma gereksiz
    const id = setInterval(() => {
      setCarouselPage((p) => p + 1);
    }, 5000); // 5 saniyede bir kaydır
    return () => clearInterval(id);
  }, [properties.length, perView]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setPerView(getPerView(window.innerWidth));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      const res = await api.get('/properties?featured=true');
      let data = [];

      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (Array.isArray(res.data?.results)) {
        data = res.data.results;
      } else if (Array.isArray(res.data?.properties)) {
        data = res.data.properties;
      }

      setProperties(data.slice(0, 12));
    } catch (error) {
      console.error('Daireler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestReviews = async () => {
    try {
      const res = await api.get('/reviews/latest?limit=10');
      // karıştır ve 5 adet al
      let data = Array.isArray(res.data) ? res.data : [];
      if (!data.length) throw new Error('no-data');
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 10);
      setReviews(shuffled);
    } catch (e) {
      console.warn('API yorumları bulunamadı, örnek yorumlar kullanılacak.');
      const sample = [
        { user:{ name:'Ahmet Yılmaz' }, comment:'Daire tertemizdi, konum olarak da çok iyiydi.' },
        { user:{ name:'Ayşe Demir' }, comment:'İletişim hızlıydı, tekrar tercih edeceğim.' },
        { user:{ name:'Mehmet Kaya' }, comment:'Fiyat-performans harika, tavsiye ederim.' },
        { user:{ name:'Elif Şahin' }, comment:'Fotoğraflardaki gibi, sessiz ve huzurlu bir konaklama oldu.' },
        { user:{ name:'Burak Çetin' }, comment:'Merkeze yakın, ulaşım kolay. Ev sahibi çok ilgiliydi.' },
        { user:{ name:'Zeynep Arslan' }, comment:'Giriş-çıkış süreci sorunsuzdu, çok memnun kaldık.' },
        { user:{ name:'Caner Koç' }, comment:'Temizlik ve düzen harikaydı. Kesinlikle öneririm.' },
        { user:{ name:'Merve Aydın' }, comment:'Aile konaklaması için ideal. Çok rahat ettik.' },
        { user:{ name:'Emre Kurt' }, comment:'Manzara güzeldi, fiyatlar uygun.' },
        { user:{ name:'Seda Karaca' }, comment:'Hızlı dönüş ve güler yüzlü iletişim için teşekkürler.' }
      ];
      setReviews(sample);
    }
  };

  // Yorum metni taşanlarda sadece üç nokta göster
  useEffect(() => {
    const timer = setTimeout(() => {
      const nodes = document.querySelectorAll('.review-card .comment');
      nodes.forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 1) {
          el.classList.add('is-truncated');
        } else {
          el.classList.remove('is-truncated');
        }
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [reviews, reviewsIndex]);

  const handleYorumYap = () => {
    // Ana sayfadaki hızlı yorum için modal aç
    setShowReviewModal(true);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    const name = reviewName.trim();
    const text = reviewText.trim();
    if (!name || !text) {
      alert('Lütfen isim ve yorum alanlarını doldurun.');
      return;
    }

    try {
      // API'ye yorum gönder
      const response = await api.post('/reviews/guest', {
        name: name,
        comment: text,
        rating: 5 // Varsayılan 5 yıldız
      });

      // Başarılı olursa yorumları yeniden yükle
      await fetchLatestReviews();
      
      setShowReviewModal(false);
      setReviewName('');
      setReviewText('');
      
      // Başarı modalını göster
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      alert('Yorum eklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  const toTitleCaseTr = (value) => {
    // Kelimeleri büyük harfe çevirirken boşlukları koru
    return value.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1));
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Antalya'da En İyi Daireler</h1>
            <p className="hero-subtitle">
              Şehrin en güzel bölgelerinde konforlu, temiz ve uygun fiyatlı dairelerimizle 
              unutulmaz bir konaklama deneyimi yaşayın.
            </p>
            <div className="hero-features">
              <div className="hero-feature">
                <FaMapMarkerAlt />
                <span>Antalya </span>
              </div>
              <div className="hero-feature">
                <FaHome />
                <span>1+0 - 4+1 Daireler</span>
              </div>
              <div className="hero-feature">
                <FaCheckCircle />
                <span>Anında Rezervasyon</span>
              </div>
            </div>
            <div className="hero-actions">
              <Link to="/properties" className="btn-hero primary">
                Daireleri Keşfet
              </Link>
              <Link to="/kiralik" className="btn-hero secondary">
                Günlük Kiralık
              </Link>
              <Link to="/satilik" className="btn-hero secondary">
                Satılık
              </Link>
              <Link to="/contact" className="btn-hero secondary">
                İletişime Geç
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="vision-mission" style={{background:'#fff', padding:'60px 0'}}>
        <div className="container">
          <div className="section-header">
            <h2>Vizyon & Misyon</h2>
            <p className="section-subtitle">Her misafirimize güvenli, konforlu ve unutulmaz bir Antalya deneyimi sunmak</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Vizyonumuz</h3>
              <p>{visionMission.vision || "Antalya'da kısa ve uzun dönem konaklamanın güvenilir, ulaşılabilir ve ilk akla gelen platformu olmak. Misafirlerimizin konforunu ve memnuniyetini merkeze alarak; modern tasarımlı, temiz ve denetlenmiş dairelerle kusursuz bir deneyim sunmayı, yerel işletmelerle iş birlikleri kurarak şehrin yaşamına değer katmayı hedefliyoruz."}</p>
            </div>
            <div className="feature-card">
              <h3>Misyonumuz</h3>
              <p>{visionMission.mission || 'Her bütçeye ve ihtiyaca uygun, özenle seçilmiş daireleri şeffaf fiyatlandırma, hızlı iletişim ve güvenli rezervasyon süreçleriyle buluşturmak. Misafirlerimize, girişten çıkışa kadar her adımda yanlarında olduğumuzu hissettiren, beklentileri aşan bir hizmet deneyimi sunmak için çalışıyoruz.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{visionMission.statsHappyGuests || '999+'}</div>
              <div className="stat-label">Mutlu Misafir</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{visionMission.statsAvgRating || '4.8'}</div>
              <div className="stat-label">Ortalama Puan</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{visionMission.statsSupport || '7/24'}</div>
              <div className="stat-label">Destek</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2>Popüler Dairelerimiz</h2>
            <p className="section-subtitle">
              Antalya'nın en gözde bölgelerinde konumlanmış, misafirlerimizin en çok tercih ettiği daireler
            </p>
          </div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {properties.length > 0 ? (
                <>
                  {/* Carousel: 3 kart görünür, oklarla 3'erli kayar */}
                  {(() => {
                    const total = properties.length;
                    if (total === 0) return null;
                    // Tek tek kaydırma: başlangıç indeksi carouselPage
                    const start = ((carouselPage % total) + total) % total;
                    const visible = Array.from({ length: Math.min(perView, total) }, (_, k) => properties[(start + k) % total]).filter(Boolean);
                    return (
                      <div style={{ position:'relative' }}>
                        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(perView, visible.length)}, 1fr)`, gap: '20px' }}>
                          {visible.map(property => (
                            <PropertyCard key={property._id} property={property} />
                          ))}
                        </div>
                        {/* Controls */}
                        {total > 1 && (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={()=> setCarouselPage(p => p - 1)}
                              style={{ position:'absolute', top:'50%', left:-10, transform:'translateY(-50%)', padding:'10px 12px' }}
                              aria-label="Önceki"
                            >
                              ‹
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={()=> setCarouselPage(p => p + 1)}
                              style={{ position:'absolute', top:'50%', right:-10, transform:'translateY(-50%)', padding:'10px 12px' }}
                              aria-label="Sonraki"
                            >
                              ›
                            </button>
                          </>
                        )}
                        <div style={{ textAlign:'center', marginTop:12, color:'#64748b', fontSize:12 }}>
                          {((start + 1 - 1 + total) % total) + 1} / {Math.max(1,total)}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <Link to="/properties" className="btn btn-primary btn-large">
                      Tüm Daireleri Görüntüle
                    </Link>
                  </div>
                </>
              ) : (
                <div className="no-properties">
                  <FaHome style={{ fontSize: '64px', color: '#ccc', marginBottom: '20px' }} />
                  <p style={{ fontSize: '18px', color: '#666' }}>
                    Henüz daire eklenmemiş.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section">
        <div className="container">
          <div className="section-header">
            <h2>Neden Bizi Seçmelisiniz?</h2>
            <p className="section-subtitle">
              Misafirlerimizin memnuniyeti bizim için öncelik. Size en iyi hizmeti sunmak için çalışıyoruz.
            </p>
          </div>
          <div className="features-grid-large">
            <div className="feature-card large">
              <div className="feature-icon">
                <FaCheckCircle />
              </div>
              <h3>Hızlı Rezervasyon</h3>
            </div>
            <div className="feature-card large">
              <div className="feature-icon">
                <FaHome />
              </div>
              <h3>Konforlu ve Temiz Daireler</h3>
            </div>
            <div className="feature-card large">
              <div className="feature-icon">
                <FaMapMarkerAlt />
              </div>
              <h3>Merkezi ve Stratejik Konumlar</h3>
            </div>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaPhoneAlt />
              </div>
              <h3>7/24 Destek Hizmeti</h3>
              {/* metin kaldırıldı */}
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaStar />
              </div>
              <h3>Gerçek Misafir Yorumları</h3>
              {/* metin kaldırıldı */}
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaLock />
              </div>
              <h3>Güvenli ve Şeffaf</h3>
              {/* metin kaldırıldı */}
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaClock />
              </div>
              <h3>Esnek Giriş-Çıkış</h3>
              {/* metin kaldırıldı */}
            </div>
            <div
              className="feature-card feature-card--fast-contact"
            >
              <div className="feature-icon">
                <FaSmile />
              </div>
              <h3>Hızlı İletişim</h3>
              {/* metin kaldırıldı */}
            </div>
          </div>
        </div>
      </section>

  {/* Sık Sorulan Sorular */}
  <section className="faq-section" style={{background:'#f8f9fa', padding:'60px 0'}}>
    <div className="container">
      <div className="section-header">
        <h2>Sık Sorulan Sorular</h2>
        <p className="section-subtitle">Sizin için en çok sorulan soruları derledik</p>
      </div>
      <div className="faq-list" style={{maxWidth: '900px', margin: '0 auto'}}>
        <details className="faq-item" open>
          <summary>Rezervasyon nasıl yapılır?</summary>
          <p>Daireler sayfasından tarih ve kişi sayısını seçin, talep oluşturun. Onay sonrası size dönüş yaparız.</p>
        </details>
        <details className="faq-item">
          <summary>Ödeme nasıl yapılır?</summary>
          <p>Ödemeler daire tesliminde veya ofiste nakit/alternatif yöntemlerle alınır.</p>
        </details>
        <details className="faq-item">
          <summary>İptal ve iade şartları nelerdir?</summary>
          <p>Esnek politikamız gereği girişten 48 saat öncesine kadar ücretsiz iptal mümkündür.</p>
        </details>
        <details className="faq-item">
          <summary>Erken giriş/Geç çıkış mümkün mü?</summary>
          <p>Müsaitlik durumuna göre memnuniyetle yardımcı oluruz. Lütfen talep oluştururken belirtin.</p>
        </details>
      </div>
    </div>
  </section>

  {/* Yorumlar (FAQ altı) */}
  <section className="reviews-section">
    <div className="container">
      <div className="section-header" style={{marginBottom:20}}>
        <h2>Misafir Yorumları</h2>
        <p className="section-subtitle">Gerçek konuklarımızın deneyimlerinden seçtiklerimiz</p>
      </div>

      {reviews.length > 0 && (
        <div style={{ position:'relative' }}>
          {(() => {
            const computePerView = () => {
              if (typeof window === 'undefined' || !window.matchMedia) return 3;
              if (window.matchMedia('(max-width: 640px)').matches) return 1;
              if (window.matchMedia('(max-width: 900px)').matches) return 2;
              return 3;
            };
            const items = reviews;
            const perView = Math.min(computePerView(), items.length || 1);
            const start = ((reviewsIndex % items.length) + items.length) % items.length;
            const visible = Array(Math.min(perView, items.length)).fill(0).map((_,i)=> items[(start+i)%items.length]);
            return (
              <div className="reviews-grid">
                {visible.map((r, idx) => (
                  <div className="review-card" key={idx}>
                    <div className="review-header">
                      <div className="review-user-only">{r?.user?.name || 'Misafir'}</div>
                    </div>
                    <div className="comment">{r?.comment || 'Yorum yok'}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          {(() => { 
            const computePerView = () => {
              if (typeof window === 'undefined' || !window.matchMedia) return 3;
              if (window.matchMedia('(max-width: 640px)').matches) return 1;
              if (window.matchMedia('(max-width: 900px)').matches) return 2;
              return 3;
            };
            const step = Math.max(1, Math.min(computePerView(), reviews.length || 1));
            return (
            <>
              <button className="reviews-nav prev" onClick={()=> setReviewsIndex(i=> i-step)} aria-label="Önceki">‹</button>
              <button className="reviews-nav next" onClick={()=> setReviewsIndex(i=> i+step)} aria-label="Sonraki">›</button>
            </>
          ); })()}
        </div>
      )}

      <div style={{textAlign:'center', marginTop:24}}>
        <button className="btn btn-primary" onClick={handleYorumYap}>Yorum Yap</button>
      </div>
    </div>
  </section>

  {/* Yorum Yap Modal */}
  {showReviewModal && (
    <div className="modal-overlay" onClick={()=> setShowReviewModal(false)} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200}}>
      <div className="modal" onClick={(e)=> e.stopPropagation()} style={{background: '#fff', borderRadius: '12px', padding: '20px', width: '800px', height: 'auto', maxWidth: '800px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'}}>
        <h3 style={{margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600}}>Yorum Yap</h3>
        <form onSubmit={submitReview} className="review-form" style={{width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div className="form-row" style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px'}}>
            <label style={{fontSize: '15px', fontWeight: 500}}>Ad Soyad</label>
            <input type="text" value={reviewName} onChange={(e)=> setReviewName(toTitleCaseTr(e.target.value))} placeholder="Adınız Soyadınız" style={{height: '40px', padding: '8px 12px', fontSize: '15px', border: '1px solid #e6e8ee', borderRadius: '6px', width: '100%', boxSizing: 'border-box'}} />
          </div>
          <div className="form-row" style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', flex: 1, minHeight: 0}}>
            <label style={{fontSize: '15px', fontWeight: 500}}>Yorum</label>
            <textarea rows="3" value={reviewText} onChange={(e)=> setReviewText(e.target.value)} placeholder="Deneyiminizi paylaşın" style={{flex: 1, padding: '8px 12px', fontSize: '15px', border: '1px solid #e6e8ee', borderRadius: '6px', width: '100%', boxSizing: 'border-box', resize: 'none', minHeight: 0}} />
          </div>
          <div className="modal-actions" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '12px', width: '100%'}}>
            <button type="button" className="btn btn-secondary" onClick={()=> setShowReviewModal(false)} style={{padding: '10px 20px', fontSize: '15px', margin: 0}}>İptal</button>
            <button type="submit" className="btn btn-primary" style={{padding: '10px 20px', fontSize: '15px', margin: 0}}>Gönder</button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Başarı Modalı */}
  {showSuccessModal && (
    <div className="modal-overlay" onClick={()=> setShowSuccessModal(false)} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300}}>
      <div className="modal success-modal" onClick={(e)=> e.stopPropagation()} style={{background: '#fff', borderRadius: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'}}>
        <p style={{
          fontSize: '14px',
          color: '#333',
          lineHeight: '1.4',
          fontWeight: 500
        }}>Yorumunuz başarıyla eklendi!</p>
        <div className="modal-actions">
          <button 
            type="button"
            className="btn btn-primary"
            onClick={()=> setShowSuccessModal(false)}
            style={{fontSize: '13px', margin: 0}}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  )}

      {/* Process Section */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <h2>Rezervasyon Nasıl Yapılır?</h2>
            <p className="section-subtitle">Sadece 3 basit adımda daireniz hazır</p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Daire Seçin</h3>
              <p>Size en uygun daireyi bulun. Özelliklerini, fiyatını ve konumunu inceleyin.</p>
            </div>
            <div className="process-arrow">→</div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Rezervasyon Talebi Oluşturun</h3>
              <p>Tarihlerinizi ve misafir sayınızı seçin, iletişim bilgilerinizi girin ve talebinizi gönderin.</p>
            </div>
            <div className="process-arrow">→</div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Onay Alın ve Keyfini Çıkarın</h3>
              <p>Talebiniz onaylandıktan sonra size bilgi verilir. Ödeme teslimatta/ofiste yapılır.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Hemen Rezervasyon Yapın</h2>
            <p>Size en uygun daireyi bulun ve unutulmaz bir Antalya deneyimi yaşayın</p>
            <div className="cta-buttons">
              <Link to="/properties" className="btn btn-hero">
                Daireleri İncele
              </Link>
              <Link to="/contact" className="btn btn-hero-outline">
                Bize Ulaşın
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-content">
            <h3>Güvenle Rezervasyon Yapın</h3>
            <div className="trust-items">
              <div className="trust-item">
              <FaLock />
              <span>Güvenli Rezervasyon</span>
              </div>
              <div className="trust-item">
                <FaCheckCircle />
                <span>Anında Onay</span>
              </div>
              <div className="trust-item">
                <FaPhoneAlt />
                <span>7/24 Destek</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
