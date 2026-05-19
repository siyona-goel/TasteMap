import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

function scoreToStyle(score) {
  if (score >= 0.65) return { color: '#E8593C', radius: 10, opacity: 0.85 }
  if (score >= 0.50) return { color: '#EF9F27', radius: 7, opacity: 0.7 }
  if (score >= 0.40) return { color: '#888888', radius: 5, opacity: 0.5 }
  return null
}

const DEFAULT_STYLE = { color: '#888888', radius: 8, opacity: 0.7 }

export default function Map({ places, center = [51.5074, -0.1278] }) {
  const [reasons, setReasons] = useState({})

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
        const style =
          place.score != null ? scoreToStyle(place.score) : DEFAULT_STYLE
        if (!style) return null

        const scored = place.score != null

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
              {scored && (
                <>
                  <br />
                  Match: {Math.round(place.score * 100)}%
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
