import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const pathToHashRoute: Record<string, string> = {
  '/admin': '/admin',
  '/admin/': '/admin',
  '/admin/login': '/admin/login',
  '/admin/dashboard': '/admin/dashboard',
  '/admin/projects': '/admin/projects',
  '/admin/workers': '/admin/workers',
  '/admin/finances': '/admin/finances',
  '/admin/contracts': '/admin/contracts',
  '/admin/inventory': '/admin/inventory',
  '/admin/content': '/admin/content',
  '/admin/reports': '/admin/reports',
  '/admin/settings': '/admin/settings',
}

if (!window.location.hash) {
  const mappedRoute = pathToHashRoute[window.location.pathname]
  if (mappedRoute) {
    window.location.replace(`${window.location.origin}${window.location.pathname}#${mappedRoute}`)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
