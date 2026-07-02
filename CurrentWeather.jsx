import React from "react";

function weatherCodeToText(code){
  const m = {
    0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',
    51:'Drizzle',53:'Drizzle',55:'Drizzle',61:'Rain',63:'Rain',65:'Heavy rain',
    71:'Snow',73:'Snow',75:'Snow',95:'Thunderstorm',99:'Hail'
  };
  return m[code] || `Code ${code}`;
}

function formatTime(t, tz){
  try{
    return new Date(t).toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short', timeZone:tz});
  } catch {
    return t;
  }
}

export default function CurrentWeather({ data, place, units }){
  const c = data.current_weather;
  const timezone = data.timezone;
  // Find humidity for current hour if available
  let humidity = null;
  try {
    if (data.hourly && data.hourly.time && data.hourly.relativehumidity_2m) {
      const times = data.hourly.time.map(t => new Date(t));
      const now = new Date(c.time);
      // find nearest index
      let idx = times.findIndex(t => t.getTime() === now.getTime());
      if (idx === -1) {
        // fallback: closest
        let best = 0, bestdiff = Infinity;
        times.forEach((t,i) => {
          const d = Math.abs(t - now);
          if (d < bestdiff){ best = i; bestdiff = d; }
        });
        idx = best;
      }
      humidity = data.hourly.relativehumidity_2m[idx];
    }
  } catch(e){ /* ignore */ }

  // Convert units if imperial requested (Open-Meteo returns °C and m/s)
  let temp = c.temperature;
  let wind = c.windspeed;
  let tempLabel = "°C";
  let windLabel = "m/s";
  if (units === "imperial") {
    temp = (temp * 9/5) + 32;
    wind = wind * 2.23694; // m/s -> mph
    tempLabel = "°F";
    windLabel = "mph";
  }

  return (
    <div>
      <div className="current-top">
        <div>
          <div className="place">{place}</div>
          <div className="small">{formatTime(c.time, timezone)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div className="temp">{temp.toFixed(1)}{tempLabel}</div>
          <div className="small">{weatherCodeToText(c.weathercode)}</div>
        </div>
      </div>

      <div style={{marginTop:12}} className="row">
        <div>
          <div className="small">Wind</div>
          <div>{wind.toFixed(1)} {windLabel}</div>
        </div>
        <div>
          <div className="small">Direction</div>
          <div>{c.winddirection}°</div>
        </div>
        <div>
          <div className="small">Humidity</div>
          <div>{humidity != null ? `${Math.round(humidity)}%` : "—"}</div>
        </div>
      </div>
    </div>
  );
}