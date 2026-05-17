import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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
      {places.map((place) => (
        <CircleMarker
          key={place.id}
          center={[place.lat, place.lon]}
          radius={8}
          fillColor="#888"
          color="#555"
          fillOpacity={0.7}
        >
          <Popup>{place.name}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
