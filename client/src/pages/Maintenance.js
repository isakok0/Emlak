import React from 'react';

const renderMessage = (text) => {
  const safe = (text || '').trim();
  if (!safe) return 'Sitemiz şu anda bakım çalışması nedeniyle geçici olarak hizmet verememektedir. Lütfen daha sonra tekrar deneyiniz.';
  // İçeriğe göre şekil alması için satır sonlarını koru
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>{safe}</span>
  );
};

const Maintenance = ({ message, email = 'info@example.com', phone = '+90 555 555 55 55', address = 'Atatürk Cad. No:123, Muratpaşa, Antalya' }) => {
  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', background:'#f7f8fa'}}>
      <div style={{maxWidth:720, width:'100%', textAlign:'center', background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'28px', boxShadow:'0 8px 24px rgba(0,0,0,0.06)'}}>
        <h2 style={{margin:'0 0 10px 0', fontSize:28, color:'#111827'}}>Sitemiz Bakımda</h2>
        <div style={{color:'#4b5563', lineHeight:1.8, fontSize:16, margin:'6px 0 18px 0'}}>
          {renderMessage(message)}
        </div>
        <div style={{display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap'}}>
          <a className="btn btn-primary" href={`mailto:${email}`} style={{minWidth:140}}>E-posta Gönder</a>
          <a className="btn btn-secondary" href={`tel:${phone.replace(/\s|-/g,'')}`} style={{minWidth:120}}>Ara</a>
          <a className="btn btn-primary" href={`https://wa.me/${phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{minWidth:120}}>WhatsApp</a>
        </div>
        <div style={{marginTop:18, fontSize:14, color:'#6b7280'}}>
          <div>{address}</div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;


