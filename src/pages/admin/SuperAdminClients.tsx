import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import '../../styles/admin.css'
import '../../styles/workspace.css'

export default function SuperAdminClients() {
  const navigate = useNavigate()
  const clients = useStore(s => s.clients)
  const users = useStore(s => s.users)
  const role = useStore(s => s.currentRole)
  const logout = useStore(s => s.logout)
  const addClient = useStore(s => s.addClient)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  if (role !== 'super_admin') { navigate('/login'); return null }

  function saveClient() {
    if (!name.trim()) return
    addClient({ name: name.trim(), slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'), logo_color: '#6366f1' })
    setName(''); setSlug(''); setShowForm(false)
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1 className="admin-page-title">Clients</h1>
        <div className="admin-header-right">
          <span className="role-badge sa">Super Admin</span>
          <button className="icon-btn" onClick={() => { logout(); navigate('/') }}>↩</button>
        </div>
      </header>

      <div className="dash-body">
        {clients.length === 0 && (
          <div className="dash-empty">
            <p>No clients yet. Add your first organisation.</p>
          </div>
        )}

        {clients.map(client => {
          const clientUsers = users.filter(u => u.client_id === client.id)
          return (
            <motion.button
              key={client.id}
              className="sa-client-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/admin/${client.id}`)}
            >
              <div className="sa-cc-top">
                <h3 className="sa-cc-name">{client.name}</h3>
                <span className="sa-cc-arrow">→</span>
              </div>
              <p className="sa-cc-meta">{clientUsers.length} user{clientUsers.length !== 1 ? 's' : ''}</p>
            </motion.button>
          )
        })}

        <button className="dash-new-event-btn" onClick={() => setShowForm(true)}>+ Add Client</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
            <motion.div
              className="admin-modal bottom-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <h2 className="modal-title">Add Client</h2>

              <label className="modal-label">Organisation Name</label>
              <input className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nabbingo Old Girls" autoFocus />

              <label className="modal-label">Slug <span className="modal-label-hint">URL-safe ID</span></label>
              <input className="modal-input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="Auto-generated if empty" />

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveClient} disabled={!name.trim()}>Add Client</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
