import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import { editionStatus } from '../../lib/editionStatus'
import '../../styles/admin.css'

const ADMIN_TILES = [
  { key: 'events',  label: 'Events & Editions', icon: '📅', sub: 'Manage events and their editions' },
  { key: 'teams',   label: 'Teams',              icon: '👥', sub: 'Add and manage teams' },
  { key: 'games',   label: 'Games',              icon: '🎮', sub: 'Set up games and scoring' },
  { key: 'results', label: 'Enter Results',      icon: '📝', sub: 'Record game outcomes' },
]

const COLLECTOR_TILES = [
  { key: 'results', label: 'Enter Results', icon: '📝', sub: 'Record game outcomes' },
]

export default function AdminDashboard() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()

  const clients = useStore(s => s.clients)
  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const role = useStore(s => s.currentRole)
  const logout = useStore(s => s.logout)

  const client = clients.find(c => c.id === clientId)
  const clientEvents = events.filter(e => e.client_id === clientId)
  const activeEditions = editions.filter(e =>
    clientEvents.some(ev => ev.id === e.event_id) && editionStatus(e.date) === 'active'
  )

  if (!client) {
    navigate('/admin')
    return null
  }

  const tiles = role === 'client_admin' ? ADMIN_TILES : COLLECTOR_TILES

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div>
          <p className="admin-client-name">{client.name}</p>
          <h1 className="admin-page-title">Dashboard</h1>
        </div>
        <div className="admin-header-right">
          <span className="role-badge">{role === 'client_admin' ? 'Admin' : 'Data Collector'}</span>
          <button className="admin-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {activeEditions.length > 0 && (
        <div className="admin-section">
          <p className="admin-section-label">Active Editions</p>
          <div className="active-editions">
            {activeEditions.map(ed => {
              const ev = clientEvents.find(e => e.id === ed.event_id)
              return (
                <button
                  key={ed.id}
                  className="active-edition-btn"
                  onClick={() => navigate(`/leaderboard/${ed.id}`)}
                >
                  <span className="ae-event">{ev?.name}</span>
                  <span className="ae-label">{ed.label}</span>
                  <span className="ae-arrow">↗</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="admin-section">
        <p className="admin-section-label">Manage</p>
        <div className="admin-tiles">
          {tiles.map((tile, i) => (
            <motion.button
              key={tile.key}
              className="admin-tile"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/admin/${clientId}/${tile.key}`)}
            >
              <span className="tile-icon">{tile.icon}</span>
              <span className="tile-label">{tile.label}</span>
              <span className="tile-sub">{tile.sub}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
