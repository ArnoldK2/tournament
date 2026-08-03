import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './control-menu.css'

export type ControlView =
  | 'leaderboard'
  | 'bigscreen'
  | 'progression'
  | 'announcement'
  | 'register-qr'
  | 'feedback-qr'

interface Props {
  editionId: string
  currentView: ControlView
  role: string
  /** true → open projection views in a new tab (normal leaderboard)
   *  false → navigate within the current tab (projection pages) */
  newTab?: boolean
  onExport?: () => void
}

const VIEWS = [
  { key: 'bigscreen',     icon: '⛶',  label: 'Big Screen',          path: (id: string) => `/leaderboard/${id}?display=big` },
  { key: 'progression',   icon: '📊',  label: 'Progression Chart',   path: (id: string) => `/progression/${id}` },
  { key: 'announcement',  icon: '📣',  label: 'Final Announcement',  path: (id: string) => `/announcement/${id}` },
] as const

const ADMIN_VIEWS = [
  { key: 'register-qr',  icon: '📲',  label: 'Registration QR Screen', path: (id: string) => `/screen/${id}/register` },
  { key: 'feedback-qr',  icon: '💬',  label: 'Feedback QR Screen',     path: (id: string) => `/screen/${id}/feedback` },
] as const

export default function ControlMenu({ editionId, currentView, role, newTab = false, onExport }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function go(path: string) {
    setOpen(false)
    if (newTab) {
      window.open(path, '_blank')
    } else {
      navigate(path)
    }
  }

  const isAdmin = role !== 'guest'

  return (
    <div className="cm-wrap">
      <button
        className={`cm-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Control menu"
      >
        ···
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="cm-backdrop" onClick={() => setOpen(false)} />
            <motion.div
              className="cm-dropdown"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <p className="cm-section-label">Views</p>
              {VIEWS.map(v => (
                <button
                  key={v.key}
                  className={`cm-item ${currentView === v.key ? 'current' : ''}`}
                  onClick={() => go(v.path(editionId))}
                >
                  <span className="cm-icon">{v.icon}</span>
                  <span className="cm-label">{v.label}</span>
                  {currentView === v.key && <span className="cm-check">✓</span>}
                </button>
              ))}

              {isAdmin && (
                <>
                  <div className="cm-divider" />
                  <p className="cm-section-label">Admin</p>
                  {ADMIN_VIEWS.map(v => (
                    <button
                      key={v.key}
                      className={`cm-item ${currentView === v.key ? 'current' : ''}`}
                      onClick={() => go(v.path(editionId))}
                    >
                      <span className="cm-icon">{v.icon}</span>
                      <span className="cm-label">{v.label}</span>
                      {currentView === v.key && <span className="cm-check">✓</span>}
                    </button>
                  ))}

                  {onExport && (
                    <>
                      <div className="cm-divider" />
                      <button className="cm-item" onClick={() => { onExport(); setOpen(false) }}>
                        <span className="cm-icon">📥</span>
                        <span className="cm-label">Export event data</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
