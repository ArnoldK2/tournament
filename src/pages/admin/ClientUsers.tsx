import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { UserRole } from '../../types'
import '../../styles/admin.css'
import '../../styles/workspace.css'

export default function ClientUsers() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const clients = useStore(s => s.clients)
  const users = useStore(s => s.users)
  const role = useStore(s => s.currentRole)
  const addUser = useStore(s => s.addUser)
  const updateUser = useStore(s => s.updateUser)
  const deleteUser = useStore(s => s.deleteUser)

  const client = clients.find(c => c.id === clientId)
  const clientUsers = users.filter(u => u.client_id === clientId)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('data_collector')

  if (!client) { navigate(-1); return null }
  if (role !== 'super_admin' && role !== 'client_admin') { navigate('/login'); return null }

  function openAdd() {
    setEditingId(null); setDisplayName(''); setUsername(''); setPin(''); setUserRole('data_collector')
    setShowForm(true)
  }

  function openEdit(u: typeof users[0]) {
    setEditingId(u.id); setDisplayName(u.display_name); setUsername(u.username); setPin(u.pin); setUserRole(u.role)
    setShowForm(true)
  }

  function save() {
    if (!displayName.trim() || !username.trim() || !pin.trim()) return
    if (editingId) {
      updateUser(editingId, { display_name: displayName.trim(), username: username.trim(), pin: pin.trim(), role: userRole })
    } else {
      addUser({ client_id: clientId!, display_name: displayName.trim(), username: username.trim(), pin: pin.trim(), role: userRole })
    }
    setShowForm(false)
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-breadcrumb">
          <button className="breadcrumb-btn" onClick={() => navigate(`/admin/${clientId}`)}>
            {client.name}
          </button>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Users</span>
        </div>
        <div className="admin-header-right">
          <button className="admin-add-btn sm" onClick={openAdd}>+ User</button>
        </div>
      </header>

      <div className="dash-body">
        {clientUsers.length === 0 && (
          <div className="dash-empty">
            <p>No users yet for this client.</p>
          </div>
        )}

        {clientUsers.map(u => (
          <motion.div
            key={u.id}
            className="user-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="user-card-top">
              <div className="user-card-info">
                <span className="user-card-name">{u.display_name}</span>
                <span className="user-card-username">@{u.username}</span>
              </div>
              <span className={`role-badge ${u.role === 'client_admin' ? 'admin' : 'dc'}`}>
                {u.role === 'client_admin' ? 'Admin' : 'Collector'}
              </span>
            </div>
            <div className="user-card-actions">
              <button className="alr-btn" onClick={() => openEdit(u)}>Edit</button>
              <button className="alr-btn danger" onClick={() => deleteUser(u.id)}>Remove</button>
            </div>
          </motion.div>
        ))}
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
              <h2 className="modal-title">{editingId ? 'Edit User' : 'Add User'}</h2>

              <label className="modal-label">Display Name</label>
              <input className="modal-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. John Doe" autoFocus />

              <label className="modal-label">Username</label>
              <input className="modal-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. john or 0700000000" />

              <label className="modal-label">PIN</label>
              <input className="modal-input" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="Login PIN" />

              <label className="modal-label">Role</label>
              <div className="direction-row">
                <button className={`direction-btn ${userRole === 'client_admin' ? 'selected' : ''}`} onClick={() => setUserRole('client_admin')}>
                  Admin
                </button>
                <button className={`direction-btn ${userRole === 'data_collector' ? 'selected' : ''}`} onClick={() => setUserRole('data_collector')}>
                  Data Collector
                </button>
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={save} disabled={!displayName.trim() || !username.trim() || !pin.trim()}>
                  {editingId ? 'Save' : 'Add User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
