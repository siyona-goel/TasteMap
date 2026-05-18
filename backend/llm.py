import json
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

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
{answers}
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
            timeout=120,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(
            f"Ollama request failed ({OLLAMA_BASE_URL}). "
            f"Is Ollama running with `{OLLAMA_MODEL}` pulled?"
        ) from exc

    data = resp.json()
    return data["message"]["content"].strip()


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    # If the model adds prose around JSON, grab the outermost object.
    if not text.startswith("{"):
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)
    return json.loads(text)


def extract_profile(answers_text: str) -> dict:
    prompt = PROFILE_PROMPT.format(answers=answers_text)
    raw = _chat(prompt, json_mode=True)
    return _parse_json(raw)


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
