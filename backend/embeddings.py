from sentence_transformers import SentenceTransformer

# Load once at module level — don't reload on every request
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed(text: str) -> list[float]:
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    vecs = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return vecs.tolist()
