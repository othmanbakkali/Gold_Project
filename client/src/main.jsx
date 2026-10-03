import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPwaAutoUpdate } from './services/pwaUpdater'

// Initialiser la mise à jour automatique PWA
initPwaAutoUpdate()

createRoot(document.getElementById('root')).render(
  <App />
)