import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import './index.css'
import App from './App.jsx'

// Estadísticas de visitas (Vercel Web Analytics). Sin cookies; solo funciona
// en el sitio publicado y después de activarlo en el panel de Vercel.
inject()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
