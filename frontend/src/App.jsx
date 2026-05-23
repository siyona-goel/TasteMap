import { useMemo, useState } from 'react'
import Onboarding from './components/Onboarding'
import PlacesMap from './components/Map'
import CitySearch from './components/CitySearch'
import CategoryFilter from './components/CategoryFilter'
import axios from 'axios'
import {
  filterPlacesByCategory,
  getPlaceCategories,
  PLACE_CATEGORIES,
} from './utils/placeCategories'
import { rescorePlaces, stripEmbeddings } from './utils/rescorePlaces'

const API = import.meta.env.VITE_API_URL
const DEFAULT_CITY = { lat: 51.5074, lon: -0.1278, name: 'London' }

export default function App() {
  const [userProfile, setUserProfile] = useState(null)
  const [places, setPlaces] = useState([])
  const [placesCache, setPlacesCache] = useState([])
  const [city, setCity] = useState(DEFAULT_CITY)
  const [loading, setLoading] = useState(false)
  const [activeCategories, setActiveCategories] = useState(new Set())

  const filteredPlaces = useMemo(
    () => filterPlacesByCategory(places, activeCategories),
    [places, activeCategories],
  )

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PLACE_CATEGORIES.map(({ id }) => [id, 0]),
    )
    for (const place of places) {
      for (const cat of getPlaceCategories(place)) {
        counts[cat] = (counts[cat] || 0) + 1
      }
    }
    return counts
  }, [places])

  const handleProfileComplete = async (data) => {
    setUserProfile(data)
    localStorage.setItem('profile_summary', data.profile.summary)
    await loadPlaces(data.embedding, city)
  }

  const applyScoredPlaces = (scoredWithEmbeddings, embedding) => {
    setPlacesCache(scoredWithEmbeddings)
    setPlaces(stripEmbeddings(scoredWithEmbeddings))
    setUserProfile((prev) =>
      prev ? { ...prev, embedding } : prev,
    )
  }

  const loadPlaces = async (embedding, targetCity) => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/score`, {
        lat: targetCity.lat,
        lon: targetCity.lon,
        user_embedding: embedding,
      })
      applyScoredPlaces(res.data, embedding)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = (newEmbedding) => {
    const rescored = rescorePlaces(newEmbedding, placesCache)
    applyScoredPlaces(rescored, newEmbedding)
  }

  const handleCitySelect = (newCity) => {
    setCity(newCity)
    setActiveCategories(new Set())
    setPlacesCache([])
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
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <CategoryFilter
          activeCategories={activeCategories}
          onChange={setActiveCategories}
          placeCounts={categoryCounts}
        />
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
      <PlacesMap
        places={filteredPlaces}
        center={[city.lat, city.lon]}
        userEmbedding={userProfile.embedding}
        onFeedback={handleFeedback}
      />
    </div>
  )
}
