import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import BrandLogos from '../components/BrandLogos'
import '../styles/audience.css'

export default function Register() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()

  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)
  const teams = useStore(s => s.teams)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === event?.client_id)
  const houses = useMemo(() => teams.filter(t => t.client_id === client?.id), [teams, client])

  const [name, setName] = useState('')
  const [house, setHouse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!edition || !event || !client) {
    return (
      <div className="aud-root">
        <p className="aud-empty">Edition not found.</p>
      </div>
    )
  }

  const source = new URLSearchParams(window.location.search).get('source') === 'qr'
    ? 'in_person'
    : 'online'

  const shareUrl = `${window.location.origin}/register/${editionId}`
  const shareText = `Follow the ${event.name} live leaderboard! Register here:`

  async function handleShare() {
    if ('share' in navigator) {
      try {
        await navigator.share({ title: event!.name, text: shareText, url: shareUrl })
        return
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('audience_registrations').insert({
      edition_id: editionId,
      name: name.trim(),
      house,
      source,
    })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    localStorage.setItem(`tt_registered_${editionId}`, 'true')
    setRegistered(true)
  }

  // ── Post-registration: share screen ─────────────────────────
  if (registered) {
    return (
      <div className="aud-root">
        <motion.div
          className="aud-panel aud-panel-centered"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.p
            className="aud-success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            🎉
          </motion.p>
          <h2 className="aud-success-title">You're in, {name.split(' ')[0]}!</h2>
          <p className="aud-success-sub">Registered for {event.name}</p>

          <div className="aud-share-box">
            <p className="aud-share-label">Know someone following online?</p>
            <p className="aud-share-hint">Share this link so they can register and follow along</p>
            <div className="aud-share-url">{shareUrl}</div>
            <button className="aud-share-btn" onClick={handleShare}>
              {copied ? '✓ Copied!' : ('share' in navigator ? '↑ Share Link' : '⎘ Copy Link')}
            </button>
          </div>

          <button
            className="aud-submit"
            onClick={() => navigate(`/leaderboard/${editionId}`)}
          >
            View Leaderboard →
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────
  return (
    <div className="aud-root">
      <motion.form
        className="aud-panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        onSubmit={handleSubmit}
      >
        <p className="aud-client">{client.name}</p>
        <h1 className="aud-title">{event.name}</h1>
        <p className="aud-subtitle">{edition.label}</p>
        <p className="aud-desc">Register to follow the live leaderboard</p>

        <label className="aud-label">Name *</label>
        <input
          className="aud-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          autoFocus
          required
        />

        <label className="aud-label">House</label>
        <div className="aud-houses">
          {houses.map(h => (
            <button
              key={h.id}
              type="button"
              className={`aud-house-btn ${house === h.name ? 'active' : ''}`}
              style={{ '--hc': h.color } as React.CSSProperties}
              onClick={() => setHouse(h.name)}
            >
              {h.name}
            </button>
          ))}
        </div>

        {error && <p className="aud-error">{error}</p>}

        <button
          type="submit"
          className="aud-submit"
          disabled={!name.trim() || submitting}
        >
          {submitting ? 'Registering...' : 'Register →'}
        </button>

        <BrandLogos variant="footer" />
      </motion.form>
    </div>
  )
}
