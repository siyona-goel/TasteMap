import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import axios from 'axios'
import {
  getPlaceCategories,
  PLACE_CATEGORIES,
} from '../utils/placeCategories'

const CATEGORY_LABELS = Object.fromEntries(
  PLACE_CATEGORIES.map(({ id, label }) => [id, label]),
)
import 'leaflet/dist/leaflet.css'

/** Map a 0–1 relative score (best=1, worst=0 in this batch) to marker style. */
function scoreToStyle(relativeScore) {
  if (relativeScore >= 0.65) return { color: '#E8593C', radius: 10, opacity: 0.85 }
  if (relativeScore >= 0.50) return { color: '#EF9F27', radius: 7, opacity: 0.7 }
  if (relativeScore >= 0.40) return { color: '#888888', radius: 5, opacity: 0.5 }
  return null
}

const DEFAULT_STYLE = { color: '#888888', radius: 8, opacity: 0.7 }

/** Min–max normalize raw cosine scores within the current city batch. */
function buildRelativeScoreMap(places) {
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

export default function PlacesMap({ places = [], center = [51.5074, -0.1278] }) {
  const [reasons, setReasons] = useState({})
  const relativeScores = useMemo(() => buildRelativeScoreMap(places), [places])

  const fetchReason = async (place) => {
    if (reasons[place.id]) return
    const profileSummary = localStorage.getItem('profile_summary')
    if (!profileSummary) return

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/reason`, {
        place_description: place.description,
        profile_summary: profileSummary,
      })
      setReasons((prev) => ({ ...prev, [place.id]: res.data.reason }))
    } catch {
      setReasons((prev) => ({
        ...prev,
        [place.id]: 'Could not load match reason.',
      }))
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {places.map((place) => {
        const relative = relativeScores.get(place.id)
        const style =
          relative != null ? scoreToStyle(relative) : DEFAULT_STYLE
        if (!style) return null

        const scored = relative != null

        return (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lon]}
            radius={style.radius}
            fillColor={style.color}
            color={style.color}
            fillOpacity={style.opacity}
            stroke={false}
            eventHandlers={
              scored ? { click: () => fetchReason(place) } : undefined
            }
          >
            <Popup>
              <strong>{place.name}</strong>
              {getPlaceCategories(place).length > 0 && (
                <>
                  <br />
                  <span style={{ fontSize: '0.85em', opacity: 0.85 }}>
                    {getPlaceCategories(place)
                      .map((id) => CATEGORY_LABELS[id] || id)
                      .join(' · ')}
                  </span>
                </>
              )}
              {scored && (
                <>
                  <br />
                  Match: {Math.round(relative * 100)}%
                  <br />
                  {reasons[place.id] ? (
                    <em>{reasons[place.id]}</em>
                  ) : (
                    <span>Click to load match reason...</span>
                  )}
                </>
              )}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
