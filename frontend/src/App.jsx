import { useState } from 'react'
import Onboarding from './components/Onboarding'
import PlacesMap from './components/Map'
import CitySearch from './components/CitySearch'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL
const DEFAULT_CITY = { lat: 51.5074, lon: -0.1278, name: 'London' }

export default function App() {
  const [userProfile, setUserProfile] = useState(null)
  const [places, setPlaces] = useState([])
  const [city, setCity] = useState(DEFAULT_CITY)
  const [loading, setLoading] = useState(false)

  const handleProfileComplete = async (data) => {
    setUserProfile(data)
    localStorage.setItem('profile_summary', data.profile.summary)
    await loadPlaces(data.embedding, city)
  }

  const loadPlaces = async (embedding, targetCity) => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/score`, {
        lat: targetCity.lat,
        lon: targetCity.lon,
        user_embedding: embedding,
      })
      setPlaces(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleCitySelect = (newCity) => {
    setCity(newCity)
    if (userProfile) {
      loadPlaces(userProfile.embedding, newCity)
    }
  }

  if (!userProfile) return <Onboarding onComplete={handleProfileComplete} />

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}
      >
        <CitySearch onCitySelect={handleCitySelect} />
      </div>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '0.5rem 1rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            boxShadow: 'var(--shadow)',
          }}
        >
          Scoring places…
        </div>
      )}
      <PlacesMap places={places} center={[city.lat, city.lon]} />
    </div>
  )
}
