import { useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { useStore } from '../store'
import ControlMenu from '../components/ControlMenu'
import '../styles/qrscreen.css'

type ScreenType = 'register' | 'feedback'

export default function QrScreen() {
  const { editionId, type } = useParams<{ editionId: string; type: ScreenType }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentRole = useStore(s => s.currentRole)
  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === event?.client_id)

  const isFeedback = type === 'feedback'
  const url = isFeedback
    ? `${window.location.origin}/feedback/${editionId}`
    : `${window.location.origin}/register/${editionId}?source=qr`

  const renderQr = useCallback(async () => {
    if (!canvasRef.current) return
    await QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 2,
      color: { dark: '#ffffff', light: '#00000000' },
    })
  }, [url])

  useEffect(() => { renderQr() }, [renderQr])

  if (!edition || !event || !client) {
    return <div className="qrs-root"><p style={{ color: '#fff' }}>Edition not found.</p></div>
  }

  const currentView = type === 'feedback' ? 'feedback-qr' : 'register-qr' as const

  return (
    <div className="qrs-root">
      <ControlMenu editionId={editionId!} currentView={currentView} role={currentRole} />
      <div className="qrs-bg" />

      <motion.div
        className="qrs-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="qrs-client">{client.name}</p>
        <h1 className="qrs-event">{event.name}</h1>
        <p className="qrs-edition">{edition.label}</p>

        <motion.div
          className="qrs-qr-wrap"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <canvas ref={canvasRef} className="qrs-canvas" />
        </motion.div>

        <motion.div
          className="qrs-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isFeedback ? (
            <>
              <p className="qrs-heading">Share your feedback</p>
              <p className="qrs-sub">Scan the QR code to tell us what you thought</p>
            </>
          ) : (
            <p className="qrs-sub">Scan to register and follow the scores in real time</p>
          )}
        </motion.div>

        <motion.p
          className="qrs-url"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 0.7 }}
        >
          {url}
        </motion.p>
      </motion.div>
    </div>
  )
}
