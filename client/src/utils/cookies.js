// Simple cookie helpers and consent schema

export const COOKIE_CONSENT_NAME = 'cookie_consent_v1';
export const COOKIE_MAX_AGE_DAYS = 180; // 6 months

export function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

export function getCookie(name) {
  const cname = `${name}=`;
  const decodedCookie = decodeURIComponent(document.cookie || '');
  const parts = decodedCookie.split(';');
  for (let i = 0; i < parts.length; i++) {
    let c = parts[i];
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(cname) === 0) {
      return c.substring(cname.length, c.length);
    }
  }
  return null;
}

export function eraseCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function getStoredConsent() {
  try {
    const raw = getCookie(COOKIE_CONSENT_NAME);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function storeConsent(preferences) {
  const value = JSON.stringify(preferences);
  setCookie(COOKIE_CONSENT_NAME, value, COOKIE_MAX_AGE_DAYS);
}

export function defaultConsent() {
  return {
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    timestamp: Date.now(),
  };
}



