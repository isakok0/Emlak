import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Compare = () => {
  const [items, setItems] = useState([]);

  useEffect(()=>{
    (async()=>{
      const ids = JSON.parse(localStorage.getItem('favorites') || '[]').slice(0,4);
      const responses = await Promise.all(ids.map(id=>api.get(`/properties/${id}`).then(r=>r.data).catch(()=>null)));
      setItems(responses.filter(Boolean));
    })();
  },[]);

  if (items.length === 0) return <div className="container" style={{padding:'40px 0'}}><p>Karşılaştırmak için favorilere ekleyin.</p></div>;

  return (
    <div className="container" style={{padding:'40px 0'}}>
      <h1>Karşılaştırma</h1>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${items.length}, 1fr)`, gap:16}}>
        {items.map(it => (
          <div key={it._id} className="card">
            <h3>{it.title}</h3>
            <p>{it.propertyType} • {it.size} m² • {it.bedrooms}+{it.bathrooms}</p>
            <p>₺{it.pricing?.daily}/gece</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Compare;


