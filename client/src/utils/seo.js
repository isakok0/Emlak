export function setTitle(title) {
  try { document.title = title; } catch(_) {}
}

export function setMeta(name, content) {
  try {
    let m = document.querySelector(`meta[name="${name}"]`);
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
    m.setAttribute('content', content);
  } catch(_) {}
}

export function setCanonical(path) {
  try {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.setAttribute('rel','canonical'); document.head.appendChild(link); }
    const base = window.location.origin;
    link.setAttribute('href', `${base}${path}`);
  } catch(_) {}
}

export function addJSONLD(id, obj) {
  try {
    const ex = document.querySelector(`script[data-ld="${id}"]`);
    if (ex) ex.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.ld = id;
    s.text = JSON.stringify(obj);
    document.head.appendChild(s);
  } catch(_) {}
}

export function setSEO({ title, description, canonical }) {
  if (title) setTitle(title);
  if (description) setMeta('description', description);
  if (canonical) setCanonical(canonical);
}


