import CitySearch from './CitySearch'
import './CityPicker.css'

/** Shown when the user has no city in mind — defaults to New York on the map. */
export const FALLBACK_CITY = {
  lat: 40.7128,
  lon: -74.006,
  name: 'New York',
}

/**
 * Post-onboarding step: user picks a city before the map loads.
 * Reuses CitySearch for Nominatim lookup; fallback button loads New York.
 */
export default function CityPicker({ onCitySelect, loading }) {
  const handleNoCityInMind = () => {
    onCitySelect(FALLBACK_CITY)
  }

  return (
    <div className="city-picker">
      <h1 className="city-picker__title">Where do you want to explore?</h1>
      <p className="city-picker__subtitle">
        Search for a city to see places matched to your taste profile.
      </p>
      <CitySearch onCitySelect={onCitySelect} />
      <button
        type="button"
        className="city-picker__fallback"
        onClick={handleNoCityInMind}
        disabled={loading}
      >
        I don&apos;t have a city in mind
      </button>
      {loading && (
        <p className="city-picker__loading">Loading places for your map…</p>
      )}
    </div>
  )
}
