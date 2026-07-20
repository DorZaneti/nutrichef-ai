import React from 'react'
import ReactDOM from 'react-dom/client'
import './theme.css'
import App from './App.jsx'

// Apply the saved (or system) theme before first paint to avoid a flash.
const savedTheme = (() => {
  try {
    return JSON.parse(localStorage.getItem('nutrichef.theme'))
  } catch {
    return null
  }
})()
document.documentElement.dataset.theme =
  savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
