import { useState, useEffect } from 'react'
import Map from './components/Map'
import axios from 'axios'
//import Onboarding from './components/Onboarding'

const API = import.meta.env.VITE_API_URL
//const PREVIEW_ONBOARDING = true

export default function App() {
  const [places, setPlaces] = useState([])

  useEffect(() => {
    //if (PREVIEW_ONBOARDING) return
    // London city center as default test
    axios.get(`${API}/places?lat=51.5074&lon=-0.1278`)
      .then((r) => setPlaces(r.data))
  }, [])

  // if (PREVIEW_ONBOARDING) {
  //   return <Onboarding onComplete={(data) => console.log(data)} />
  // }

  return <Map places={places} />
}
