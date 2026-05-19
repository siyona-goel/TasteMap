import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function scoreToStyle(score) {
  if (score >= 0.65) return { color: '#E8593C', radius: 10, opacity: 0.85 }
  if (score >= 0.50) return { color: '#EF9F27', radius: 7, opacity: 0.7 }
  if (score >= 0.40) return { color: '#888888', radius: 5, opacity: 0.5 }
  return null
}

const DEFAULT_STYLE = { color: '#888888', radius: 8, opacity: 0.7 }

export default function Map({ places, center = [51.5074, -0.1278] }) {
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

        return (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lon]}
            radius={style.radius}
            fillColor={style.color}
            color={style.color}
            fillOpacity={style.opacity}
            stroke={false}
          >
            <Popup>
              <strong>{place.name}</strong>
              {place.score != null && (
                <>
                  <br />
                  Match: {Math.round(place.score * 100)}%
                </>
              )}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
