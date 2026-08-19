import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import AdminHeader from '../../components/AdminHeader'
import '../../styles/admin.css'
import '../../styles/workspace.css'

export default function SuperAdminOrgs() {
  const navigate = useNavigate()
  const organizations = useStore(s => s.organizations)
  const clients = useStore(s => s.clients)
  const role = useStore(s => s.currentRole)
  const addOrganization = useStore(s => s.addOrganization)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  if (role !== 'super_admin') { navigate('/login'); return null }

  function saveOrg() {
    if (!name.trim()) return
    addOrganization({ name: name.trim(), slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-') })
    setName(''); setSlug(''); setShowForm(false)
  }

  return (
    <div className="admin-root">
      <AdminHeader orgName="Organisations" />

      <div className="dash-body">
        {organizations.length === 0 && (
          <div className="dash-empty">
            <p>No organisations yet.</p>
          </div>
        )}

        {organizations.map(org => {
          const orgClients = clients.filter(c => c.organization_id === org.id)
          return (
            <motion.button
              key={org.id}
              className="sa-client-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/admin/orgs/${org.id}`)}
            >
              <div className="sa-cc-top">
                <h3 className="sa-cc-name">{org.name}</h3>
                <span className="sa-cc-arrow">→</span>
              </div>
              <p className="sa-cc-meta">{orgClients.length} client{orgClients.length !== 1 ? 's' : ''}</p>
            </motion.button>
          )
        })}

        <button className="dash-new-event-btn" onClick={() => setShowForm(true)}>+ Add Organisation</button>
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
              <h2 className="modal-title">Add Organisation</h2>

              <label className="modal-label">Name</label>
              <input className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PlayHouse" autoFocus />

              <label className="modal-label">Slug <span className="modal-label-hint">URL-safe ID</span></label>
              <input className="modal-input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="Auto-generated if empty" />

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveOrg} disabled={!name.trim()}>Add</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
