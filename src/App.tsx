import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Progression from './pages/Progression'
import AdminLogin from './pages/admin/AdminLogin'
import SuperAdminOrgs from './pages/admin/SuperAdminClients'
import OrgClients from './pages/admin/OrgClients'
import OrgUsers from './pages/admin/ClientUsers'
import ClientDashboard from './pages/admin/ClientDashboard'
import AdminTeams from './pages/admin/AdminTeams'
import EditionWorkspace from './pages/admin/EditionWorkspace'
import Announcement from './pages/Announcement'
import Register from './pages/Register'
import FeedbackPage from './pages/FeedbackPage'
import QrScreen from './pages/QrScreen'
import Hub from './pages/Hub'
import './styles/global.css'
import './styles/client-themes.css'

export default function App() {
  const loadData = useStore(s => s.loadData)
  const loaded = useStore(s => s.loaded)

  useEffect(() => { loadData() }, [loadData])

  if (!loaded) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', color: '#fff', fontFamily: 'system-ui' }}>Loading...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/leaderboard/:editionId" element={<Leaderboard />} />
        <Route path="/progression/:editionId" element={<Progression />} />
        <Route path="/admin/orgs" element={<SuperAdminOrgs />} />
        <Route path="/admin/orgs/:orgId" element={<OrgClients />} />
        <Route path="/admin/orgs/:orgId/users" element={<OrgUsers />} />
        <Route path="/admin/clients" element={<Navigate to="/admin/orgs" replace />} />
        <Route path="/admin/:clientId" element={<ClientDashboard />} />
        <Route path="/admin/:clientId/event/:eventId/teams" element={<AdminTeams />} />
        <Route path="/admin/:clientId/edition/:editionId" element={<EditionWorkspace />} />
        <Route path="/register/:editionId" element={<Register />} />
        <Route path="/feedback/:editionId" element={<FeedbackPage />} />
        <Route path="/screen/:editionId/:type" element={<QrScreen />} />
        <Route path="/hub/:editionId" element={<Hub />} />
        <Route path="/announcement/:editionId" element={<Announcement />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
