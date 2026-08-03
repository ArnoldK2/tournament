import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import '../styles/audience.css'

export default function FeedbackPage() {
  const { editionId } = useParams<{ editionId: string }>()

  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === event?.client_id)

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!edition || !event || !client) {
    return (
      <div className="aud-root">
        <p className="aud-empty">Edition not found.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('feedback').insert({
      edition_id: editionId,
      message: message.trim(),
      name: name.trim(),
    })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="aud-root">
        <motion.div
          className="aud-panel aud-panel-centered"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="aud-done-icon">🙏</p>
          <h2 className="aud-done-title">Thank you!</h2>
          <p className="aud-done-sub">Your feedback has been submitted.</p>
        </motion.div>
      </div>
    )
  }

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
        <p className="aud-desc">We'd love to hear from you</p>

        <label className="aud-label">Name (optional)</label>
        <input
          className="aud-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />

        <label className="aud-label">Your feedback *</label>
        <textarea
          className="aud-textarea"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What did you enjoy? What could be better?"
          rows={5}
          required
        />

        {error && <p className="aud-error">{error}</p>}

        <button
          type="submit"
          className="aud-submit"
          disabled={!message.trim() || submitting}
        >
          {submitting ? 'Sending...' : 'Submit Feedback'}
        </button>
      </motion.form>
    </div>
  )
}
