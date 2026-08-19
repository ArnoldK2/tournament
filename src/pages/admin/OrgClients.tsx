import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { UserRole } from '../../types'
import { editionStatus } from '../../lib/editionStatus'
import AdminHeader from '../../components/AdminHeader'
import '../../styles/admin.css'
import '../../styles/workspace.css'

type Tab = 'clients' | 'users'

export default function OrgClients() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()

  const organizations = useStore(s => s.organizations)
  const clients = useStore(s => s.clients)
  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const users = useStore(s => s.users)
  const role = useStore(s => s.currentRole)
  const addClient = useStore(s => s.addClient)
  const addUser = useStore(s => s.addUser)
  const updateUser = useStore(s => s.updateUser)
  const deleteUser = useStore(s => s.deleteUser)

  const [tab, setTab] = useState<Tab>('clients')

  // Client form
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientSlug, setClientSlug] = useState('')

  // User form
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('data_collector')

  if (role === 'guest') { navigate('/login'); return null }

  const org = organizations.find(o => o.id === orgId)
  if (!org) { navigate('/admin/orgs'); return null }

  const orgClients = clients.filter(c => c.organization_id === orgId)
  const orgUsers = users.filter(u => u.organization_id === orgId)

  function saveClient() {
    if (!clientName.trim() || !orgId) return
    addClient({
      organization_id: orgId,
      name: clientName.trim(),
      slug: clientSlug.trim() || clientName.trim().toLowerCase().replace(/\s+/g, '-'),
      logo_color: '#6366f1',
    })
    setClientName(''); setClientSlug(''); setShowClientForm(false)
  }

  function openAddUser() {
    setEditingUserId(null); setDisplayName(''); setUsername(''); setPin(''); setUserRole('data_collector')
    setShowUserForm(true)
  }

  function openEditUser(u: typeof users[0]) {
    setEditingUserId(u.id); setDisplayName(u.display_name); setUsername(u.username); setPin(u.pin); setUserRole(u.role)
    setShowUserForm(true)
  }

  function saveUser() {
    if (!displayName.trim() || !username.trim() || !pin.trim()) return
    if (editingUserId) {
      updateUser(editingUserId, { display_name: displayName.trim(), username: username.trim(), pin: pin.trim(), role: userRole })
    } else {
      addUser({ organization_id: orgId!, display_name: displayName.trim(), username: username.trim(), pin: pin.trim(), role: userRole })
    }
    setShowUserForm(false)
  }

  return (
    <div className="admin-root">
      <AdminHeader orgName={org.name}>
        {role === 'super_admin' && (
          <button className="admin-back-btn" onClick={() => navigate('/admin/orgs')}>← Orgs</button>
        )}
      </AdminHeader>

      {/* Tab bar */}
      <div className="org-tab-bar">
        <button className={`org-tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
          Clients
          <span className="org-tab-count">{orgClients.length}</span>
        </button>
        {(role === 'super_admin' || role === 'client_admin') && (
          <button className={`org-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            Users
            <span className="org-tab-count">{orgUsers.length}</span>
          </button>
        )}
      </div>

      {/* ── Clients tab ─────────────────────────────────── */}
      {tab === 'clients' && (
        <div className="dash-body">
          {orgClients.length === 0 && (
            <div className="dash-empty">
              <p>No clients yet under {org.name}.</p>
            </div>
          )}

          {orgClients.map(client => {
            const clientEvents = events.filter(e => e.client_id === client.id)
            const eventIds = clientEvents.map(e => e.id)
            const clientEditions = editions.filter(e => eventIds.includes(e.event_id))
            const active = clientEditions.filter(e => editionStatus(e.date) === 'active').length
            const upcoming = clientEditions.filter(e => editionStatus(e.date) === 'upcoming').length
            const completed = clientEditions.filter(e => editionStatus(e.date) === 'completed').length
            return (
              <motion.button
                key={client.id}
                className="sa-client-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/admin/${client.id}`)}
              >
                <div className="sa-cc-top">
                  <div className="sa-cc-title">
                    <h3 className="sa-cc-name">{client.name}</h3>
                    <span className="sa-cc-slug">/{client.slug}</span>
                  </div>
                  <span className="sa-cc-arrow">→</span>
                </div>
                <div className="sa-cc-stats">
                  <span>{clientEvents.length} event{clientEvents.length !== 1 ? 's' : ''}</span>
                  {active > 0 && <span className="sa-cc-stat active">{active} active</span>}
                  {upcoming > 0 && <span className="sa-cc-stat upcoming">{upcoming} upcoming</span>}
                  {completed > 0 && <span className="sa-cc-stat completed">{completed} completed</span>}
                </div>
              </motion.button>
            )
          })}

          {(role === 'super_admin' || role === 'client_admin') && (
            <button className="dash-new-event-btn" onClick={() => setShowClientForm(true)}>+ Add Client</button>
          )}
        </div>
      )}

      {/* ── Users tab ───────────────────────────────────── */}
      {tab === 'users' && (
        <div className="dash-body">
          {orgUsers.length === 0 && (
            <div className="dash-empty">
              <p>No users yet for {org.name}.</p>
            </div>
          )}

          {orgUsers.map(u => (
            <motion.div key={u.id} className="user-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
                <button className="alr-btn" onClick={() => openEditUser(u)}>Edit</button>
                <button className="alr-btn danger" onClick={() => deleteUser(u.id)}>Remove</button>
              </div>
            </motion.div>
          ))}

          <button className="dash-new-event-btn" onClick={openAddUser}>+ Add User</button>
        </div>
      )}

      {/* ── Add Client modal ─────────────────────────────── */}
      <AnimatePresence>
        {showClientForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClientForm(false)}>
            <motion.div className="admin-modal bottom-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <h2 className="modal-title">Add Client</h2>
              <p className="modal-sub">Under: <strong>{org.name}</strong></p>
              <label className="modal-label">Name</label>
              <input className="modal-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Nabbingo Old Girls" autoFocus />
              <label className="modal-label">Slug <span className="modal-label-hint">URL-safe ID</span></label>
              <input className="modal-input" value={clientSlug} onChange={e => setClientSlug(e.target.value)} placeholder="Auto-generated if empty" />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowClientForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveClient} disabled={!clientName.trim()}>Add Client</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add/Edit User modal ──────────────────────────── */}
      <AnimatePresence>
        {showUserForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserForm(false)}>
            <motion.div className="admin-modal bottom-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <h2 className="modal-title">{editingUserId ? 'Edit User' : 'Add User'}</h2>
              <label className="modal-label">Display Name</label>
              <input className="modal-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. John Doe" autoFocus />
              <label className="modal-label">Username</label>
              <input className="modal-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. john or 0700000000" />
              <label className="modal-label">PIN</label>
              <input className="modal-input" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="Login PIN" />
              <label className="modal-label">Role</label>
              <div className="direction-row">
                <button className={`direction-btn ${userRole === 'client_admin' ? 'selected' : ''}`} onClick={() => setUserRole('client_admin')}>Admin</button>
                <button className={`direction-btn ${userRole === 'data_collector' ? 'selected' : ''}`} onClick={() => setUserRole('data_collector')}>Data Collector</button>
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowUserForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveUser} disabled={!displayName.trim() || !username.trim() || !pin.trim()}>
                  {editingUserId ? 'Save' : 'Add User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
