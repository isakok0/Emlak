export async function fetchCurrentWeather(lat, lon) {
  const key = process.env.REACT_APP_OPENWEATHER_KEY;
  if (!key) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=tr`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}


