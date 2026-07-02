// Simple Weather Dashboard using Open-Meteo (no API key)
// - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}
// - Weather: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=temperature_2m&timezone=auto

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const messageEl = document.getElementById('message');

const currentSection = document.getElementById('current');
const placeEl = document.getElementById('place');
const tempEl = document.getElementById('temp');
const windEl = document.getElementById('wind');
const conditionsEl = document.getElementById('conditions');
const timeEl = document.getElementById('time');

const forecastSection = document.getElementById('forecast');
const ctx = document.getElementById('tempChart').getContext('2d');
let chart = null;

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  messageEl.textContent = '';
  await searchAndRender(city);
});

async function searchAndRender(city) {
  try {
    showMessage('Searching for city...');
    const geo = await geocodeCity(city);
    if (!geo) {
      showError('City not found. Try a different name.');
      return;
    }
    showMessage('Fetching weather for ' + geo.name + '...');
    const weather = await fetchWeather(geo.latitude, geo.longitude);
    renderCurrent(geo, weather);
    renderForecast(weather);
    showMessage('');
  } catch (err) {
    console.error(err);
    showError('Error fetching data. Check console for details.');
  }
}

function showMessage(m) {
  messageEl.textContent = m;
}

function showError(m) {
  messageEl.textContent = m;
}

// Geocoding (returns the first match or null)
async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone
  };
}

// Fetch weather (current + hourly temps)
async function fetchWeather(lat, lon) {
  // We'll request hourly temperature and the current weather
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: 'true',
    hourly: 'temperature_2m',
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

function renderCurrent(geo, data) {
  currentSection.classList.remove('hidden');
  placeEl.textContent = geo.name;
  if (data.current_weather) {
    const c = data.current_weather;
    tempEl.textContent = `${c.temperature.toFixed(1)} °C`;
    windEl.textContent = `${c.windspeed} m/s (dir ${c.winddirection}°)`;
    // Open-Meteo uses weathercode integers. Map some common codes to text.
    conditionsEl.textContent = mapWeatherCode(c.weathercode);
    timeEl.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: data.timezone || geo.timezone
    }).format(new Date(c.time));
  } else {
    tempEl.textContent = '— °C';
    windEl.textContent = '—';
    conditionsEl.textContent = '—';
    timeEl.textContent = '—';
  }
}

function renderForecast(data) {
  forecastSection.classList.remove('hidden');
  // Use hourly.temperature_2m and hourly.time
  const hourly = data.hourly;
  if (!hourly || !hourly.time) {
    showError('No hourly forecast available.');
    return;
  }
  // Build next 24 data points from now
  const now = new Date();
  const times = hourly.time.map(t => new Date(t));
  const temps = hourly.temperature_2m;

  // Find index of first time >= now
  let startIdx = times.findIndex(t => t.getTime() >= now.getTime());
  if (startIdx === -1) startIdx = Math.max(0, times.length - 24);
  const endIdx = Math.min(times.length, startIdx + 24);

  const labels = times.slice(startIdx, endIdx).map(d => d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
  const dataSet = temps.slice(startIdx, endIdx);

  // Create or update Chart.js line chart
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = dataSet;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Temperature (°C)',
          data: dataSet,
          borderColor: '#2b7cff',
          backgroundColor: 'rgba(43,124,255,0.12)',
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  }
}

// Map Open-Meteo weather codes to simple text (partial list)
function mapWeatherCode(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Drizzle: light',
    53: 'Drizzle: moderate',
    55: 'Drizzle: dense',
    61: 'Rain: slight',
    63: 'Rain: moderate',
    65: 'Rain: heavy',
    71: 'Snow fall: slight',
    73: 'Snow fall: moderate',
    75: 'Snow fall: heavy',
    95: 'Thunderstorm',
    99: 'Hail'
  };
  return map[code] || `Code ${code}`;
}

// Optional: quick demo search
if (!location.search.includes('no-demo')) {
  // prefill with a city for quick demo
  cityInput.value = 'New York';
  // start an initial search on load
  window.addEventListener('load', () => {
    // small delay to allow page to render
    setTimeout(() => {
      form.dispatchEvent(new Event('submit', {cancelable: true}));
    }, 400);
  });
}