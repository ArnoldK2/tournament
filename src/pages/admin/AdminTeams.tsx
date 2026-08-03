import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import '../../styles/admin.css'

const PRESET_COLORS = [
  '#f97316','#06b6d4','#a855f7','#22c55e',
  '#ef4444','#eab308','#3b82f6','#ec4899',
  '#14b8a6','#f59e0b','#8b5cf6','#10b981',
]

export default function AdminTeams() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()

  const clients = useStore(s => s.clients)
  const allTeams = useStore(s => s.teams)
  const addTeam = useStore(s => s.addTeam)
  const updateTeam = useStore(s => s.updateTeam)
  const deleteTeam = useStore(s => s.deleteTeam)

  const client = clients.find(c => c.id === clientId)
  const teams = allTeams.filter(t => t.client_id === clientId)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  function openAdd() { setEditId(null); setName(''); setColor(PRESET_COLORS[0]); setShowForm(true) }
  function openEdit(id: string) {
    const t = teams.find(t => t.id === id)
    if (!t) return
    setEditId(id); setName(t.name); setColor(t.color); setShowForm(true)
  }
  function save() {
    if (!name.trim()) return
    if (editId) updateTeam(editId, { name: name.trim(), color })
    else addTeam({ client_id: clientId!, name: name.trim(), color })
    setShowForm(false)
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div>
          <p className="admin-client-name">{client?.name}</p>
          <h1 className="admin-page-title">Teams</h1>
        </div>
        <button className="admin-back-btn" onClick={() => navigate(`/admin/${clientId}`)}>← Dashboard</button>
      </header>

      <div className="admin-body">
        <p className="re-hint">Teams are shared across all events for this organisation.</p>

        <div className="admin-list">
          {teams.map(team => (
            <motion.div key={team.id} className="admin-list-row" layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} style={{ '--team-color': team.color } as React.CSSProperties}>
              <span className="alr-dot" />
              <span className="alr-name">{team.name}</span>
              <div className="alr-actions">
                <button className="alr-btn" onClick={() => openEdit(team.id)}>Edit</button>
                <button className="alr-btn danger" onClick={() => deleteTeam(team.id)}>Delete</button>
              </div>
            </motion.div>
          ))}
          {teams.length === 0 && <p className="admin-empty">No teams yet.</p>}
        </div>

        <button className="admin-add-btn" onClick={openAdd}>+ Add Team</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
            <motion.div className="admin-modal bottom-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <h2 className="modal-title">{editId ? 'Edit Team' : 'Add Team'}</h2>
              <label className="modal-label">Team Name</label>
              <input className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. House Nile" onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
              <label className="modal-label">Colour</label>
              <div className="color-grid">
                {PRESET_COLORS.map(c => (
                  <button key={c} className={`color-swatch ${color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={save} disabled={!name.trim()}>{editId ? 'Save' : 'Add Team'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
