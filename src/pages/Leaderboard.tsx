import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import type { LeaderboardEntry } from '../types'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { computeLeaderboard } from '../store/scoring'
import '../styles/leaderboard.css'

const MEDALS = ['🥇', '🥈', '🥉']

function RankBadge({ rank, big = false }: { rank: number; big?: boolean }) {
  if (rank <= 3) return <span className={big ? 'medal medal-big' : 'medal'}>{MEDALS[rank - 1]}</span>
  return <span className={big ? 'rank-number rank-number-big' : 'rank-number'}>#{rank}</span>
}

function ScoreCounter({ value, big = false }: { value: number; big?: boolean }) {
  const motionVal = useMotionValue(value)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState(value)
  useEffect(() => { motionVal.set(value) }, [value, motionVal])
  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring])
  return <span className={big ? 'score score-big' : 'score'}>{display} pts</span>
}

function RankDelta({ curr, prev }: { curr: number; prev?: number }) {
  if (prev === undefined || prev === curr) return null
  const up = curr < prev
  return (
    <motion.span
      className={`rank-delta ${up ? 'up' : 'down'}`}
      initial={{ opacity: 0, y: up ? 8 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {up ? '▲' : '▼'} {Math.abs(prev - curr)}
    </motion.span>
  )
}

function UpdateFlash({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="update-flash"
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          ⚡ {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GameBreakdown({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="lb-breakdown">
      {entry.game_scores.map(g => (
        <div key={g.game_id} className="lb-breakdown-row">
          <span className="lb-breakdown-name">{g.game_name}</span>
          <span className="lb-breakdown-score">{g.score > 0 ? `+${g.score}` : '—'}</span>
        </div>
      ))}
      {entry.game_scores.length === 0 && (
        <p className="lb-breakdown-empty">No scored games yet</p>
      )}
    </div>
  )
}

// ── Big Screen ─────────────────────────────────────────────────
function BigScreenLeaderboard({
  entries, clientName, eventName, editionLabel, editionId, flashMessage,
}: {
  entries: LeaderboardEntry[]
  clientName: string
  eventName: string
  editionLabel: string
  editionId: string
  flashMessage: string | null
}) {
  const navigate = useNavigate()
  return (
    <div className="bs-root">
      <div className="bs-blob bs-blob-1" />
      <div className="bs-blob bs-blob-2" />
      <div className="bs-blob bs-blob-3" />

      <UpdateFlash message={flashMessage} />

      <button className="bs-progression-btn" onClick={() => navigate(`/progression/${editionId}`)} title="View progression">
        📊
      </button>

      <header className="bs-header">
        <div className="bs-header-left">
          <p className="bs-client">{clientName}</p>
          <h1 className="bs-title">{eventName}</h1>
          <div className="bs-meta">
            <span className="bs-edition">{editionLabel}</span>
            <span className="bs-live"><span className="bs-live-dot" />LIVE</span>
          </div>
        </div>
      </header>

      <div className="bs-podium">
        {entries.slice(0, 3).map((entry, i) => (
          <motion.div
            key={entry.team_id}
            className={`bs-podium-card rank-${entry.rank}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className="bs-podium-top">
              <RankBadge rank={entry.rank} big />
              <RankDelta curr={entry.rank} prev={entry.prev_rank} />
            </div>
            <div className="bs-podium-name">{entry.team_name}</div>
            <ScoreCounter value={entry.total_score} big />
          </motion.div>
        ))}
      </div>

      {entries.length > 3 && (
        <div className="bs-rest">
          {entries.slice(3).map((entry, i) => (
            <motion.div
              key={entry.team_id}
              className="bs-rest-row"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="bs-rest-left">
                <RankBadge rank={entry.rank} />
                <RankDelta curr={entry.rank} prev={entry.prev_rank} />
              </div>
              <div className="bs-rest-team">
                <span className="bs-rest-name">{entry.team_name}</span>
              </div>
              <ScoreCounter value={entry.total_score} />
            </motion.div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="bs-empty">No results yet — scores will appear here</p>
      )}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────
export default function Leaderboard() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isBigScreen = searchParams.get('display') === 'big'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const editions = useStore(s => s.editions)
  const events = useStore(s => s.events)
  const clients = useStore(s => s.clients)
  const allTeams = useStore(s => s.teams)
  const allGames = useStore(s => s.games)
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const bracketMatches = useStore(s => s.bracketMatches)
  const refreshEditionResults = useStore(s => s.refreshEditionResults)

  const edition = useMemo(() => editions.find(e => e.id === editionId), [editions, editionId])
  const event = useMemo(() => events.find(e => e.id === edition?.event_id), [events, edition])
  const client = useMemo(() => clients.find(c => c.id === event?.client_id), [clients, event])
  const teams = useMemo(() => allTeams.filter(t => t.client_id === client?.id), [allTeams, client])
  const games = useMemo(
    () => allGames.filter(g => g.edition_id === editionId).sort((a, b) => a.order - b.order),
    [allGames, editionId]
  )

  const [flashMessage, setFlashMessage] = useState<string | null>(null)
  const prevRef = useRef<Map<string, number>>(new Map())
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a ref so the Realtime handler always sees the latest games without
  // causing the subscription to tear down and reconnect on every refresh.
  const allGamesRef = useRef(allGames)
  useEffect(() => { allGamesRef.current = allGames }, [allGames])

  function triggerFlash(msg: string) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setFlashMessage(msg)
    flashTimerRef.current = setTimeout(() => setFlashMessage(null), 3000)
  }

  // useMemo computes entries on the same render as the store update,
  // avoiding the extra render cycle that useEffect+setState would cause.
  const entries = useMemo(() => {
    if (!teams.length || !games.length) return []
    const computed = computeLeaderboard({
      games, teams, standardResults, pointsResults,
      participantResults, cumulativeRounds, bracketMatches,
    })
    const result = computed.map(e => ({ ...e, prev_rank: prevRef.current.get(e.team_id) }))
    prevRef.current = new Map(computed.map(e => [e.team_id, e.rank]))
    return result
  }, [games, teams, standardResults, pointsResults, participantResults, cumulativeRounds, bracketMatches])

  // Realtime subscription — refresh when any result changes in Supabase.
  // editionId is the only dep; allGames is read via ref to avoid reconnects.
  useEffect(() => {
    if (!editionId) return

    function handleResultChange(payload: { new?: { game_id?: string } }) {
      const gameId = payload.new?.game_id
      const gameName = gameId ? allGamesRef.current.find(g => g.id === gameId)?.name : null
      refreshEditionResults(editionId!).then(() => {
        triggerFlash(gameName ? `New results — ${gameName}` : 'Scores updated')
      })
    }

    function handleGameChange() {
      refreshEditionResults(editionId!).then(() => {
        triggerFlash('Game status updated')
      })
    }

    const channel = supabase
      .channel(`edition-${editionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'standard_results' }, handleResultChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points_results' }, handleResultChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participant_results' }, handleResultChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cumulative_rounds' }, handleResultChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bracket_matches' }, handleResultChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, handleGameChange)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [editionId])

  if (!edition || !event || !client) {
    return (
      <div className="lb-root">
        <p className="lb-empty">Edition not found.</p>
        <button className="lb-back" onClick={() => navigate('/')}>← Back</button>
      </div>
    )
  }

  if (isBigScreen) {
    return (
      <BigScreenLeaderboard
        entries={entries}
        clientName={client.name}
        eventName={event.name}
        editionLabel={edition.label}
        editionId={editionId!}
        flashMessage={flashMessage}
      />
    )
  }

  return (
    <div className="lb-root">
      <button className="lb-back" onClick={() => navigate('/')}>← Back</button>
      <button
        className="lb-present-btn"
        onClick={() => window.open(`/leaderboard/${editionId}?display=big`, '_blank')}
        title="Open big screen view"
      >
        ⛶ Present
      </button>

      <motion.header
        className="lb-header"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <p className="lb-client">{client.name}</p>
        <h1 className="lb-title">🏆 {event.name}</h1>
        <p className="lb-subtitle">{edition.label} · Live Leaderboard</p>
      </motion.header>

      <UpdateFlash message={flashMessage} />

      <div className="lb-list">
        {entries.map((entry, i) => {
          const isExpanded = expandedId === entry.team_id
          return (
            <motion.div
              key={entry.team_id}
              className={`lb-row rank-${entry.rank} ${isExpanded ? 'expanded' : ''}`}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ opacity: { duration: 0.3 }, x: { duration: 0.4, delay: i * 0.05 } }}
              onClick={() => setExpandedId(isExpanded ? null : entry.team_id)}
            >
              <div className="lb-row-main">
                <div className="lb-rank">
                  <RankBadge rank={entry.rank} />
                  <RankDelta curr={entry.rank} prev={entry.prev_rank} />
                </div>
                <div className="lb-team">
                  <span className="team-name">{entry.team_name}</span>
                </div>
                <div className="lb-score">
                  <ScoreCounter value={entry.total_score} />
                  <span className="lb-expand-chevron">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              <div className={`lb-breakdown-wrap ${isExpanded ? 'open' : ''}`}>
                <GameBreakdown entry={entry} />
              </div>
            </motion.div>
          )
        })}
        {entries.length === 0 && (
          <motion.p className="lb-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            No results yet.
          </motion.p>
        )}
      </div>
    </div>
  )
}
