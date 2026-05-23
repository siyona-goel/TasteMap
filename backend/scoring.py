import numpy as np

LEARNING_RATE = 0.3


def normalize_vector(vec: list[float]) -> list[float]:
    arr = np.array(vec, dtype=float)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return arr.tolist()
    return (arr / norm).tolist()


def update_embedding_from_feedback(
    user_embedding: list[float],
    place_embedding: list[float],
    thumbs_up: bool,
) -> list[float]:
    u = np.array(user_embedding, dtype=float)
    p = np.array(place_embedding, dtype=float)
    if thumbs_up:
        updated = u + LEARNING_RATE * p
    else:
        updated = u - LEARNING_RATE * p
    return normalize_vector(updated.tolist())


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
