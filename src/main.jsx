import React from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css' // primero Bootstrap...
import './index.css' // ...después Tailwind, para que sus utilidades ganen
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
