import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { AppState } from '../store'
import { computeLeaderboard } from '../store/scoring'
import ControlMenu from '../components/ControlMenu'
import BrandLogos from '../components/BrandLogos'
import { useClientTheme } from '../hooks/useClientTheme'
import '../styles/progression.css'

interface Frame {
  gameName: string
  teams: { teamId: string; teamName: string; rank: number; cumulativeScore: number }[]
}

function lastResultTime(gameId: string, store: AppState): number {
  const ts: number[] = []
  const push = (r: { game_id: string; created_at?: string }) => {
    if (r.game_id === gameId && r.created_at) ts.push(new Date(r.created_at).getTime())
  }
  store.standardResults.forEach(push)
  store.pointsResults.forEach(push)
  store.participantResults.forEach(push)
  store.participantAttemptResults.forEach(push)
  return ts.length ? Math.max(...ts) : Infinity
}

function buildFrames(editionId: string, store: AppState, gamePenalties: import('../types').GamePenalty[]): Frame[] {
  const games = store.games
    .filter(g => g.edition_id === editionId && g.status === 'completed' && !g.is_fun)
    .sort((a, b) => {
      // Primary: when the game was started (most reliable play-order signal)
      const sa = a.started_at ? new Date(a.started_at).getTime() : Infinity
      const sb = b.started_at ? new Date(b.started_at).getTime() : Infinity
      if (sa !== sb) return sa - sb
      // Fallback: last result entry time (for games without started_at)
      const ta = lastResultTime(a.id, store)
      const tb = lastResultTime(b.id, store)
      if (ta !== tb) return ta - tb
      return a.order - b.order
    })
  const edition = store.editions.find(e => e.id === editionId)
  const event = store.events.find(e => e.id === edition?.event_id)
  const teams = store.teams.filter(t => t.event_id === event?.id)
  if (!games.length || !teams.length) return []

  const frames: Frame[] = []
  for (let i = 0; i < games.length; i++) {
    const gamesUpTo = games.slice(0, i + 1)
    const lb = computeLeaderboard({
      games: gamesUpTo,
      teams,
      edition,
      standardResults: store.standardResults,
      pointsResults: store.pointsResults,
      participantResults: store.participantResults,
      participantAttemptResults: store.participantAttemptResults,
      cumulativeRounds: store.cumulativeRounds,
      bracketMatches: store.bracketMatches,
      gamePenalties,
    })
    frames.push({
      gameName: games[i].name,
      teams: lb.map(e => ({
        teamId: e.team_id,
        teamName: e.team_name,
        rank: e.rank,
        cumulativeScore: e.total_score,
      })),
    })
  }
  return frames
}

