import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import '../../styles/admin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const login = useStore(s => s.login)
  const store = useStore(s => s)

  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !pin.trim()) return
    const ok = await login(username.trim(), pin.trim())
    if (!ok) {
      setError('Invalid username or PIN')
      setPin('')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    const user = store.users.find(u => u.username === username.trim())
    if (!user) {
      await store.loadData()
      const refreshed = store.users.find(u => u.username === username.trim())
      if (!refreshed) return
      routeUser(refreshed)
      return
    }
    routeUser(user)
  }

  function routeUser(user: { role: string; client_id: string | null }) {
    if (user.role === 'super_admin') {
      navigate('/admin/clients')
    } else if (user.role === 'client_admin') {
      navigate(`/admin/${user.client_id}`)
    } else {
      const editions = store.editions
      const events = store.events.filter(ev => ev.client_id === user.client_id)
      const eventIds = events.map(ev => ev.id)
      const activeEdition = editions.find(ed => eventIds.includes(ed.event_id) && ed.status === 'active')
      if (activeEdition) {
        navigate(`/admin/${user.client_id}/edition/${activeEdition.id}`)
      } else {
        navigate(`/admin/${user.client_id}`)
      }
    }
  }

  return (
    <div className="admin-login-root">
      <button className="al-back-home" onClick={() => navigate('/')}>← Home</button>

      <motion.form
        className="al-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={handleSubmit}
      >
        <h1 className="al-title">Log In</h1>
        <p className="al-sub">Enter your credentials</p>

        <label className="al-field-label">Username</label>
        <input
          className="al-field-input"
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          placeholder="Username or phone number"
          autoFocus
        />

        <label className="al-field-label">PIN</label>
        <motion.input
          className="al-field-input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={e => { setPin(e.target.value); setError('') }}
          placeholder="PIN"
          animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        />

        {error && <p className="al-error">{error}</p>}

        <button
          type="submit"
          className="al-submit"
          disabled={!username.trim() || !pin.trim()}
        >
          Log In →
        </button>
      </motion.form>
    </div>
  )
}
