import { useEffect } from 'react';

const ChatWidget = () => {
  useEffect(() => {
    const tawkId = process.env.REACT_APP_TAWK_ID;
    if (!tawkId) return;
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://embed.tawk.to/${tawkId}`;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.body.appendChild(s1);
    return () => { document.body.removeChild(s1); };
  }, []);
  return null;
};

export default ChatWidget;


