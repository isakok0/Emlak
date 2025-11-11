const FB_PIXEL_ID = process.env.REACT_APP_FB_PIXEL_ID || '';
const GOOGLE_TAG_ID = process.env.REACT_APP_GOOGLE_TAG_ID || '';

let facebookInitialized = false;
let googleTagInitialized = false;

const isBrowser = () => typeof window !== 'undefined';

export const initFacebookPixel = () => {
  if (!isBrowser() || facebookInitialized || !FB_PIXEL_ID) return;
  if (window.fbq) {
    facebookInitialized = true;
    return;
  }

  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');
  facebookInitialized = true;
};

export const trackFacebookPageView = () => {
  if (!isBrowser() || !FB_PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'PageView');
};

export const initGoogleTag = () => {
  if (!isBrowser() || googleTagInitialized || !GOOGLE_TAG_ID) return;

  if (!document.getElementById('gtag-script')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`;
    script.id = 'gtag-script';
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_TAG_ID, {
    anonymize_ip: true,
    send_page_view: false
  });
  googleTagInitialized = true;
};

export const trackGooglePageView = (path) => {
  if (!isBrowser() || !GOOGLE_TAG_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path
  });
};

export const initTracking = () => {
  initFacebookPixel();
  initGoogleTag();
};

export const trackPageView = (path) => {
  trackFacebookPageView();
  trackGooglePageView(path);
};

export const getTrackingConfig = () => ({
  facebookPixelId: FB_PIXEL_ID,
  googleTagId: GOOGLE_TAG_ID
});


