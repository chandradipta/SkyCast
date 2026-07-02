from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from cachetools import TTLCache, cached
from typing import Optional

app = FastAPI(title="Weatherly API")

# Allow local dev front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caches
geocode_cache = TTLCache(maxsize=1000, ttl=3600)   # 1 hour
weather_cache = TTLCache(maxsize=2000, ttl=300)    # 5 minutes

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

async def _http_get_json(url: str, params: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()

@cached(geocode_cache)
def _geocode_sync(query: str, count: int = 5):
    # cachetools does not support async decorated funcs easily, so keep sync wrapper for cache
    params = {"name": query, "count": count, "language": "en", "format": "json"}
    # Use httpx sync client here
    with httpx.Client(timeout=10) as client:
        r = client.get(GEOCODE_URL, params=params)
        r.raise_for_status()
        return r.json()

@app.get("/api/search")
async def search_locations(query: str = Query(..., min_length=1, max_length=80)):
    """Return up to 5 geocoding matches for the query (cached)."""
    try:
        data = _geocode_sync(query, count=5)
        results = []
        for item in data.get("results", [])[:5]:
            results.append({
                "name": item.get("name"),
                "admin1": item.get("admin1"),
                "country": item.get("country"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "timezone": item.get("timezone")
            })
        return {"results": results}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Geocoding error: {str(e)}")

def _weather_cache_key(lat: float, lon: float, units: str):
    return f"{lat:.4f}:{lon:.4f}:{units}"

@app.get("/api/weather")
async def get_weather(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city: Optional[str] = None,
    units: str = "metric"
):
    """
    Get consolidated weather for coordinates OR a city (first geocode match).
    Returns current weather and hourly temperature + humidity arrays (timezone auto).
    """
    if city and (not lat or not lon):
        geo = _geocode_sync(city, count=1)
        if not geo.get("results"):
            raise HTTPException(status_code=404, detail="City not found")
        first = geo["results"][0]
        lat = first["latitude"]
        lon = first["longitude"]

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Provide lat & lon or city")

    cache_key = _weather_cache_key(lat, lon, units)
    if cache_key in weather_cache:
        return weather_cache[cache_key]

    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true",
        "hourly": "temperature_2m,relativehumidity_2m",
        "timezone": "auto"
    }
    try:
        data = await _http_get_json(WEATHER_URL, params=params)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather API error: {str(e)}")

    # Convert units if requested (Open-Meteo returns °C and m/s). For 'imperial' convert temp->°F and wind->mph client-side if desired.
    response = {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "timezone": data.get("timezone"),
        "current_weather": data.get("current_weather"),
        "hourly": data.get("hourly")
    }
    weather_cache[cache_key] = response
    return response