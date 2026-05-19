import numpy as np


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    # Both already normalized, so dot product = cosine similarity
    return float(np.dot(a, b))


def score_places(user_embedding: list, places: list) -> list:
    """
    places: list of dicts with 'embedding' field
    Returns same list sorted by score descending, with 'score' added
    """
    for place in places:
        place["score"] = cosine_similarity(user_embedding, place["embedding"])
    return sorted(places, key=lambda p: p["score"], reverse=True)