export default function Progression() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()
  const store = useStore(s => s)
  const currentRole = store.currentRole

  const gamePenalties = useStore(s => s.gamePenalties)
  const frames = useMemo(() => buildFrames(editionId!, store, gamePenalties), [
    editionId, store.games, store.standardResults, store.pointsResults,
    store.participantResults, store.participantAttemptResults, store.cumulativeRounds, store.bracketMatches,
    store.teams, store.editions, store.events, store.clients, gamePenalties,
  ])

  const edition = store.editions.find(e => e.id === editionId)
  const event = store.events.find(e => e.id === edition?.event_id)
  const client = store.clients.find(c => c.id === event?.client_id)

  const theme = useClientTheme(client?.id)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentFrame, setCurrentFrame] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const numGames = frames.length
  const numTeams = frames[0]?.teams.length ?? 0
  const teamIds = frames[0]?.teams.map(t => t.teamId) ?? []
  const teamColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of store.teams) map[t.id] = t.color
    return map
  }, [store.teams])

  const STEP_DURATION = 800

  const drawChart = useCallback((upTo: number) => {
    const { gridLine, subText, faintText, bg } = theme
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !frames.length) return

    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth
    const marginL = Math.min(140, W * 0.18)
    const marginR = Math.min(140, W * 0.18)
    const marginT = 60
    const marginB = 40
    const YSTEP = Math.min(80, Math.max(48, (W - marginL - marginR) * 0.07))
    const H = marginT + marginB + Math.max(0, numTeams - 1) * YSTEP
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const chartW = W - marginL - marginR
    const xStep = numGames > 1 ? chartW / (numGames - 1) : chartW / 2
    const yStep = YSTEP
    const x = (gi: number) => marginL + gi * xStep
    const y = (rank: number) => marginT + (rank - 1) * yStep

    // Grid lines
    ctx.strokeStyle = gridLine
    ctx.lineWidth = 1
    for (let r = 1; r <= numTeams; r++) {
      ctx.beginPath()
      ctx.moveTo(marginL - 10, y(r))
      ctx.lineTo(W - marginR + 10, y(r))
      ctx.stroke()
    }

    // Game labels (top) — first word only
    ctx.fillStyle = subText
    ctx.font = '600 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    for (let gi = 0; gi <= upTo && gi < numGames; gi++) {
      const name = frames[gi].gameName.split(' ')[0].toUpperCase()
      const xPos = x(gi)
      ctx.globalAlpha = gi === upTo ? 1 : 0.5
      ctx.fillText(name, xPos, marginT - 16)
    }
    ctx.globalAlpha = 1

    // Rank labels (left axis)
    ctx.fillStyle = faintText
    ctx.font = '700 12px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let r = 1; r <= numTeams; r++) {
      ctx.fillText(`#${r}`, marginL - 20, y(r))
    }

    // Lines and dots
    const DOT_R = Math.min(14, W * 0.02)
    for (const id of teamIds) {
      const color = teamColorMap[id]
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(2, DOT_R * 0.4)
      ctx.lineCap = 'round'

      // Lines
      for (let gi = 1; gi <= upTo && gi < numGames; gi++) {
        const prevFrame = frames[gi - 1]
        const currFrame = frames[gi]
        const prevTeam = prevFrame.teams.find(t => t.teamId === id)
        const currTeam = currFrame.teams.find(t => t.teamId === id)
        if (!prevTeam || !currTeam) continue

        const x1 = x(gi - 1), y1 = y(prevTeam.rank)
        const x2 = x(gi), y2 = y(currTeam.rank)
        const mx = (x1 + x2) / 2

        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2)
        ctx.stroke()
      }

      // Dots
      ctx.globalAlpha = 1
      for (let gi = 0; gi <= upTo && gi < numGames; gi++) {
        const team = frames[gi].teams.find(t => t.teamId === id)
        if (!team) continue
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x(gi), y(team.rank), DOT_R, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.arc(x(gi), y(team.rank), DOT_R * 0.45, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Team name labels on the right of the last visible frame — first word only
    if (upTo >= 0 && upTo < numGames) {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = '700 13px system-ui'
      const lastFrame = frames[upTo]
      for (const team of lastFrame.teams) {
        ctx.fillStyle = teamColorMap[team.teamId]
        const labelX = x(upTo) + DOT_R + 8
        const shortName = team.teamName.split(' ')[0]
        ctx.fillText(`${shortName}  (${team.cumulativeScore})`, labelX, y(team.rank))
      }
    }

    // Team name labels on the left (initial position) — first word only
    if (upTo >= 0) {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = '700 13px system-ui'
      const firstFrame = frames[0]
      for (const team of firstFrame.teams) {
        ctx.fillStyle = teamColorMap[team.teamId]
        ctx.globalAlpha = 0.6
        ctx.fillText(team.teamName.split(' ')[0], marginL - 20, y(team.rank))
      }
      ctx.globalAlpha = 1
    }
  }, [frames, numGames, numTeams, teamIds, teamColorMap, theme])

  useEffect(() => { drawChart(currentFrame) }, [currentFrame, drawChart])

  useEffect(() => {
    const handleResize = () => drawChart(currentFrame)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentFrame, drawChart])

  function stepForward() {
    setCurrentFrame(f => {
      if (f >= numGames - 1) { stopPlay(); return f }
      return f + 1
    })
  }

  function startPlay() {
    if (currentFrame >= numGames - 1) {
      setCurrentFrame(-1)
    }
    setPlaying(true)
  }

  function stopPlay() {
    setPlaying(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  useEffect(() => {
    if (!playing) return
    stepForward()
    timerRef.current = setInterval(() => {
      setCurrentFrame(f => {
        if (f >= numGames - 1) { setPlaying(false); return f }
        return f + 1
      })
    }, STEP_DURATION)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing])

  function restart() {
    stopPlay()
    setCurrentFrame(-1)
  }

  const atEnd = currentFrame >= numGames - 1

  if (!frames.length) {
    return (
      <div className="prog-root">
        <button className="prog-back" onClick={() => navigate(-1)}>← Back</button>
        <ControlMenu editionId={editionId!} currentView="progression" role={currentRole} />
        <div className="prog-empty">
          <div style={{ fontSize: '3rem' }}>📊</div>
          <p>No completed games yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="prog-root">
      <button className="prog-back" onClick={() => navigate(-1)}>← Back</button>
      <ControlMenu editionId={editionId!} currentView="progression" role={currentRole} />

      <header className="prog-header">
        <h1 className="prog-title">{event?.name}</h1>
        <p className="prog-subtitle">{edition?.label}</p>
      </header>

      <div className="prog-chart-wrap" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>

      <div className="prog-controls">
        <button className="prog-btn" onClick={restart}>↺ Restart</button>
        <button className="prog-btn prog-btn-primary" onClick={() => {
          if (atEnd) { restart(); setTimeout(startPlay, 50) }
          else playing ? stopPlay() : startPlay()
        }}>
          {atEnd ? '↺ Replay' : playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="prog-btn" onClick={() => { stopPlay(); stepForward() }}>⏭ Step</button>
      </div>

      <BrandLogos orgId={client?.organization_id} variant="corner" />
    </div>
  )
}
