import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { AppState } from '../store'
import { computeLeaderboard } from '../store/scoring'
import '../styles/progression.css'

interface Frame {
  gameName: string
  teams: { teamId: string; teamName: string; rank: number; cumulativeScore: number }[]
}

function buildFrames(editionId: string, store: AppState): Frame[] {
  const games = store.games
    .filter(g => g.edition_id === editionId && g.status !== 'pending')
    .sort((a, b) => a.order - b.order)
  const edition = store.editions.find(e => e.id === editionId)
  const event = store.events.find(e => e.id === edition?.event_id)
  const client = store.clients.find(c => c.id === event?.client_id)
  const teams = store.teams.filter(t => t.client_id === client?.id)
  if (!games.length || !teams.length) return []

  const frames: Frame[] = []
  for (let i = 0; i < games.length; i++) {
    const gamesUpTo = games.slice(0, i + 1)
    const lb = computeLeaderboard({
      games: gamesUpTo,
      teams,
      standardResults: store.standardResults,
      pointsResults: store.pointsResults,
      participantResults: store.participantResults,
      cumulativeRounds: store.cumulativeRounds,
      bracketMatches: store.bracketMatches,
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

const COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9']

export default function Progression() {
  const { editionId } = useParams<{ editionId: string }>()
  const navigate = useNavigate()
  const store = useStore(s => s)

  const frames = useMemo(() => buildFrames(editionId!, store), [
    editionId, store.games, store.standardResults, store.pointsResults,
    store.participantResults, store.cumulativeRounds, store.bracketMatches,
    store.teams, store.editions, store.events, store.clients,
  ])

  const edition = store.editions.find(e => e.id === editionId)
  const event = store.events.find(e => e.id === edition?.event_id)
  const client = store.clients.find(c => c.id === event?.client_id)

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
    teamIds.forEach((id, i) => { map[id] = COLORS[i % COLORS.length] })
    return map
  }, [teamIds.join(',')])

  const STEP_DURATION = 800

  const drawChart = useCallback((upTo: number) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !frames.length) return

    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth
    const H = container.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const marginL = Math.min(140, W * 0.18)
    const marginR = Math.min(140, W * 0.18)
    const marginT = 60
    const marginB = 40
    const chartW = W - marginL - marginR
    const chartH = H - marginT - marginB

    const xStep = numGames > 1 ? chartW / (numGames - 1) : chartW / 2
    const yStep = numTeams > 1 ? chartH / (numTeams - 1) : chartH / 2
    const x = (gi: number) => marginL + gi * xStep
    const y = (rank: number) => marginT + (rank - 1) * yStep

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let r = 1; r <= numTeams; r++) {
      ctx.beginPath()
      ctx.moveTo(marginL - 10, y(r))
      ctx.lineTo(W - marginR + 10, y(r))
      ctx.stroke()
    }

    // Game labels (top)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    for (let gi = 0; gi <= upTo && gi < numGames; gi++) {
      const name = frames[gi].gameName.toUpperCase()
      const xPos = x(gi)
      ctx.globalAlpha = gi === upTo ? 1 : 0.5
      ctx.fillText(name, xPos, marginT - 16)
    }
    ctx.globalAlpha = 1

    // Rank labels (left axis)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
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
        ctx.fillStyle = '#0a0a14'
        ctx.beginPath()
        ctx.arc(x(gi), y(team.rank), DOT_R * 0.45, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Team name labels on the right of the last visible frame
    if (upTo >= 0 && upTo < numGames) {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = '700 13px system-ui'
      const lastFrame = frames[upTo]
      for (const team of lastFrame.teams) {
        ctx.fillStyle = teamColorMap[team.teamId]
        const labelX = x(upTo) + DOT_R + 8
        ctx.fillText(`${team.teamName}  (${team.cumulativeScore})`, labelX, y(team.rank))
      }
    }

    // Team name labels on the left (initial position)
    if (upTo >= 0) {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = '700 13px system-ui'
      const firstFrame = frames[0]
      for (const team of firstFrame.teams) {
        ctx.fillStyle = teamColorMap[team.teamId]
        ctx.globalAlpha = 0.6
        ctx.fillText(team.teamName, marginL - 20, y(team.rank))
      }
      ctx.globalAlpha = 1
    }
  }, [frames, numGames, numTeams, teamIds, teamColorMap])

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

      <header className="prog-header">
        <p className="prog-client">{client?.name}</p>
        <h1 className="prog-title">Standings Progression</h1>
        <p className="prog-subtitle">{event?.name} · {edition?.label}</p>
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
    </div>
  )
}
