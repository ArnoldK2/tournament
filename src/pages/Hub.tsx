import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import '../styles/hub.css'

export default function Hub() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()

  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === event?.client_id)

  const [copied, setCopied] = useState(false)

  if (!edition || !event || !client) {
    return <div className="hub-root"><p style={{ color: '#fff' }}>Edition not found.</p></div>
  }

  const shareUrl = `${window.location.origin}/register/${editionId}`
  const shareText = `Follow the ${event.name} live leaderboard!`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: event!.name, text: shareText, url: shareUrl })
        return
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const isRegistered = localStorage.getItem(`tt_registered_${editionId}`) === 'true'

  const actions = [
    {
      key: 'register',
      icon: '📋',
      label: isRegistered ? 'View Leaderboard' : 'Register',
      sub: isRegistered ? 'Follow scores in real time' : 'Join and follow the live scores',
      onClick: () => navigate(isRegistered ? `/leaderboard/${editionId}` : `/register/${editionId}?source=qr`),
    },
    {
      key: 'share',
      icon: copied ? '✓' : '🔗',
      label: copied ? 'Link Copied!' : 'Share Event',
      sub: 'Send to friends following online',
      onClick: handleShare,
    },
    {
      key: 'feedback',
      icon: '💬',
      label: 'Give Feedback',
      sub: 'Tell us what you thought',
      onClick: () => navigate(`/feedback/${editionId}`),
    },
  ]

  return (
    <div className="hub-root">
      <motion.div
        className="hub-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="hub-client">{client.name}</p>
        <h1 className="hub-event">{event.name}</h1>
        <p className="hub-edition">{edition.label}</p>

        <div className="hub-actions">
          {actions.map((action, i) => (
            <motion.button
              key={action.key}
              className="hub-action"
              onClick={action.onClick}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="hub-action-icon">{action.icon}</span>
              <span className="hub-action-text">
                <span className="hub-action-label">{action.label}</span>
                <span className="hub-action-sub">{action.sub}</span>
              </span>
              <span className="hub-action-arrow">›</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
