/** Dot product — vectors from sentence-transformers are L2-normalized. */
export function cosineSimilarity(vecA, vecB) {
  let sum = 0
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i]
  }
  return sum
}

export function rescorePlaces(userEmbedding, placesWithEmbeddings) {
  const scored = placesWithEmbeddings.map((place) => ({
    ...place,
    score: cosineSimilarity(userEmbedding, place.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function stripEmbeddings(places) {
  return places.map(({ embedding: _embedding, ...rest }) => rest)
}
