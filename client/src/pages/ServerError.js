import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const codeToTitle = (code) => {
  if (code === '500') return 'Sunucu Hatası';
  if (code === '503') return 'Geçici Hizmet Kesintisi';
  if (code === 'offline') return 'Bağlantı Sorunu';
  return 'Bir şeyler ters gitti';
};

const codeToMessage = (code) => {
  if (code === '500') return 'Şu anda isteğinizi işlerken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.';
  if (code === '503') return 'Sistem kısa bir bakımda olabilir. Birazdan tekrar deneyebilirsiniz.';
  if (code === 'offline') return 'İnternet bağlantınızda bir sorun olabilir. Bağlantınızı kontrol edip tekrar deneyin.';
  return 'Beklenmeyen bir hata oluştu. Birazdan tekrar deneyebilir veya ana sayfaya dönebilirsiniz.';
};

const ServerError = () => {
  const [params] = useSearchParams();
  const code = params.get('code') || '500';

  useEffect(() => {
    document.body.classList.add('no-footer');
    return () => document.body.classList.remove('no-footer');
  }, []);

  return (
    <div className="container" style={{padding:'80px 0', textAlign:'center'}}>
      <h1 style={{fontSize: '64px', margin:0}}>{code}</h1>
      <h2 style={{marginTop:10}}>{codeToTitle(code)}</h2>
      <p style={{color:'#475569', maxWidth:600, margin:'10px auto 24px'}}>{codeToMessage(code)}</p>
      <div style={{display:'flex', gap:12, justifyContent:'center'}}>
        <button className="btn btn-secondary" onClick={()=>window.location.reload()}>Sayfayı Yenile</button>
        <Link className="btn btn-primary" to="/">Ana Sayfaya Dön</Link>
      </div>
    </div>
  );
};

export default ServerError;


