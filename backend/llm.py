import hashlib
import json
import logging
import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv

from overpass import tags_to_text

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "300"))

DESCRIPTIONS_CACHE_DIR = Path(__file__).resolve().parent / "cache" / "descriptions"
ENRICH_MIN_WORDS = 20

PROFILE_PROMPT = """
You are helping build a personal taste profile for a travel/exploration app.

The user answered questions about what they enjoy when visiting places.
Extract a structured JSON profile from their answers.

Return ONLY valid JSON with these fields:
{{
  "vibes": [list of 3-6 atmosphere words],
  "activities": [list of things they enjoy],
  "avoid": [list of things they dislike or avoid],
  "energy": "low" or "medium" or "high",
  "social": "solo" or "small group" or "large group",
  "price": "budget" or "mid" or "upscale",
  "time_of_day": [list of preferred times],
  "summary": "2-3 sentence plain English description of their taste"
}}

User's answers:
__USER_ANSWERS__
"""


def _chat(prompt: str, *, json_mode: bool = False, max_tokens: int = 800) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"num_predict": max_tokens},
    }
    if json_mode:
        payload["format"] = "json"

    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(
            f"Ollama request failed ({OLLAMA_BASE_URL}). "
            f"Is Ollama running with `{OLLAMA_MODEL}` pulled?"
        ) from exc

    data = resp.json()
    content = data.get("message", {}).get("content", "").strip()
    if not content:
        raise RuntimeError("Ollama returned an empty response.")
    return content


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
    if not text.startswith("{"):
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)
    text = re.sub(r",\s*}", "}", text)
    text = re.sub(r",\s*]", "]", text)
    return json.loads(text)


def _normalize_profile(profile: dict) -> dict:
    """Ensure required fields exist even when the model omits or renames keys."""
    normalized = dict(profile)
    if not normalized.get("summary"):
        for key, value in profile.items():
            if key.lower() == "summary" and value:
                normalized["summary"] = value
                break
    if not normalized.get("summary"):
        vibes = normalized.get("vibes") or []
        activities = normalized.get("activities") or []
        avoid = normalized.get("avoid") or []
        energy = normalized.get("energy", "medium")
        parts = []
        if vibes:
            parts.append(f"Drawn to {', '.join(vibes)} atmospheres.")
        if activities:
            parts.append(f"Enjoys {', '.join(activities)}.")
        if avoid:
            parts.append(f"Avoids {', '.join(avoid)}.")
        parts.append(f"Prefers {energy} energy outings.")
        normalized["summary"] = " ".join(parts) or "Curious urban explorer with varied tastes."
    return normalized


def extract_profile(answers_text: str) -> dict:
    prompt = PROFILE_PROMPT.replace("__USER_ANSWERS__", answers_text)
    last_error = None

    for attempt in range(2):
        try:
            raw = _chat(prompt, json_mode=True, max_tokens=1200)
            profile = _normalize_profile(_parse_json(raw))
            logger.info("Profile extracted on attempt %s", attempt + 1)
            return profile
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            logger.warning("Profile JSON parse failed (attempt %s): %s", attempt + 1, exc)

    raise ValueError(
        f"Could not parse profile JSON from Ollama after 2 attempts: {last_error}"
    )


def enrich_place_description(tags: dict, place_id: int | None = None) -> str:
    """
    Takes sparse OSM tags and returns a rich natural language description.
    Only call this if tags_to_text() produces fewer than 20 words — otherwise
    this returns tags_to_text(tags) without calling the LLM.

    Results are cached under cache/descriptions/{place_id}.txt when place_id
    is set (OSM element id); otherwise a hash of the tags is used as the filename.
    """
    sparse = len(tags_to_text(tags).split()) < ENRICH_MIN_WORDS
    if not sparse:
        return tags_to_text(tags)

    cache_key = str(place_id) if place_id is not None else hashlib.md5(
        json.dumps(sorted(tags.items()), sort_keys=True).encode()
    ).hexdigest()
    cache_path = DESCRIPTIONS_CACHE_DIR / f"{cache_key}.txt"

    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8").strip()

    tags_str = ", ".join(f"{k}={v}" for k, v in sorted(tags.items()))
    prompt = f"""
These are OpenStreetMap tags for a place: {tags_str}

Write 2-3 sentences describing the vibe, atmosphere, and type of
person who would enjoy this place. Be specific and evocative.
Return only the description, no preamble.
""".strip()
    text = _chat(prompt, max_tokens=100)

    DESCRIPTIONS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(text, encoding="utf-8")

    return text


def generate_match_reason(profile_summary: str, place_description: str) -> str:
    """
    Generate a one-line human reason why this place matches this user.
    Call this lazily (only when user clicks a marker) to save API calls.
    """
    prompt = f"""
User taste: {profile_summary}
Place: {place_description}

Write one short sentence (max 15 words) explaining why this place
matches this user's taste. Start with "Matches your..." or "Great for...".
Return only the sentence, no quotes.
""".strip()
    return _chat(prompt, max_tokens=80)
