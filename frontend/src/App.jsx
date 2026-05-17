import { useState, useEffect } from 'react'
import Map from './components/Map'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function App() {
  const [places, setPlaces] = useState([])

  useEffect(() => {
    // London city center as default test
    axios.get(`${API}/places?lat=51.5074&lon=-0.1278`)
      .then((r) => setPlaces(r.data))
  }, [])

  return <Map places={places} />
}
