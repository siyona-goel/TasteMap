import logging
import os
import time

import numpy as np
import requests

logger = logging.getLogger(__name__)

# "api" = Hugging Face Inference (no local model RAM). "local" = lazy ONNX via fastembed.
EMBEDDING_BACKEND = os.getenv("EMBEDDING_BACKEND", "api").lower()
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
HF_INFERENCE_URL = os.getenv(
    "HF_INFERENCE_URL",
    "https://router.huggingface.co/hf-inference/models/"
    f"{EMBEDDING_MODEL}/pipeline/feature-extraction",
)
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_TIMEOUT = int(os.getenv("HF_TIMEOUT", "60"))
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "8"))

_local_model = None


def _hf_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    return headers


def _pool_and_normalize(token_embeddings) -> list[float]:
    arr = np.array(token_embeddings, dtype=np.float32)
    vec = arr if arr.ndim == 1 else arr.mean(axis=0)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.astype(np.float32).tolist()


def _parse_single_embedding(data) -> list[float]:
    if isinstance(data, list):
        if not data:
            raise ValueError("Hugging Face returned an empty embedding.")
        if isinstance(data[0], (int, float)):
            return _pool_and_normalize(data)
        if isinstance(data[0], list):
            return _pool_and_normalize(data)
    raise ValueError(f"Unexpected embedding response shape: {type(data)}")


def _parse_batch_embeddings(data, expected: int) -> list[list[float]]:
    if not isinstance(data, list) or not data:
        raise ValueError("Hugging Face returned an empty batch embedding.")

    if isinstance(data[0], (int, float)):
        return [_pool_and_normalize(data)]

    if isinstance(data[0], list):
        if data and isinstance(data[0][0], (int, float)):
            if len(data) == expected:
                return [_pool_and_normalize(item) for item in data]
            return [_parse_single_embedding(item) for item in data]
        return [_parse_single_embedding(data)]

    raise ValueError(f"Unexpected batch embedding response: {type(data)}")


def _hf_request(inputs: str | list[str]) -> list | dict:
    payload = {"inputs": inputs}
    last_error = None

    for attempt in range(5):
        try:
            resp = requests.post(
                HF_INFERENCE_URL,
                headers=_hf_headers(),
                json=payload,
                timeout=HF_TIMEOUT,
            )
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(min(2**attempt, 10))
            continue

        if resp.status_code in (503, 504):
            logger.warning(
                "HF embedding model loading (attempt %s), retrying...", attempt + 1
            )
            time.sleep(min(2 ** (attempt + 1), 15))
            continue

        if not resp.ok:
            raise RuntimeError(
                f"Hugging Face embedding request failed ({resp.status_code}): "
                f"{resp.text[:300]}"
            ) from last_error

        return resp.json()

    raise RuntimeError(
        "Hugging Face embedding service unavailable after retries. "
        "Set HF_TOKEN or try again shortly."
    ) from last_error


def _embed_api(text: str) -> list[float]:
    data = _hf_request(text)
    return _parse_single_embedding(data)


def _embed_batch_api(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    out: list[list[float]] = []
    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        chunk = texts[start : start + EMBEDDING_BATCH_SIZE]
        data = _hf_request(chunk if len(chunk) > 1 else chunk[0])
        if len(chunk) == 1:
            out.append(_parse_single_embedding(data))
        else:
            out.extend(_parse_batch_embeddings(data, len(chunk)))
    return out


def _get_local_model():
    global _local_model
    if _local_model is None:
        try:
            from fastembed import TextEmbedding
        except ImportError as exc:
            raise RuntimeError(
                "EMBEDDING_BACKEND=local requires fastembed. "
                "Install with: pip install fastembed onnxruntime"
            ) from exc
        logger.info("Loading local embedding model %s", EMBEDDING_MODEL)
        _local_model = TextEmbedding(model_name=EMBEDDING_MODEL)
        logger.info("Local embedding model ready")
    return _local_model


def _embed_local(text: str) -> list[float]:
    model = _get_local_model()
    vectors = list(model.embed([text], batch_size=1))
    return _pool_and_normalize(vectors[0])


def _embed_batch_local(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = _get_local_model()
    out: list[list[float]] = []
    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        chunk = texts[start : start + EMBEDDING_BATCH_SIZE]
        for vec in model.embed(chunk, batch_size=len(chunk)):
            out.append(_pool_and_normalize(vec))
    return out


def embed(text: str) -> list[float]:
    if EMBEDDING_BACKEND == "local":
        return _embed_local(text)
    return _embed_api(text)


def embed_batch(texts: list[str]) -> list[list[float]]:
    if EMBEDDING_BACKEND == "local":
        return _embed_batch_local(texts)
    return _embed_batch_api(texts)
