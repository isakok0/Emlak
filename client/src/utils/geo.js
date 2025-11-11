export function haversineDistanceKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const LANDMARKS_ANTALYA = [
  { name: 'Konyaaltı Plajı', lat: 36.8610, lng: 30.6377 },
  { name: 'Kaleiçi (Old Town)', lat: 36.8851, lng: 30.7075 },
  { name: 'Antalya Havalimanı (AYT)', lat: 36.9000, lng: 30.8000 }
];


