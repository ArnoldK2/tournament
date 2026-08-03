import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import '../../styles/admin.css'
import '../../styles/workspace.css'

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()

  const clients = useStore(s => s.clients)
  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const role = useStore(s => s.currentRole)
  const logout = useStore(s => s.logout)
  const addEvent = useStore(s => s.addEvent)
  const addEdition = useStore(s => s.addEdition)

  const client = clients.find(c => c.id === clientId)
  const clientEvents = events.filter(e => e.client_id === clientId)

  const [showEventForm, setShowEventForm] = useState(false)
  const [showEditionForm, setShowEditionForm] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [editionEventId, setEditionEventId] = useState('')
  const [newEditionLabel, setNewEditionLabel] = useState('')
  const [newEditionDate, setNewEditionDate] = useState('')

  if (!client) { navigate('/admin'); return null }

  function saveEvent() {
    if (!newEventName.trim()) return
    addEvent({ client_id: clientId!, name: newEventName.trim(), description: '' })
    setNewEventName('')
    setShowEventForm(false)
  }

  function saveEdition() {
    if (!newEditionLabel.trim() || !editionEventId) return
    addEdition({ event_id: editionEventId, label: newEditionLabel.trim(), date: newEditionDate, status: 'upcoming' })
    setNewEditionLabel('')
    setNewEditionDate('')
    setShowEditionForm(false)
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div>
          <p className="admin-client-name" style={{ '--c': client.logo_color } as React.CSSProperties}>
            <span className="al-client-dot" style={{ width: 8, height: 8 } as React.CSSProperties} /> {client.name}
          </p>
          <h1 className="admin-page-title">Dashboard</h1>
        </div>
        <div className="admin-header-right">
          <span className="role-badge">{role === 'client_admin' ? 'Admin' : role === 'super_admin' ? 'Super' : 'Collector'}</span>
          {(role === 'client_admin' || role === 'super_admin') && (
            <>
              <button className="admin-back-btn" onClick={() => navigate(`/admin/${clientId}/teams`)}>Teams</button>
              <button className="admin-back-btn" onClick={() => navigate(`/admin/${clientId}/users`)}>Users</button>
            </>
          )}
          {role === 'super_admin' && (
            <button className="admin-back-btn" onClick={() => navigate('/admin/clients')}>← Clients</button>
          )}
          <button className="admin-logout" onClick={() => { logout(); navigate('/') }}>Log out</button>
        </div>
      </header>

      <div className="dash-body">
        {clientEvents.length === 0 && (
          <div className="dash-empty">
            <p>No events yet.</p>
            {(role === 'client_admin' || role === 'super_admin') && (
              <button className="admin-add-btn" onClick={() => setShowEventForm(true)}>+ Create First Event</button>
            )}
          </div>
        )}

        {clientEvents.map(event => {
          const eventEditions = editions
            .filter(e => e.event_id === event.id)
            .sort((a, b) => b.label.localeCompare(a.label))

          return (
            <div key={event.id} className="dash-event-block">
              <div className="dash-event-header">
                <h2 className="dash-event-name">{event.name}</h2>
                {(role === 'client_admin' || role === 'super_admin') && (
                  <button className="dash-add-edition" onClick={() => { setEditionEventId(event.id); setShowEditionForm(true) }}>
                    + Edition
                  </button>
                )}
              </div>

              <div className="dash-editions">
                {eventEditions.map((ed, i) => (
                  <motion.button
                    key={ed.id}
                    className={`dash-edition-card status-${ed.status}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/admin/${clientId}/edition/${ed.id}`)}
                  >
                    <div className="dec-top">
                      <span className="dec-label">{ed.label}</span>
                      <span className={`dec-status status-${ed.status}`}>{ed.status}</span>
                    </div>
                    <div className="dec-date">{ed.date}</div>
                    <div className="dec-arrow">Enter →</div>
                  </motion.button>
                ))}

                {eventEditions.length === 0 && (
                  <p className="dash-no-editions">No editions yet</p>
                )}
              </div>
            </div>
          )
        })}

        {clientEvents.length > 0 && (role === 'client_admin' || role === 'super_admin') && (
          <button className="dash-new-event-btn" onClick={() => setShowEventForm(true)}>+ New Event</button>
        )}
      </div>

      {/* Add Event modal */}
      <AnimatePresence>
        {showEventForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEventForm(false)}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">New Event</h2>
              <label className="modal-label">Event Name</label>
              <input className="modal-input" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="e.g. Sports Gala" autoFocus onKeyDown={e => e.key === 'Enter' && saveEvent()} />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowEventForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveEvent} disabled={!newEventName.trim()}>Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Edition modal */}
      <AnimatePresence>
        {showEditionForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditionForm(false)}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">New Edition</h2>
              <p className="modal-sub">For: <strong>{events.find(e => e.id === editionEventId)?.name}</strong></p>
              <label className="modal-label">Label</label>
              <input className="modal-input" value={newEditionLabel} onChange={e => setNewEditionLabel(e.target.value)} placeholder="e.g. 2025" autoFocus />
              <label className="modal-label">Date</label>
              <input className="modal-input" type="date" value={newEditionDate} onChange={e => setNewEditionDate(e.target.value)} />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowEditionForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveEdition} disabled={!newEditionLabel.trim()}>Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
