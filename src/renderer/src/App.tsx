import { useEffect, useState } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { applyTheme } from './theme/tokens'
import { SnackProvider } from './components/overlays'
import { Titlebar } from './components/Titlebar'
import { IconGlobe, IconSettings } from './components/icons'
import Connection from './pages/Connection'
import Domains from './pages/Domains'
import Mailboxes from './pages/Mailboxes'
import Inbox from './pages/Inbox'
import Settings from './pages/Settings'
import { Spinner } from './components/surfaces'
import './app.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 }
  }
})

function NavRail() {
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: () => window.api.getStatus() })
  const connected = status?.configured
  return (
    <nav className="rail glass">
      <NavLink to="/domains" className={({ isActive }) => `rail-item ${isActive ? 'rail-active' : ''}`} title="Domains">
        <IconGlobe size={22} />
        <span>Domains</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `rail-item ${isActive ? 'rail-active' : ''}`} title="Settings">
        <IconSettings size={22} />
        <span>Settings</span>
      </NavLink>
      <div className="rail-spacer" />
      <div className={`rail-status ${connected ? 'rail-ok' : 'rail-bad'}`} title={connected ? 'Connected' : 'Not configured'} />
    </nav>
  )
}

function Shell() {
  const { data: status, isLoading } = useQuery({ queryKey: ['status'], queryFn: () => window.api.getStatus() })
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="boot">
        <Spinner size={34} />
      </div>
    )
  }

  if (!status?.configured) {
    return (
      <Routes>
        <Route path="*" element={<Connection />} />
      </Routes>
    )
  }

  return (
    <div className="shell">
      <NavRail />
      <main className="content">
        <motion.div
          key={location.pathname}
          className="page"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        >
            <Routes location={location}>
              <Route path="/domains" element={<Domains />} />
              <Route path="/domains/:domain/mailboxes" element={<Mailboxes />} />
              <Route path="/domains/:domain/mailbox/:address" element={<Inbox single />} />
              <Route path="/combined" element={<Inbox combined />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/domains" replace />} />
            </Routes>
        </motion.div>
      </main>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // expose a tiny global hook so Settings can flip the theme without prop drilling
  useEffect(() => {
    ;(window as unknown as { __setTheme?: (t: 'dark' | 'light') => void }).__setTheme = setTheme
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <SnackProvider>
        <div className="app">
          <div className="aurora" aria-hidden>
            <span className="blob-1" />
            <span className="blob-2" />
            <span className="blob-3" />
          </div>
          <Titlebar />
          <HashRouter>
            <Shell />
          </HashRouter>
        </div>
      </SnackProvider>
    </QueryClientProvider>
  )
}
