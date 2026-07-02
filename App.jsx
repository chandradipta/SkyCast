import React, { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar";
import CurrentWeather from "./components/CurrentWeather";
import HourlyChart from "./components/HourlyChart";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App(){
  const [weather, setWeather] = useState(null);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState(localStorage.getItem("units") || "metric");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("units", units);
  }, [units]);

  async function fetchByCoords(lat, lon, name){
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lon=${lon}&units=${units}`);
      if (!res.ok) throw new Error("Failed to get weather");
      const data = await res.json();
      setWeather(data);
      setPlace(name || `${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`);
    } catch (e) {
      console.error(e);
      setError("Could not fetch weather. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onSearchSelect(item){
    // item: { name, latitude, longitude }
    await fetchByCoords(item.latitude, item.longitude, `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}${item.country ? ', ' + item.country : ''}`);
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">Weatherly</div>
          <div className="small">Clean, fast weather with good UX — powered by Open‑Meteo</div>
        </div>

        <div className="controls">
          <div style={{marginRight:8}}>
            <label className="small" style={{display:"block", textAlign:"right", marginBottom:4}}>Units</label>
            <select value={units} onChange={e => setUnits(e.target.value)} style={{padding:8, borderRadius:8}}>
              <option value="metric">Metric (°C, m/s)</option>
              <option value="imperial">Imperial (°F, mph)</option>
            </select>
          </div>
          <SearchBar onSelect={onSearchSelect} loading={loading} />
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            {loading && <div className="small">Loading…</div>}
            {error && <div style={{color:"#b02a37", fontWeight:700}}>{error}</div>}
            {!weather && !loading && <div className="small">Search for a city to view weather.</div>}
            {weather && <CurrentWeather data={weather} place={place} units={units} />}
          </div>

          {weather && (
            <div className="card" style={{marginTop:12}}>
              <h4 style={{margin:0}}>24‑Hour Forecast</h4>
              <div className="chart-wrap">
                <HourlyChart weather={weather} units={units} />
              </div>
            </div>
          )}
        </div>

        <aside>
          <div className="card">
            <h4 style={{marginTop:0}}>Details</h4>
            <div className="row">
              <div className="small">Timezone</div>
              <div>{weather?.timezone || "—"}</div>
            </div>
            <div className="row">
              <div className="small">Coordinates</div>
              <div>{weather ? `${weather.latitude.toFixed(3)}, ${weather.longitude.toFixed(3)}` : "—"}</div>
            </div>
            <div className="row">
              <div className="small">Data provider</div>
              <div>Open‑Meteo</div>
            </div>
            <div style={{marginTop:10}} className="small">
              Tip: allow location on your device and I can prefill your coordinates (ask me to add that).
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}