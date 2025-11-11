import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  useEffect(() => {
    document.body.classList.add('no-footer');
    return () => document.body.classList.remove('no-footer');
  }, []);

  return (
    <div className="container" style={{padding:'80px 0', textAlign:'center'}}>
      <h1>404</h1>
      <p>Aradığınız sayfa bulunamadı.</p>
      <Link to="/" className="btn btn-primary">Ana Sayfaya Dön</Link>
    </div>
  );
};

export default NotFound;


