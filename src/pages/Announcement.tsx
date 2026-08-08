import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { computeLeaderboard } from '../store/scoring'
import type { LeaderboardEntry } from '../types'
import ControlMenu from '../components/ControlMenu'
import BrandLogos from '../components/BrandLogos'
import '../styles/announcement.css'

function ordinal(n: number) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

const CONFETTI_COLORS = ['#f5c518', '#ff4d4d', '#4ade80', '#60a5fa', '#e879f9', '#fb923c', '#fff']

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 120 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2.5 + Math.random() * 3.5}s`,
    width: `${5 + Math.random() * 8}px`,
    height: `${10 + Math.random() * 14}px`,
    tilt: Math.random() > 0.5 ? 1 : -1,
  })), [])

  return (
    <div className="ann-confetti-container" aria-hidden>
      {pieces.map(p => (
        <div
          key={p.id}
          className="ann-confetti-piece"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            '--tilt': p.tilt,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function Fireworks() {
  const bursts = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    top: `${10 + Math.random() * 50}%`,
    delay: `${Math.random() * 2.5}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 60 + Math.random() * 80,
  })), [])

  return (
    <div className="ann-fireworks" aria-hidden>
      {bursts.map(b => (
        <div
          key={b.id}
          className="ann-firework"
          style={{
            left: b.left,
            top: b.top,
            animationDelay: b.delay,
            '--fw-color': b.color,
            '--fw-size': `${b.size}px`,
          } as React.CSSProperties}
        >
          {Array.from({ length: 12 }, (_, j) => (
            <span
              key={j}
              className="ann-spark"
              style={{ '--angle': `${j * 30}deg` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MysteryCard({ rank }: { rank: number }) {
  return (
    <div className="ann-mystery">
      <motion.p
        className="ann-mystery-qmarks"
        animate={{ scale: [1, 1.06, 1], opacity: [0.12, 0.3, 0.12] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        ???
      </motion.p>
      <motion.p
        className="ann-mystery-position"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {ordinal(rank).toUpperCase()} PLACE
      </motion.p>
    </div>
  )
}

function RevealCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <motion.div
      className="ann-reveal-card"
      initial={{ scale: 3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.8 }}
    >
      <h2 className="ann-reveal-name">{entry.team_name}</h2>
      <span className="ann-reveal-meta">
        {ordinal(entry.rank).toUpperCase()} PLACE &nbsp;·&nbsp; {entry.total_score} pts
      </span>
    </motion.div>
  )
}

export default function Announcement() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()

  const currentRole = useStore(s => s.currentRole)
  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)
  const allTeams = useStore(s => s.teams)
  const allGames = useStore(s => s.games)
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const participantAttemptResults = useStore(s => s.participantAttemptResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const bracketMatches = useStore(s => s.bracketMatches)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === event?.client_id)
  const teams = useMemo(() => allTeams.filter(t => t.client_id === client?.id), [allTeams, client])
  const games = useMemo(
    () => allGames.filter(g => g.edition_id === editionId).sort((a, b) => a.order - b.order),
    [allGames, editionId]
  )

  const entries = useMemo(() => computeLeaderboard({
    games, teams, scoringMode: edition?.scoring_mode ?? 'dynamic',
    standardResults, pointsResults, participantResults, participantAttemptResults, cumulativeRounds, bracketMatches,
  }), [games, teams, edition, standardResults, pointsResults, participantResults, participantAttemptResults, cumulativeRounds, bracketMatches])

  // worst first, but 1st place goes straight to champion screen
  const revealOrder = useMemo(() => [...entries].sort((a, b) => b.rank - a.rank), [entries])
  const total = revealOrder.length

  // step 0 = intro, step 1..total-1 = reveal from last to 2nd, then champion
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'revealing' | 'winner'>('intro')
  const [locked, setLocked] = useState(false)
  const [flash, setFlash] = useState(false)

  const revealed = revealOrder.slice(0, step)
  const current = revealed[revealed.length - 1] ?? null
  const nextEntry = step < total ? revealOrder[step] : null

  const advance = useCallback(() => {
    if (locked) return

    if (phase === 'intro') {
      setPhase('revealing')
      return
    }

    if (phase === 'revealing' && step >= total - 1) {
      setPhase('winner')
      return
    }

    if (phase === 'revealing' && step < total) {
      setLocked(true)
      setFlash(true)
      setTimeout(() => setFlash(false), 200)

      const next = step + 1
      setStep(next)

      // after revealing 2nd place, unlock and wait — the NEXT click triggers champion
      const delay = 700
      setTimeout(() => { setLocked(false) }, delay)
    }
  }, [locked, phase, step, total])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  if (!edition || !event || !client) {
    return (
      <div className="ann-root" style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Edition not found.
      </div>
    )
  }

  // ── INTRO ─────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="ann-root ann-center" onClick={advance}>
        <ControlMenu editionId={editionId!} currentView="announcement" role={currentRole} />
        <BrandLogos variant="corner" />
        <div className="ann-intro-bg" />
        <motion.div
          className="ann-intro-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="ann-intro-client">{client.name}</p>
          <h1 className="ann-intro-event">{event.name}</h1>
          <p className="ann-intro-edition">{edition.label}</p>
          <div className="ann-intro-divider" />
          <p className="ann-intro-title">Final Results</p>
          <motion.p
            className="ann-intro-cta"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ▼ &nbsp; tap anywhere to begin &nbsp; ▼
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // ── WINNER / CHAMPION ─────────────────────────────────────────
  if (phase === 'winner') {
    const winner = revealOrder[total - 1]
    return (
      <div className="ann-root ann-center ann-winner-root" onClick={() => navigate(-1)}>
        <ControlMenu editionId={editionId!} currentView="announcement" role={currentRole} />
        <BrandLogos variant="corner" />
        <Confetti />
        <Fireworks />
        <div className="ann-winner-glow" style={{ '--wc': winner.team_color } as React.CSSProperties} />

        <motion.div
          className="ann-winner-content"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.15 }}
        >
          <motion.div
            className="ann-winner-trophy"
            animate={{ y: [0, -14, 0], rotate: [-5, 5, -5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            🏆
          </motion.div>

          <motion.p
            className="ann-winner-label"
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.45em' }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            CHAMPIONS
          </motion.p>

          <motion.h1
            className="ann-winner-name"
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 180, damping: 16 }}
          >
            {winner.team_name}
          </motion.h1>

          <motion.p
            className="ann-winner-score"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            {winner.total_score} points
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // ── REVEAL SCREEN ─────────────────────────────────────────────
  return (
    <div className="ann-root ann-center" onClick={advance}>
      <ControlMenu editionId={editionId!} currentView="announcement" role={currentRole} />
      <BrandLogos variant="corner" />
      {flash && <div className="ann-flash" key={step} />}

      <motion.div
        className="ann-glow"
        animate={{ opacity: step === 0 ? 0.04 : 0.12 }}
        transition={{ duration: 0.8 }}
        style={{ '--team-color': current?.team_color ?? '#6366f1' } as React.CSSProperties}
      />

      {/* Progress dots */}
      <div className="ann-progress" aria-hidden>
        {revealOrder.slice(0, -1).map((_, i) => (
          <span key={i} className={`ann-dot ${i < step ? 'filled' : ''}`} />
        ))}
      </div>

      {/* Stage */}
      <div className="ann-stage">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="mystery-first"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
            >
              <MysteryCard rank={nextEntry!.rank} />
            </motion.div>
          ) : (
            <RevealCard key={`card-${step}`} entry={current!} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
