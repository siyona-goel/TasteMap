import { useState } from 'react'
import axios from 'axios'
import './CitySearch.css'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'TasteMap/1.0 (https://github.com/siyona-goel/TasteMap)'

export default function CitySearch({ onCitySelect }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = async () => {
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(NOMINATIM_URL, {
        params: { q, format: 'json', limit: 1 },
        headers: {
          'Accept-Language': 'en',
          'User-Agent': USER_AGENT,
        },
      })
      if (res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0]
        onCitySelect({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          name: display_name,
        })
      } else {
        setError('No city found. Try a different name.')
      }
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="city-search">
      <input
        className="city-search__input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder="Search any city..."
        disabled={loading}
      />
      <button
        type="button"
        className="city-search__button"
        onClick={search}
        disabled={loading || !query.trim()}
      >
        {loading ? '…' : 'Go'}
      </button>
      {error && <p className="city-search__error">{error}</p>}
    </div>
  )
}
