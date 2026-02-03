import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.jsx'
import SatelliteMap from './satellite.jsx';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SatelliteMap />
  </StrictMode>,
)
