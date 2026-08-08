import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { Game } from '../../types'
import BracketEntry from './BracketEntry'
import '../../styles/admin.css'
import '../../styles/workspace.css'

interface Props {
  game: Game
  clientId: string
}

// ── PIN Confirmation Modal ────────────────────────────────────
function PinConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const currentUser = useStore(s => s.currentUser)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const user = currentUser()
    if (!user || pin !== user.pin) {
      setError('Incorrect PIN')
      setPin('')
      inputRef.current?.focus()
      return
    }
    onConfirm()
  }

  return (
    <motion.div
      className="admin-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="admin-modal"
        style={{ maxWidth: 320 }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="modal-title">Confirm Save</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--admin-sub)', margin: 0 }}>
          Re-enter your PIN to save these results.
        </p>
        <label className="modal-label">Your PIN</label>
        <input
          ref={inputRef}
          className="modal-input"
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={e => { setPin(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        {error && <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="modal-btn primary" onClick={submit} disabled={!pin}>Confirm</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ResultsEntry({ game, clientId }: Props) {
  const allTeams = useStore(s => s.teams)
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const participantAttemptResults = useStore(s => s.participantAttemptResults)
  const saveStandardResults = useStore(s => s.saveStandardResults)
  const savePointsResults = useStore(s => s.savePointsResults)
  const saveParticipantResults = useStore(s => s.saveParticipantResults)
  const saveParticipantAttemptResults = useStore(s => s.saveParticipantAttemptResults)
  const addCumulativeRound = useStore(s => s.addCumulativeRound)
  const updateGame = useStore(s => s.updateGame)
  const logAudit = useStore(s => s.logAudit)

  const teams = useMemo(() => allTeams.filter(t => t.client_id === clientId), [allTeams, clientId])

  const [positions, setPositions] = useState<Record<string, string>>(() => {
    const existing = standardResults.filter(r => r.game_id === game.id)
    return Object.fromEntries(teams.map(t => [t.id, existing.find(r => r.team_id === t.id)?.position?.toString() ?? '']))
  })

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const existing = pointsResults.filter(r => r.game_id === game.id)
    return Object.fromEntries(teams.map(t => [t.id, existing.find(r => r.team_id === t.id)?.raw_score?.toString() ?? '']))
  })

  const [roundScores, setRoundScores] = useState<Record<string, string>>(
    Object.fromEntries(teams.map(t => [t.id, '']))
  )
  const rounds = cumulativeRounds.filter(r => r.game_id === game.id).sort((a, b) => a.round_number - b.round_number)

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

  const numParticipants = game.participants_per_team ?? 1
  const numAttempts = game.attempts_per_participant ?? 1

  // attemptGrid[teamId][participantIdx][attemptIdx] = success boolean
  const [attemptGrid, setAttemptGrid] = useState<Record<string, boolean[][]>>(() => {
    const grid: Record<string, boolean[][]> = {}
    for (const t of teams) {
      const existing = participantAttemptResults.filter(r => r.game_id === game.id && r.team_id === t.id)
      if (existing.length > 0) {
        const byP: boolean[][] = []
        const names = [...new Set(existing.map(r => r.participant_name))]
        for (const name of names) {
          const attempts = existing
            .filter(r => r.participant_name === name)
            .sort((a, b) => a.attempt_number - b.attempt_number)
            .map(r => r.success)
          byP.push(attempts)
        }
        grid[t.id] = byP
      } else {
        grid[t.id] = Array.from({ length: numParticipants }, () => Array.from({ length: numAttempts }, () => false))
      }
    }
    return grid
  })

  const [attemptNames, setAttemptNames] = useState<Record<string, string[]>>(() => {
    const names: Record<string, string[]> = {}
    for (const t of teams) {
      const existing = participantAttemptResults.filter(r => r.game_id === game.id && r.team_id === t.id)
      names[t.id] = existing.length > 0
        ? [...new Set(existing.map(r => r.participant_name))]
        : Array.from({ length: numParticipants }, () => '')
    }
    return names
  })

  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  function requestSave(action: () => Promise<void>) {
    setPendingAction(() => action)
    setShowPin(true)
  }

  async function onPinConfirmed() {
    setShowPin(false)
    setSaveError('')
    try {
      if (pendingAction) await pendingAction()
      flash()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setPendingAction(null)
    }
  }

  const errorBanner = saveError
    ? <p className="re-save-error">⚠ Save failed: {saveError}</p>
    : null

  const isLocked = game.status === 'completed' && game.type !== 'cumulative'

  if (isLocked) {
    return (
      <div className="results-entry">
        <div className="re-locked">
          <span className="re-locked-icon">🔒</span>
          <p className="re-locked-text">Results submitted &amp; locked</p>
          <p className="re-locked-hint">Click the ↩ Reopen button above to edit results.</p>
        </div>
      </div>
    )
  }

  // ── Standard ──────────────────────────────────────────────
  if (game.type === 'standard') {
    const dirLabel = game.scoring_direction === 'lower_is_better'
      ? '1 = winner (e.g. 1st to finish)'
      : '1 = eliminated first (e.g. last standing wins)'
    return (
      <div className="results-entry">
        <p className="re-hint">{dirLabel}</p>
        {teams.map(team => (
          <div key={team.id} className="re-row" style={{ '--team-color': team.color } as React.CSSProperties}>
            <span className="re-dot" />
            <span className="re-name">{team.name}</span>
            <input className="re-input" type="number" inputMode="numeric" min={1} placeholder="Pos"
              value={positions[team.id] ?? ''}
              onChange={e => setPositions(p => ({ ...p, [team.id]: e.target.value }))} />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => requestSave(async () => {
          const results = teams.filter(t => positions[t.id]).map(t => ({ team_id: t.id, position: parseInt(positions[t.id]) }))
          await saveStandardResults(game.id, results)
          await updateGame(game.id, { status: 'completed' })
          await logAudit('save_results', game.id, game.name, {
            type: 'standard',
            team_count: results.length,
            entries: results
              .map(r => ({ team: teams.find(t => t.id === r.team_id)?.name ?? r.team_id, position: r.position }))
              .sort((a, b) => a.position - b.position),
          })
        })}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
        {errorBanner}
        <AnimatePresence>{showPin && <PinConfirmModal onConfirm={onPinConfirmed} onCancel={() => setShowPin(false)} />}</AnimatePresence>
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
            <input className="re-input" type="number" inputMode="numeric" min={0} placeholder="Pts"
              value={scores[team.id] ?? ''}
              onChange={e => setScores(p => ({ ...p, [team.id]: e.target.value }))} />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => requestSave(async () => {
          const results = teams.filter(t => scores[t.id]).map(t => ({ team_id: t.id, raw_score: parseFloat(scores[t.id]) }))
          await savePointsResults(game.id, results)
          await updateGame(game.id, { status: 'completed' })
          await logAudit('save_results', game.id, game.name, {
            type: 'points',
            team_count: results.length,
            entries: results
              .map(r => ({ team: teams.find(t => t.id === r.team_id)?.name ?? r.team_id, score: r.raw_score }))
              .sort((a, b) => b.score - a.score),
          })
        })}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
        {errorBanner}
        <AnimatePresence>{showPin && <PinConfirmModal onConfirm={onPinConfirmed} onCancel={() => setShowPin(false)} />}</AnimatePresence>
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
            <input className="re-input" type="number" inputMode="numeric" min={0} placeholder="Score"
              value={roundScores[team.id] ?? ''}
              onChange={e => setRoundScores(p => ({ ...p, [team.id]: e.target.value }))} />
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => requestSave(async () => {
          const results = teams.filter(t => roundScores[t.id]).map(t => ({ team_id: t.id, score: parseFloat(roundScores[t.id]) }))
          await addCumulativeRound(game.id, results)
          await logAudit('add_round', game.id, game.name, {
            type: 'cumulative',
            round: rounds.length + 1,
            team_count: results.length,
            entries: results
              .map(r => ({ team: teams.find(t => t.id === r.team_id)?.name ?? r.team_id, score: r.score }))
              .sort((a, b) => b.score - a.score),
          })
          setRoundScores(Object.fromEntries(teams.map(t => [t.id, ''])))
        })}>
          {saved ? '✓ Round Added' : `Add Round ${rounds.length + 1}`}
        </button>
        {errorBanner}
        <AnimatePresence>{showPin && <PinConfirmModal onConfirm={onPinConfirmed} onCancel={() => setShowPin(false)} />}</AnimatePresence>
      </div>
    )
  }

  // ── Multi-participant ─────────────────────────────────────
  if (game.type === 'multi_participant') {
    const dirLabel = game.scoring_direction === 'lower_is_better'
      ? 'Lower position = better'
      : 'Higher position = better'
    return (
      <div className="results-entry">
        <p className="re-hint">{dirLabel} · Enter each participant and their finishing position</p>
        {teams.map(team => (
          <div key={team.id} className="re-mp-team" style={{ '--team-color': team.color } as React.CSSProperties}>
            <div className="re-mp-header">
              <span className="re-dot" />
              <span className="re-name">{team.name}</span>
              <button className="re-add-p" onClick={() =>
                setParticipants(p => ({ ...p, [team.id]: [...(p[team.id] ?? []), { name: '', position: '' }] }))
              }>+ Person</button>
            </div>
            {(participants[team.id] ?? []).map((row, i) => (
              <div key={i} className="re-mp-row">
                <input className="re-input flex" placeholder="Name (optional)"
                  value={row.name}
                  onChange={e => setParticipants(p => ({ ...p, [team.id]: p[team.id].map((r, j) => j === i ? { ...r, name: e.target.value } : r) }))} />
                <input className="re-input sm" type="number" inputMode="numeric" placeholder="Pos"
                  value={row.position}
                  onChange={e => setParticipants(p => ({ ...p, [team.id]: p[team.id].map((r, j) => j === i ? { ...r, position: e.target.value } : r) }))} />
              </div>
            ))}
          </div>
        ))}
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => requestSave(async () => {
          // Name is optional — only require position
          const results = teams.flatMap(t =>
            (participants[t.id] ?? [])
              .filter(r => r.position)
              .map(r => ({ team_id: t.id, participant_name: r.name.trim(), position: parseInt(r.position) }))
          )
          await saveParticipantResults(game.id, results)
          await updateGame(game.id, { status: 'completed' })
          await logAudit('save_results', game.id, game.name, {
            type: 'multi_participant',
            participant_count: results.length,
            entries: results
              .map(r => ({
                team: teams.find(t => t.id === r.team_id)?.name ?? r.team_id,
                participant: r.participant_name || '(unnamed)',
                position: r.position,
              }))
              .sort((a, b) => a.position - b.position),
          })
        })}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
        {errorBanner}
        <AnimatePresence>{showPin && <PinConfirmModal onConfirm={onPinConfirmed} onCancel={() => setShowPin(false)} />}</AnimatePresence>
      </div>
    )
  }

  // ── Participant Attempts ──────────────────────────────────
  if (game.type === 'participant_attempts') {
    const teamTotals = teams.map(t => ({
      team: t,
      total: (attemptGrid[t.id] ?? []).flat().filter(Boolean).length,
    })).sort((a, b) => b.total - a.total)

    return (
      <div className="results-entry">
        <p className="re-hint">
          Tap each attempt — ✓ scored, ✗ missed · {numParticipants} participant{numParticipants > 1 ? 's' : ''} × {numAttempts} attempt{numAttempts > 1 ? 's' : ''}
        </p>
        {teams.map(team => {
          const grid = attemptGrid[team.id] ?? []
          const names = attemptNames[team.id] ?? []
          const teamTotal = grid.flat().filter(Boolean).length
          return (
            <div key={team.id} className="re-attempt-team" style={{ '--team-color': team.color } as React.CSSProperties}>
              <div className="re-attempt-header">
                <span className="re-dot" />
                <span className="re-name">{team.name}</span>
                <span className="re-attempt-total">{teamTotal} / {numParticipants * numAttempts}</span>
              </div>
              {grid.map((attempts, pi) => (
                <div key={pi} className="re-attempt-row">
                  <input
                    className="re-input flex"
                    placeholder={`Participant ${pi + 1}`}
                    value={names[pi] ?? ''}
                    onChange={e => setAttemptNames(prev => ({
                      ...prev,
                      [team.id]: prev[team.id].map((n, i) => i === pi ? e.target.value : n),
                    }))}
                  />
                  <div className="re-attempt-btns">
                    {attempts.map((success, ai) => (
                      <button
                        key={ai}
                        className={`re-attempt-btn ${success ? 'hit' : 'miss'}`}
                        onClick={() => setAttemptGrid(prev => ({
                          ...prev,
                          [team.id]: prev[team.id].map((row, ri) =>
                            ri === pi ? row.map((v, vi) => vi === ai ? !v : v) : row
                          ),
                        }))}
                      >
                        {success ? '✓' : '✗'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        <div className="re-attempt-summary">
          {teamTotals.map(({ team, total }, i) => (
            <div key={team.id} className="re-attempt-summary-row" style={{ '--team-color': team.color } as React.CSSProperties}>
              <span className="re-dot" />
              <span className="re-name">{team.name}</span>
              <span className="re-attempt-summary-score">#{i + 1} · {total} pts</span>
            </div>
          ))}
        </div>

        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => requestSave(async () => {
          const results = teams.flatMap(t =>
            (attemptGrid[t.id] ?? []).flatMap((attempts, pi) =>
              attempts.map((success, ai) => ({
                game_id: game.id,
                team_id: t.id,
                participant_name: (attemptNames[t.id]?.[pi] ?? '').trim(),
                attempt_number: ai + 1,
                success,
              }))
            )
          )
          await saveParticipantAttemptResults(game.id, results)
          await updateGame(game.id, { status: 'completed' })
          await logAudit('save_results', game.id, game.name, {
            type: 'participant_attempts',
            team_count: teams.length,
            totals: teams.map(t => ({
              team: t.name,
              successes: (attemptGrid[t.id] ?? []).flat().filter(Boolean).length,
            })),
          })
        })}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
        {errorBanner}
        <AnimatePresence>{showPin && <PinConfirmModal onConfirm={onPinConfirmed} onCancel={() => setShowPin(false)} />}</AnimatePresence>
      </div>
    )
  }

  return <BracketEntry game={game} teams={teams} />
}
