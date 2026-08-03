import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import type { Game } from '../../types'
import BracketEntry from './BracketEntry'
import '../../styles/admin.css'
import '../../styles/workspace.css'

interface Props {
  game: Game
  clientId: string
}

export default function ResultsEntry({ game, clientId }: Props) {
  const allTeams = useStore(s => s.teams)
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const saveStandardResults = useStore(s => s.saveStandardResults)
  const savePointsResults = useStore(s => s.savePointsResults)
  const saveParticipantResults = useStore(s => s.saveParticipantResults)
  const addCumulativeRound = useStore(s => s.addCumulativeRound)

  const teams = useMemo(() => allTeams.filter(t => t.client_id === clientId), [allTeams, clientId])

  // Standard results state
  const [positions, setPositions] = useState<Record<string, string>>(() => {
    const existing = standardResults.filter(r => r.game_id === game.id)
    return Object.fromEntries(teams.map(t => [t.id, existing.find(r => r.team_id === t.id)?.position?.toString() ?? '']))
  })

  // Points results state
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const existing = pointsResults.filter(r => r.game_id === game.id)
    return Object.fromEntries(teams.map(t => [t.id, existing.find(r => r.team_id === t.id)?.raw_score?.toString() ?? '']))
  })

  // Cumulative round state
  const [roundScores, setRoundScores] = useState<Record<string, string>>(
    Object.fromEntries(teams.map(t => [t.id, '']))
  )
  const rounds = cumulativeRounds.filter(r => r.game_id === game.id).sort((a, b) => a.round_number - b.round_number)

  // Multi-participant state
  const [participants, setParticipants] = useState<Record<string, { name: string; position: string }[]>>(() => {
    const existing = participantResults.filter(r => r.game_id === game.id)
    const byTeam: Record<string, { name: string; position: string }[]> = {}
    for (const t of teams) {
      const rows = existing.filter(r => r.team_id === t.id)
      byTeam[t.id] = rows.length > 0
        ? rows.map(r => ({ name: r.participant_name, position: r.position.toString() }))
        : [{ name: '', position: '' }]
    }
    return byTeam
  })

  const [saved, setSaved] = useState(false)
  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  // ── Standard ──────────────────────────────────────────────
  if (game.type === 'standard') {
    const dirLabel = game.scoring_direction === 'lower_is_better' ? '1 = winner (e.g. 1st to finish)' : '1 = eliminated first (e.g. last standing wins)'
    return (
      <div className="results-entry">
        <p className="re-hint">{dirLabel}</p>
        {teams.map(team => (
          <div key={team.id} className="re-row" style={{ '--team-color': team.color } as React.CSSProperties}>
            <span className="re-dot" />
            <span className="re-name">{team.name}</span>
            <input
              className="re-input"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Pos"
              value={positions[team.id] ?? ''}
              onChange={e => setPositions(p => ({ ...p, [team.id]: e.target.value }))}
            />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => {
          saveStandardResults(game.id, teams.filter(t => positions[t.id]).map(t => ({ team_id: t.id, position: parseInt(positions[t.id]) })))
          flash()
        }}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
      </div>
    )
  }

  // ── Points ────────────────────────────────────────────────
  if (game.type === 'points') {
    return (
      <div className="results-entry">
        <p className="re-hint">Enter points scored by each team</p>
        {teams.map(team => (
          <div key={team.id} className="re-row" style={{ '--team-color': team.color } as React.CSSProperties}>
            <span className="re-dot" />
            <span className="re-name">{team.name}</span>
            <input
              className="re-input"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Pts"
              value={scores[team.id] ?? ''}
              onChange={e => setScores(p => ({ ...p, [team.id]: e.target.value }))}
            />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => {
          savePointsResults(game.id, teams.filter(t => scores[t.id]).map(t => ({ team_id: t.id, raw_score: parseFloat(scores[t.id]) })))
          flash()
        }}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
      </div>
    )
  }

  // ── Cumulative ────────────────────────────────────────────
  if (game.type === 'cumulative') {
    return (
      <div className="results-entry">
        {rounds.length > 0 && (
          <div className="re-rounds-summary">
            {rounds.map(r => (
              <div key={r.id} className="re-round-row">
                <span className="re-round-label">Round {r.round_number}</span>
                <div className="re-round-scores">
                  {r.scores.map(s => {
                    const team = teams.find(t => t.id === s.team_id)
                    return <span key={s.team_id} className="re-round-score" style={{ '--team-color': team?.color } as React.CSSProperties}>{team?.name}: {s.score}</span>
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="re-hint">Add Round {rounds.length + 1}</p>
        {teams.map(team => (
          <div key={team.id} className="re-row" style={{ '--team-color': team.color } as React.CSSProperties}>
            <span className="re-dot" />
            <span className="re-name">{team.name}</span>
            <input
              className="re-input"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Score"
              value={roundScores[team.id] ?? ''}
              onChange={e => setRoundScores(p => ({ ...p, [team.id]: e.target.value }))}
            />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => {
          addCumulativeRound(game.id, teams.filter(t => roundScores[t.id]).map(t => ({ team_id: t.id, score: parseFloat(roundScores[t.id]) })))
          setRoundScores(Object.fromEntries(teams.map(t => [t.id, ''])))
          flash()
        }}>
          {saved ? '✓ Round Added' : `Add Round ${rounds.length + 1}`}
        </button>
      </div>
    )
  }

  // ── Multi-participant ─────────────────────────────────────
  if (game.type === 'multi_participant') {
    const dirLabel = game.scoring_direction === 'lower_is_better' ? 'Lower position = better' : 'Higher position = better'
    return (
      <div className="results-entry">
        <p className="re-hint">{dirLabel} · Enter each participant and their finishing position</p>
        {teams.map(team => (
          <div key={team.id} className="re-mp-team" style={{ '--team-color': team.color } as React.CSSProperties}>
            <div className="re-mp-header">
              <span className="re-dot" />
              <span className="re-name">{team.name}</span>
              <button className="re-add-p" onClick={() => setParticipants(p => ({ ...p, [team.id]: [...(p[team.id] ?? []), { name: '', position: '' }] }))}>+ Person</button>
            </div>
            {(participants[team.id] ?? []).map((row, i) => (
              <div key={i} className="re-mp-row">
                <input className="re-input flex" placeholder="Name" value={row.name} onChange={e => setParticipants(p => ({ ...p, [team.id]: p[team.id].map((r, j) => j === i ? { ...r, name: e.target.value } : r) }))} />
                <input className="re-input sm" type="number" inputMode="numeric" placeholder="Pos" value={row.position} onChange={e => setParticipants(p => ({ ...p, [team.id]: p[team.id].map((r, j) => j === i ? { ...r, position: e.target.value } : r) }))} />
              </div>
            ))}
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => {
          const results = teams.flatMap(t => (participants[t.id] ?? []).filter(r => r.name && r.position).map(r => ({ team_id: t.id, participant_name: r.name, position: parseInt(r.position) })))
          saveParticipantResults(game.id, results)
          flash()
        }}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
      </div>
    )
  }

  // ── Brackets ──────────────────────────────────────────────
  return <BracketEntry game={game} teams={teams} />
}
