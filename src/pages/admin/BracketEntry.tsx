import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import type { BracketMatch, Game, Team } from '../../types'
import '../../styles/admin.css'
import '../../styles/workspace.css'
import '../../styles/bracket.css'

interface Props {
  game: Game
  teams: Team[]
}

// ── Bracket generation ────────────────────────────────────────
function nextPow2(n: number) {
  let p = 1; while (p < n) p *= 2; return p
}

function generateSingleElim(teams: Team[], gameId: string): Omit<BracketMatch, 'id'>[] {
  const size = nextPow2(teams.length)
  const padded: (Team | null)[] = [...teams]
  while (padded.length < size) padded.push(null) // byes
  const matches: Omit<BracketMatch, 'id'>[] = []
  for (let i = 0; i < padded.length; i += 2) {
    const a = padded[i]; const b = padded[i + 1]
    const byeWinner = b === null ? a?.id ?? null : a === null ? b?.id ?? null : null
    matches.push({ game_id: gameId, round: 1, match_number: i / 2 + 1, team_a_id: a?.id ?? null, team_b_id: b?.id ?? null, score_a: null, score_b: null, winner_id: byeWinner, loser_bracket: false })
  }
  return matches
}

function generateRoundRobin(teams: Team[], gameId: string): Omit<BracketMatch, 'id'>[] {
  const matches: Omit<BracketMatch, 'id'>[] = []
  let mn = 1
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({ game_id: gameId, round: 1, match_number: mn++, team_a_id: teams[i].id, team_b_id: teams[j].id, score_a: null, score_b: null, winner_id: null, loser_bracket: false })
    }
  }
  return matches
}

function generateNextRound(currentMatches: BracketMatch[], round: number, gameId: string): Omit<BracketMatch, 'id'>[] {
  const roundMatches = currentMatches.filter(m => m.round === round && !m.loser_bracket).sort((a, b) => a.match_number - b.match_number)
  const winners = roundMatches.map(m => m.winner_id).filter(Boolean) as string[]
  if (winners.length < 2) return []
  const next: Omit<BracketMatch, 'id'>[] = []
  for (let i = 0; i < winners.length; i += 2) {
    next.push({ game_id: gameId, round: round + 1, match_number: i / 2 + 1, team_a_id: winners[i], team_b_id: winners[i + 1] ?? null, score_a: null, score_b: null, winner_id: winners[i + 1] ? null : winners[i], loser_bracket: false })
  }
  return next
}

