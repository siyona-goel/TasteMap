from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from overpass import fetch_places, tags_to_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/places")
def get_places(lat: float, lon: float, radius: int = 3000):
    places = fetch_places(lat, lon, radius)
    return [
        {
            "id": p["id"],
            "lat": p["lat"],
            "lon": p["lon"],
            "name": p["tags"].get("name"),
            "tags": p["tags"],
            "description": tags_to_text(p["tags"]),
        }
        for p in places
        if "lat" in p and "lon" in p
    ]
