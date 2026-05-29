/**
 * Match percentages shown in the UI are relative within the current city batch
 * (best place in the batch = 100%, worst = 0%), not raw cosine similarity.
 */

/** Min–max normalize raw cosine scores within the current city batch. */
export function buildRelativeScoreMap(places) {
  const scored = (places ?? []).filter((p) => p.score != null)
  if (scored.length === 0) return new Map()

  const values = scored.map((p) => p.score)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min

  const scoreById = new Map()
  for (const place of scored) {
    const relative = range === 0 ? 1 : (place.score - min) / range
    scoreById.set(place.id, relative)
  }
  return scoreById
}

/** Keep places at or above the user-selected match percentage (0–100). */
export function filterPlacesByMatchPercent(places, minPercent, relativeScores) {
  if (!minPercent || minPercent <= 0) return places
  const threshold = minPercent / 100
  return places.filter((place) => {
    const relative = relativeScores.get(place.id)
    return relative != null && relative >= threshold
  })
}