// ── Round Robin component ─────────────────────────────────────
function RoundRobinEntry({ game, teams }: Props) {
  const allMatches = useStore(s => s.bracketMatches)
  const saveBracketMatch = useStore(s => s.saveBracketMatch)
  const updateBracketMatch = useStore(s => s.updateBracketMatch)

  const matches = useMemo(() => allMatches.filter(m => m.game_id === game.id), [allMatches, game.id])

  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>(() =>
    Object.fromEntries(matches.map(m => [m.id, { a: m.score_a?.toString() ?? '', b: m.score_b?.toString() ?? '' }]))
  )

  function initBracket() {
    const generated = generateRoundRobin(teams, game.id)
    generated.forEach(m => saveBracketMatch(m))
  }

  function saveMatch(match: BracketMatch) {
    const sa = parseFloat(scores[match.id]?.a ?? '')
    const sb = parseFloat(scores[match.id]?.b ?? '')
    const winner = isNaN(sa) || isNaN(sb) ? null : sa > sb ? match.team_a_id : sb > sa ? match.team_b_id : null
    updateBracketMatch(match.id, { score_a: isNaN(sa) ? null : sa, score_b: isNaN(sb) ? null : sb, winner_id: winner })
  }

  // Standings
  const standings = useMemo(() => {
    const pts: Record<string, { w: number; d: number; l: number; gf: number; ga: number }> = {}
    for (const t of teams) pts[t.id] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
    for (const m of matches) {
      if (m.score_a === null || m.score_b === null) continue
      const a = m.team_a_id!; const b = m.team_b_id!
      pts[a].gf += m.score_a; pts[a].ga += m.score_b
      pts[b].gf += m.score_b; pts[b].ga += m.score_a
      if (m.score_a > m.score_b) { pts[a].w++; pts[b].l++ }
      else if (m.score_b > m.score_a) { pts[b].w++; pts[a].l++ }
      else { pts[a].d++; pts[b].d++ }
    }
    return teams.map(t => ({ team: t, ...pts[t.id], points: pts[t.id].w * 3 + pts[t.id].d }))
      .sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))
  }, [matches, teams])

  if (matches.length === 0) {
    return (
      <div className="bracket-init">
        <p className="re-hint">Generate all {teams.length * (teams.length - 1) / 2} match-ups</p>
        <button className="admin-add-btn" onClick={initBracket}>Generate Round Robin</button>
      </div>
    )
  }

  return (
    <div className="bracket-rr">
      {/* Standings */}
      <div className="rr-standings">
        <p className="bracket-section-label">Standings</p>
        <div className="rr-table">
          <div className="rr-thead">
            <span className="rr-th-team">Team</span>
            <span>W</span><span>D</span><span>L</span><span>Pts</span>
          </div>
          {standings.map((row, i) => (
            <div key={row.team.id} className="rr-row" style={{ '--team-color': row.team.color } as React.CSSProperties}>
              <span className="rr-rank">{i + 1}</span>
              <span className="rr-dot" />
              <span className="rr-team-name">{row.team.name}</span>
              <span className="rr-stat">{row.w}</span>
              <span className="rr-stat">{row.d}</span>
              <span className="rr-stat">{row.l}</span>
              <span className="rr-stat bold">{row.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matches */}
      <p className="bracket-section-label">Matches</p>
      <div className="bracket-matches">
        {matches.map(match => {
          const ta = teams.find(t => t.id === match.team_a_id)
          const tb = teams.find(t => t.id === match.team_b_id)
          const done = match.score_a !== null && match.score_b !== null
          return (
            <div key={match.id} className={`bm-row ${done ? 'done' : ''}`}>
              <div className="bm-team" style={{ '--team-color': ta?.color } as React.CSSProperties}>
                <span className="bm-dot" /><span className="bm-name">{ta?.name}</span>
                <input className="bm-score-input" type="number" inputMode="numeric" min={0} placeholder="–"
                  value={scores[match.id]?.a ?? ''} onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], a: e.target.value } }))} />
              </div>
              <span className="bm-vs">vs</span>
              <div className="bm-team right" style={{ '--team-color': tb?.color } as React.CSSProperties}>
                <input className="bm-score-input" type="number" inputMode="numeric" min={0} placeholder="–"
                  value={scores[match.id]?.b ?? ''} onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], b: e.target.value } }))} />
                <span className="bm-name">{tb?.name}</span><span className="bm-dot" />
              </div>
              <button className={`bm-save ${done ? 'saved' : ''}`} onClick={() => saveMatch(match)}>
                {done ? '✓' : 'Save'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single / Double Elimination ───────────────────────────────
function EliminationEntry({ game, teams }: Props) {
  const allMatches = useStore(s => s.bracketMatches)
  const saveBracketMatch = useStore(s => s.saveBracketMatch)
  const updateBracketMatch = useStore(s => s.updateBracketMatch)

  const matches = useMemo(() => allMatches.filter(m => m.game_id === game.id).sort((a, b) => a.round - b.round || a.match_number - b.match_number), [allMatches, game.id])
  const [viewRound, setViewRound] = useState(1)

  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>(() =>
    Object.fromEntries(matches.map(m => [m.id, { a: m.score_a?.toString() ?? '', b: m.score_b?.toString() ?? '' }]))
  )

  // Sync new matches into score state
  const scoreKeys = Object.keys(scores)
  const newMatches = matches.filter(m => !scoreKeys.includes(m.id))
  if (newMatches.length > 0) {
    setScores(s => ({ ...s, ...Object.fromEntries(newMatches.map(m => [m.id, { a: '', b: '' }])) }))
  }

  function initBracket() {
    const generated = generateSingleElim(teams, game.id)
    generated.forEach(m => saveBracketMatch(m))
    setViewRound(1)
  }

  function saveMatch(match: BracketMatch) {
    const sa = parseFloat(scores[match.id]?.a ?? '')
    const sb = parseFloat(scores[match.id]?.b ?? '')
    if (isNaN(sa) || isNaN(sb)) return
    const winner = sa > sb ? match.team_a_id : match.team_b_id
    const loser  = sa > sb ? match.team_b_id : match.team_a_id
    updateBracketMatch(match.id, { score_a: sa, score_b: sb, winner_id: winner })

    // Auto-generate next round if all current round matches have winners
    const updatedMatches = matches.map(m => m.id === match.id ? { ...m, winner_id: winner, score_a: sa, score_b: sb } : m)
    const roundMatches = updatedMatches.filter(m => m.round === match.round && !m.loser_bracket)
    const allDone = roundMatches.every(m => m.winner_id !== null)
    const nextRoundExists = updatedMatches.some(m => m.round === match.round + 1)

    if (allDone && !nextRoundExists && roundMatches.length > 1) {
      const nextRound = generateNextRound(updatedMatches, match.round, game.id)
      nextRound.forEach(m => saveBracketMatch(m))
      setViewRound(match.round + 1)
    }

    // Double elim: send losers to losers bracket
    if (game.type === 'bracket_double' && loser) {
      const lbExists = updatedMatches.some(m => m.loser_bracket && m.round === match.round)
      if (!lbExists) {
        saveBracketMatch({ game_id: game.id, round: match.round, match_number: 1, team_a_id: loser, team_b_id: null, score_a: null, score_b: null, winner_id: loser, loser_bracket: true })
      }
    }
  }

  const roundNames = (r: number, total: number) => {
    if (r === total) return 'Final'
    if (r === total - 1) return 'Semi-Finals'
    if (r === total - 2) return 'Quarter-Finals'
    return `Round ${r}`
  }

  if (matches.length === 0) {
    return (
      <div className="bracket-init">
        <p className="re-hint">{teams.length} teams · {game.type === 'bracket_single' ? 'Single' : 'Double'} Elimination</p>
        <button className="admin-add-btn" onClick={initBracket}>Generate Bracket</button>
      </div>
    )
  }

  const roundTabs = Array.from(new Set(matches.filter(m => !m.loser_bracket).map(m => m.round))).sort()
  const lbMatches = matches.filter(m => m.loser_bracket)
  const viewMatches = matches.filter(m => m.round === viewRound && !m.loser_bracket)

  // Champion
  const finalRound = Math.max(...roundTabs)
  const champion = matches.find(m => m.round === finalRound && !m.loser_bracket)?.winner_id
  const championTeam = teams.find(t => t.id === champion)

  return (
    <div className="bracket-elim">
      {championTeam && (
        <div className="bracket-champion">
          🏆 <strong>{championTeam.name}</strong> wins!
        </div>
      )}

      {/* Round tabs */}
      <div className="bracket-round-tabs">
        {roundTabs.map(r => (
          <button key={r} className={`brt ${viewRound === r ? 'active' : ''}`} onClick={() => setViewRound(r)}>
            {roundNames(r, finalRound)}
          </button>
        ))}
      </div>

      <div className="bracket-matches">
        {viewMatches.map(match => {
          const ta = teams.find(t => t.id === match.team_a_id)
          const tb = teams.find(t => t.id === match.team_b_id)
          const bye = match.team_b_id === null
          const done = match.winner_id !== null

          return (
            <div key={match.id} className={`bm-card ${done ? 'done' : ''}`}>
              <div className={`bm-card-team ${match.winner_id === match.team_a_id ? 'winner' : match.winner_id ? 'loser' : ''}`} style={{ '--team-color': ta?.color } as React.CSSProperties}>
                <span className="bm-dot" />
                <span className="bm-name">{ta?.name ?? 'TBD'}</span>
                {!bye && !done && (
                  <input className="bm-score-input" type="number" inputMode="numeric" min={0} placeholder="–"
                    value={scores[match.id]?.a ?? ''} onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], a: e.target.value } }))} />
                )}
                {done && <span className="bm-final-score">{match.score_a ?? ''}</span>}
              </div>

              <div className="bm-divider" />

              <div className={`bm-card-team ${match.winner_id === match.team_b_id ? 'winner' : match.winner_id ? 'loser' : ''}`} style={{ '--team-color': tb?.color ?? 'transparent' } as React.CSSProperties}>
                <span className="bm-dot" />
                <span className="bm-name">{bye ? 'BYE' : (tb?.name ?? 'TBD')}</span>
                {!bye && !done && (
                  <input className="bm-score-input" type="number" inputMode="numeric" min={0} placeholder="–"
                    value={scores[match.id]?.b ?? ''} onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], b: e.target.value } }))} />
                )}
                {done && <span className="bm-final-score">{match.score_b ?? ''}</span>}
              </div>

              {!bye && !done && (
                <button className="bm-save-card" onClick={() => saveMatch(match)}>Save</button>
              )}
              {done && <div className="bm-done-label">✓ Done</div>}
            </div>
          )
        })}
      </div>

      {/* Losers bracket (double elim) */}
      {game.type === 'bracket_double' && lbMatches.length > 0 && (
        <div className="lb-section">
          <p className="bracket-section-label">Losers Bracket</p>
          {lbMatches.map(match => {
            const ta = teams.find(t => t.id === match.team_a_id)
            return (
              <div key={match.id} className="bm-card done">
                <div className="bm-card-team" style={{ '--team-color': ta?.color } as React.CSSProperties}>
                  <span className="bm-dot" /><span className="bm-name">{ta?.name}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function BracketEntry({ game, teams }: Props) {
  if (game.type === 'bracket_round_robin') return <RoundRobinEntry game={game} teams={teams} />
  return <EliminationEntry game={game} teams={teams} />
}
