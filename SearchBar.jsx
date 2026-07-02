import React, { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function SearchBar({ onSelect, loading }){
  const [q, setQ] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  function doSuggest(value){
    if (!value) { setSuggests([]); return; }
    // debounce
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?query=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggests(data.results || []);
        setOpen(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);
  }

  function onChange(e){
    setQ(e.target.value);
    doSuggest(e.target.value);
  }

  function choose(item){
    setQ(item.name + (item.admin1 ? `, ${item.admin1}` : "") + (item.country ? `, ${item.country}` : ""));
    setOpen(false);
    setSuggests([]);
    if (onSelect) onSelect(item);
  }

  return (
    <div style={{position:"relative", minWidth:260}}>
      <div className="search">
        <input className="input" value={q} onChange={onChange} placeholder="Search city, e.g. London" />
        <button className="button" onClick={() => {
          // If an exact suggestion exists, pick first; otherwise attempt a direct search
          if (suggests.length) return choose(suggests[0]);
          // fallback: call /api/search once and pick top result
          (async () => {
            try {
              const res = await fetch(`${API_BASE}/api/search?query=${encodeURIComponent(q)}`);
              const data = await res.json();
              if (data.results?.length) choose(data.results[0]);
            } catch (e) { console.error(e); }
          })();
        }}>{loading ? "…" : "Search"}</button>
      </div>

      {open && suggests.length > 0 && (
        <div style={{
          position:"absolute",
          top:44,
          left:0,
          right:0,
          background:"white",
          borderRadius:8,
          boxShadow:"0 6px 18px rgba(12,36,54,0.08)",
          zIndex:40,
          maxHeight:220,
          overflow:"auto"
        }}>
          {suggests.map((s, i) => (
            <div key={i} onClick={() => choose(s)} style={{padding:10, cursor:"pointer", borderBottom: "1px solid rgba(13,36,54,0.04)"}}>
              <div style={{fontWeight:700}}>{s.name}{s.admin1 ? `, ${s.admin1}` : ""}</div>
              <div className="small">{s.country} — {s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}