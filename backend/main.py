from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from embeddings import embed
from llm import extract_profile
from overpass import fetch_places, tags_to_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProfileRequest(BaseModel):
    text: str


@app.post("/profile")
def create_profile(req: ProfileRequest):
    try:
        profile = extract_profile(req.text)
        profile_embedding = embed(profile["summary"])
    except (KeyError, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "profile": profile,
        "embedding": profile_embedding,
    }


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
