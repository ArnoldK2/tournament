import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { Game, Team } from '../../types'
import BracketEntry from './BracketEntry'
import '../../styles/admin.css'
import '../../styles/workspace.css'

interface Props {
  game: Game
  eventId: string
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

// ── Penalize Row (with confirmation feedback) ─────────────────
function PenalizeRow({ team, onPenalize }: { team: Team; onPenalize: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'saving'>('idle')

  if (state === 'confirm') {
    return (
      <div className="penalty-row penalty-confirm">
        <span className="penalty-team-dot" style={{ background: team.color }} />
        <span className="penalty-team-name">{team.name}</span>
        <span className="penalty-confirm-note">will receive 1 pt — confirm?</span>
        <button className="penalty-btn add" onClick={async () => {
          setState('saving')
          await onPenalize()
        }}>
          {state === 'saving' ? '…' : 'Yes, penalize'}
        </button>
        <button className="penalty-btn remove" onClick={() => setState('idle')}>Cancel</button>
      </div>
    )
  }

  return (
    <div className="penalty-row">
      <span className="penalty-team-dot" style={{ background: team.color }} />
      <span className="penalty-team-name">{team.name}</span>
      <button className="penalty-btn add" onClick={() => setState('confirm')}>+ Penalize</button>
    </div>
  )
}

// ── Penalties Section ─────────────────────────────────────────
function PenaltiesSection({ game, teams }: { game: Game; teams: Team[] }) {
  const gamePenalties = useStore(s => s.gamePenalties)
  const addPenalty = useStore(s => s.addPenalty)
  const removePenalty = useStore(s => s.removePenalty)
  const [open, setOpen] = useState(false)
  const [editingReason, setEditingReason] = useState<string | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')

  const penaltyMap = new Map(gamePenalties.filter(p => p.game_id === game.id).map(p => [p.team_id, p.reason ?? '']))
  const penalizedTeams = teams.filter(t => penaltyMap.has(t.id))
  const cleanTeams = teams.filter(t => !penaltyMap.has(t.id))

  return (
    <div className="penalty-section">
      <button className="penalty-toggle-btn" onClick={() => setOpen(o => !o)}>
        ⚠ Rule Violations {penaltyMap.size > 0 && <span className="penalty-badge">{penaltyMap.size}</span>}
        <span style={{ marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="penalty-list">
          {penalizedTeams.map(t => (
            <div key={t.id} className="penalty-row penalized">
              <span className="penalty-team-dot" style={{ background: t.color }} />
              <span className="penalty-team-name">{t.name}</span>
              {editingReason === t.id
                ? <input
                    autoFocus
                    className="penalty-reason-input"
                    placeholder="Reason (optional)"
                    value={reasonDraft}
                    onChange={e => setReasonDraft(e.target.value)}
                    onBlur={async () => {
                      await addPenalty(game.id, t.id, reasonDraft || undefined)
                      setEditingReason(null)
                    }}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        await addPenalty(game.id, t.id, reasonDraft || undefined)
                        setEditingReason(null)
                      }
                    }}
                  />
                : <span
                    className="penalty-reason-display"
                    onClick={() => { setEditingReason(t.id); setReasonDraft(penaltyMap.get(t.id) ?? '') }}
                  >
                    {penaltyMap.get(t.id) || <em>add reason…</em>}
                  </span>
              }
              <button className="penalty-btn remove" onClick={() => removePenalty(game.id, t.id)}>✕</button>
            </div>
          ))}
          {cleanTeams.map(t => (
            <PenalizeRow key={t.id} team={t} onPenalize={() => addPenalty(game.id, t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResultsEntry({ game, eventId }: Props) {
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

  const teams = useMemo(
    () => allTeams.filter(t => t.event_id === eventId && !!t.is_fun === !!game.is_fun),
    [allTeams, eventId, game.is_fun]
  )

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
      <>
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
        <PenaltiesSection game={game} teams={teams} />
      </>
    )
  }

  // ── Points ────────────────────────────────────────────────
  if (game.type === 'points') {
    return (
      <>
        <div className="results-entry">
          <p className="re-hint">Enter points / counts scored by each team</p>
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
        <PenaltiesSection game={game} teams={teams} />
      </>
    )
  }

  // ── Cumulative ────────────────────────────────────────────
  if (game.type === 'cumulative') {
    return (
      <>
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
        <PenaltiesSection game={game} teams={teams} />
      </>
    )
  }

  if (game.type === 'tape') return <><TapeEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>

  // ── Multi-participant ─────────────────────────────────────
  if (game.type === 'multi_participant') {
    const dirLabel = game.scoring_direction === 'lower_is_better'
      ? 'Lower position = better'
      : 'Higher position = better'
    return (
      <>
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
      <PenaltiesSection game={game} teams={teams} />
    </>
    )
  }

  // ── Participant Attempts ──────────────────────────────────
  if (game.type === 'participant_attempts') {
    const teamTotals = teams.map(t => ({
      team: t,
      total: (attemptGrid[t.id] ?? []).flat().filter(Boolean).length,
    })).sort((a, b) => b.total - a.total)

    return (
      <>
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
      <PenaltiesSection game={game} teams={teams} />
    </>
    )
  }

  if (game.type === 'match_play') return <><MatchPlayEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>
  if (game.type === 'completion') return <><CompletionEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>
  if (game.type === 'tally') return <><TallyEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>
  if (game.type === 'lives') return <><LivesEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>
  if (game.type === 'head_to_head') return <><HeadToHeadEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>

  return <><BracketEntry game={game} teams={teams} /><PenaltiesSection game={game} teams={teams} /></>
}

// ── Match Play Entry ──────────────────────────────────────────
function MatchPlayEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const bracketMatches = useStore(s => s.bracketMatches)
  const saveBracketMatch = useStore(s => s.saveBracketMatch)
  const updateBracketMatch = useStore(s => s.updateBracketMatch)
  const deleteBracketMatch = useStore(s => s.deleteBracketMatch)
  const updateGame = useStore(s => s.updateGame)

  const matches = bracketMatches.filter(m => m.game_id === game.id)
  const numMatches = Math.floor(teams.length / 2)

  const defaultWinPts = matches[0]?.score_a ?? 3
  const defaultLossPts = matches[0]?.score_b ?? 1
  const [winPts, setWinPts] = useState(defaultWinPts)
  const [lossPts, setLossPts] = useState(defaultLossPts)
  const [pendingA, setPendingA] = useState<Record<number, string>>({})
  const [pendingB, setPendingB] = useState<Record<number, string>>({})
  const [localWinners, setLocalWinners] = useState<Record<string, string>>(() =>
    Object.fromEntries(matches.filter(m => m.winner_id).map(m => [m.id, m.winner_id!]))
  )
  const [showPin, setShowPin] = useState(false)
  const [saved, setSaved] = useState(false)

  const usedTeamIds = new Set(matches.flatMap(m => [m.team_a_id, m.team_b_id].filter(Boolean)))

  async function setPair(idx: number) {
    const a = pendingA[idx]; const b = pendingB[idx]
    if (!a || !b || a === b) return
    await saveBracketMatch({
      game_id: game.id, round: 1, match_number: idx + 1,
      team_a_id: a, team_b_id: b,
      score_a: winPts, score_b: lossPts,
      winner_id: null, loser_bracket: false,
    })
    setPendingA(p => { const n = { ...p }; delete n[idx]; return n })
    setPendingB(p => { const n = { ...p }; delete n[idx]; return n })
  }

  async function confirmSave() {
    await Promise.all(
      matches.map(m => {
        const winnerId = localWinners[m.id]
        return updateBracketMatch(m.id, { winner_id: winnerId ?? null, score_a: winPts, score_b: lossPts })
      })
    )
    await updateGame(game.id, { status: 'completed' })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const availableTeams = (exclude: string[]) =>
    teams.filter(t => !usedTeamIds.has(t.id) && !exclude.includes(t.id))

  return (
    <div className="results-entry">
      <div className="mp-pts-row">
        <label className="mp-pts-label">Win pts
          <input className="mp-pts-input" type="number" min={0} value={winPts} onChange={e => setWinPts(Number(e.target.value))} />
        </label>
        <label className="mp-pts-label">Loss pts
          <input className="mp-pts-input" type="number" min={0} value={lossPts} onChange={e => setLossPts(Number(e.target.value))} />
        </label>
      </div>

      <ol className="mp-guide">
        <li>Select two teams for each match and tap <strong>Set</strong></li>
        <li>Tap the winning team; the other becomes the loser</li>
        <li>Hit <strong>Save Results</strong> and confirm with your PIN</li>
      </ol>

      {Array.from({ length: numMatches }, (_, i) => {
        const match = matches.find(m => m.match_number === i + 1)
        const teamA = teams.find(t => t.id === match?.team_a_id)
        const teamB = teams.find(t => t.id === match?.team_b_id)

        if (match && teamA && teamB) {
          const winnerId = localWinners[match.id]
          return (
            <div key={i} className="mp-match-row">
              <span className="mp-match-label">Match {i + 1}</span>
              <div className="mp-teams">
                <button className={`mp-team-btn ${winnerId === teamA.id ? 'winner' : winnerId ? 'loser' : ''}`} style={{ '--tc': teamA.color } as React.CSSProperties} onClick={() => setLocalWinners(w => ({ ...w, [match.id]: teamA.id }))}>
                  <span className="mp-team-dot" />{teamA.name}
                </button>
                <span className="mp-vs">vs</span>
                <button className={`mp-team-btn ${winnerId === teamB.id ? 'winner' : winnerId ? 'loser' : ''}`} style={{ '--tc': teamB.color } as React.CSSProperties} onClick={() => setLocalWinners(w => ({ ...w, [match.id]: teamB.id }))}>
                  <span className="mp-team-dot" />{teamB.name}
                </button>
              </div>
              <button className="mp-reset-btn" title="Reset pair" onClick={async () => { await deleteBracketMatch(match.id); setLocalWinners(w => { const n = { ...w }; delete n[match.id]; return n }) }}>↺</button>
            </div>
          )
        }

        const aVal = pendingA[i] ?? ''; const bVal = pendingB[i] ?? ''
        return (
          <div key={i} className="mp-match-row">
            <span className="mp-match-label">Match {i + 1}</span>
            <div className="mp-teams">
              <select className="mp-select" value={aVal} onChange={e => setPendingA(p => ({ ...p, [i]: e.target.value }))}>
                <option value="">Select…</option>
                {availableTeams([bVal]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span className="mp-vs">vs</span>
              <select className="mp-select" value={bVal} onChange={e => setPendingB(p => ({ ...p, [i]: e.target.value }))}>
                <option value="">Select…</option>
                {availableTeams([aVal]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button className="mp-set-btn" onClick={() => setPair(i)} disabled={!aVal || !bVal || aVal === bVal}>Set</button>
            </div>
          </div>
        )
      })}

      {matches.length === numMatches && matches.every(m => localWinners[m.id]) && (
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => setShowPin(true)}>
          {saved ? '✓ Saved' : 'Save Results'}
        </button>
      )}

      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={confirmSave} onCancel={() => setShowPin(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Completion Entry ──────────────────────────────────────────
function CompletionEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const pointsResults = useStore(s => s.pointsResults)
  const savePointsResults = useStore(s => s.savePointsResults)
  const updateGame = useStore(s => s.updateGame)

  const existing = pointsResults.filter(r => r.game_id === game.id)
  const existingMax = existing.length ? Math.max(...existing.map(r => r.raw_score)) : 3
  const existingMin = existing.length ? Math.min(...existing.map(r => r.raw_score)) : 0

  const [finishPts, setFinishPts] = useState(existingMax)
  const [noFinishPts, setNoFinishPts] = useState(existingMin)
  const [done, setDone] = useState<Set<string>>(() =>
    new Set(existing.filter(r => r.raw_score === existingMax).map(r => r.team_id))
  )
  const [showPin, setShowPin] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(teamId: string) {
    setDone(prev => { const next = new Set(prev); next.has(teamId) ? next.delete(teamId) : next.add(teamId); return next })
  }

  async function handleConfirm() {
    setShowPin(false)
    await savePointsResults(game.id, teams.map(t => ({ team_id: t.id, raw_score: done.has(t.id) ? finishPts : noFinishPts })))
    await updateGame(game.id, { status: 'completed' })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="results-entry">
      <div className="mp-pts-row">
        <label className="mp-pts-label">Finish pts
          <input className="mp-pts-input" type="number" min={0} value={finishPts} onChange={e => setFinishPts(Number(e.target.value))} />
        </label>
        <label className="mp-pts-label">No finish pts
          <input className="mp-pts-input" type="number" min={0} value={noFinishPts} onChange={e => setNoFinishPts(Number(e.target.value))} />
        </label>
      </div>
      <ul className="mp-guide">
        <li>Tap a team to mark them as done</li>
        <li>Hit <strong>Save Results</strong> and confirm with your PIN</li>
      </ul>
      <div className="cp-team-list">
        {teams.map(t => (
          <button key={t.id} className={`cp-team-row ${done.has(t.id) ? 'done' : ''}`} onClick={() => toggle(t.id)}>
            <span className="cp-team-dot" style={{ background: t.color }} />
            <span className="cp-team-name">{t.name}</span>
            <span className="cp-check">{done.has(t.id) ? '✓ Done' : 'Not done'}</span>
          </button>
        ))}
      </div>
      <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => setShowPin(true)}>
        {saved ? '✓ Saved' : 'Save Results'}
      </button>
      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={handleConfirm} onCancel={() => setShowPin(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Tally Entry ───────────────────────────────────────────────
function TallyEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const addCumulativeRound = useStore(s => s.addCumulativeRound)
  const updateGame = useStore(s => s.updateGame)

  const maxTries = game.participants_per_team ?? 0
  const [localTries, setLocalTries] = useState<Record<string, number[]>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)

  function getTries(teamId: string) { return localTries[teamId] ?? [] }

  function recordTry(teamId: string) {
    const raw = inputs[teamId] ?? ''
    if (raw === '') return
    const val = Number(raw)
    if (isNaN(val)) return
    setLocalTries(p => ({ ...p, [teamId]: [...(p[teamId] ?? []), val] }))
    setInputs(p => ({ ...p, [teamId]: '' }))
  }

  async function handleFinish() {
    setShowPin(false); setSaving(true)
    for (const team of teams) {
      for (const score of getTries(team.id)) {
        await addCumulativeRound(game.id, [{ team_id: team.id, score }])
      }
    }
    await updateGame(game.id, { status: 'completed' })
    setSaving(false)
  }

  const isComplete = game.status === 'completed'
  const hasAnyTry = teams.some(t => getTries(t.id).length > 0)

  return (
    <div className="results-entry">
      {saving && <div className="re-saving-overlay"><div className="re-spinner" /><span>Saving results…</span></div>}
      <div className="tally-list">
        {teams.map(t => {
          const tries = getTries(t.id)
          const total = tries.reduce((a, b) => a + b, 0)
          const nextTry = tries.length + 1
          const triesExhausted = maxTries > 0 && tries.length >= maxTries
          return (
            <div key={t.id} className="tally-card">
              <div className="tally-card-header">
                <span className="tally-dot" style={{ background: t.color }} />
                <span className="tally-name">{t.name}</span>
                {maxTries > 0 && <span className="tally-tries-counter">{tries.length}/{maxTries}</span>}
                <span className="tally-total-badge">{total}</span>
              </div>
              {tries.length > 0 && (
                <div className="tally-history">
                  {tries.map((s, i) => <span key={i} className="tally-try-chip">Try {i + 1}: <strong>{s}</strong></span>)}
                </div>
              )}
              {!isComplete && !triesExhausted && (
                <div className="tally-input-row">
                  <span className="tally-try-label">Try {nextTry}{maxTries > 0 ? ` of ${maxTries}` : ''}</span>
                  <input className="tally-score-input" type="number" min={0} placeholder="Score"
                    value={inputs[t.id] ?? ''}
                    onChange={e => setInputs(p => ({ ...p, [t.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && recordTry(t.id)} />
                  <button className="tally-record-btn" onClick={() => recordTry(t.id)} disabled={!inputs[t.id]}>Record</button>
                </div>
              )}
              {!isComplete && triesExhausted && <div className="tally-done-row">All {maxTries} tries recorded</div>}
            </div>
          )
        })}
      </div>
      {!isComplete && hasAnyTry && (
        <button className={`re-save ${saving ? 'saved' : ''}`} onClick={() => setShowPin(true)} disabled={saving}>
          {saving ? 'Saving…' : 'Finish Game'}
        </button>
      )}
      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={handleFinish} onCancel={() => setShowPin(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Lives Entry ───────────────────────────────────────────────
function LivesEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const pointsResults = useStore(s => s.pointsResults)
  const savePointsResults = useStore(s => s.savePointsResults)
  const updateGame = useStore(s => s.updateGame)

  const maxLives = game.participants_per_team ?? 3
  const existing = pointsResults.filter(r => r.game_id === game.id)

  const [livesLeft, setLivesLeft] = useState<Record<string, number>>(() =>
    Object.fromEntries(teams.map(t => {
      const found = existing.find(r => r.team_id === t.id)
      return [t.id, found ? found.raw_score : maxLives]
    }))
  )
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)

  function buzz(teamId: string) {
    setLivesLeft(p => ({ ...p, [teamId]: Math.max(0, (p[teamId] ?? maxLives) - 1) }))
  }

  function undoBuzz(teamId: string) {
    setLivesLeft(p => ({ ...p, [teamId]: Math.min(maxLives, (p[teamId] ?? maxLives) + 1) }))
  }

  async function handleFinish() {
    setShowPin(false); setSaving(true)
    await savePointsResults(game.id, teams.map(t => ({ team_id: t.id, raw_score: livesLeft[t.id] ?? maxLives })))
    await updateGame(game.id, { status: 'completed' })
    setSaving(false)
  }

  const isComplete = game.status === 'completed'

  return (
    <div className="results-entry">
      <div className="lives-list">
        {teams.map(t => {
          const lives = livesLeft[t.id] ?? maxLives
          const eliminated = lives === 0
          return (
            <div key={t.id} className={`lives-card ${eliminated ? 'eliminated' : ''}`}>
              <div className="lives-team-info">
                <span className="lives-color-dot" style={{ background: t.color }} />
                <span className="lives-team-name">{t.name}</span>
                <div className="lives-pips">
                  {Array.from({ length: maxLives }, (_, i) => (
                    <span key={i} className={`life-pip ${i < lives ? 'alive' : 'lost'}`} />
                  ))}
                </div>
              </div>
              {!isComplete && (
                <div className="lives-actions">
                  {eliminated
                    ? <span className="lives-out-label">Out</span>
                    : <button className="buzz-btn" onClick={() => buzz(t.id)}>BUZZ</button>
                  }
                  {lives < maxLives && (
                    <button className="lives-undo-btn" title="Undo last buzz" onClick={() => undoBuzz(t.id)}>↺</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!isComplete && (
        <button className="re-save" onClick={() => setShowPin(true)} disabled={saving}>
          {saving ? 'Saving…' : 'Finish Game'}
        </button>
      )}
      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={handleFinish} onCancel={() => setShowPin(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Head to Head Entry ────────────────────────────────────────
type HthRound = { winnerId: string | null; nameA: string; nameB: string }
type HthPairRounds = Record<string, HthRound[]>

function HeadToHeadEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const bracketMatches = useStore(s => s.bracketMatches)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const gameParticipants = useStore(s => s.gameParticipants)
  const saveBracketMatch = useStore(s => s.saveBracketMatch)
  const addCumulativeRound = useStore(s => s.addCumulativeRound)
  const clearCumulativeRounds = useStore(s => s.clearCumulativeRounds)
  const deleteBracketMatch = useStore(s => s.deleteBracketMatch)
  const saveGameParticipants = useStore(s => s.saveGameParticipants)
  const updateGame = useStore(s => s.updateGame)

  const pairs = bracketMatches.filter(m => m.game_id === game.id)
  const usedIds = new Set(pairs.flatMap(p => [p.team_a_id, p.team_b_id].filter(Boolean) as string[]))

  const [pendingA, setPendingA] = useState('')
  const [pendingB, setPendingB] = useState('')
  const [expandedPairId, setExpandedPairId] = useState<string | null>(null)
  const [pairRounds, setPairRounds] = useState<HthPairRounds>({})
  const [activeRoundIdx, setActiveRoundIdx] = useState<Record<string, number>>({})
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadedFromDb, setLoadedFromDb] = useState(false)

  const totalRounds = game.participants_per_team ?? 10
  const isComplete = game.status === 'completed'

  // Load saved rounds from DB when reopening a previously-finished game
  useEffect(() => {
    if (loadedFromDb || pairs.length === 0) return
    const gameRounds = cumulativeRounds.filter(r => r.game_id === game.id)
    if (gameRounds.length === 0) return

    const rebuilt: HthPairRounds = {}
    for (const pair of pairs) {
      const aId = pair.team_a_id!; const bId = pair.team_b_id!
      const pairCRs = gameRounds.filter(r =>
        r.scores.length === 2 && r.scores.some(s => s.team_id === aId) && r.scores.some(s => s.team_id === bId)
      )
      const namesA = gameParticipants.filter(p => p.game_id === game.id && p.team_id === aId).sort((a, b) => a.sort_order - b.sort_order)
      const namesB = gameParticipants.filter(p => p.game_id === game.id && p.team_id === bId).sort((a, b) => a.sort_order - b.sort_order)
      const rounds: HthRound[] = []
      for (let i = 0; i < Math.max(totalRounds, pairCRs.length); i++) {
        if (i < pairCRs.length) {
          const cr = pairCRs[i]
          const scoreA = cr.scores.find(s => s.team_id === aId)?.score ?? 0
          const scoreB = cr.scores.find(s => s.team_id === bId)?.score ?? 0
          rounds.push({
            winnerId: scoreA > scoreB ? aId : scoreB > scoreA ? bId : null,
            nameA: namesA[i]?.name ?? '',
            nameB: namesB[i]?.name ?? '',
          })
        } else {
          rounds.push({ winnerId: null, nameA: '', nameB: '' })
        }
      }
      rebuilt[pair.id] = rounds
    }
    setPairRounds(rebuilt)
    setLoadedFromDb(true)
  }, [pairs.length, cumulativeRounds, loadedFromDb])

  // Auto-expand the newest pair when added
  useEffect(() => {
    if (pairs.length > 0) {
      const lastId = pairs[pairs.length - 1].id
      if (!expandedPairId || !pairs.find(p => p.id === expandedPairId)) {
        setExpandedPairId(lastId)
      }
    }
  }, [pairs.length])

  function emptyRounds(): HthRound[] {
    return Array.from({ length: totalRounds }, () => ({ winnerId: null, nameA: '', nameB: '' }))
  }
  function getRounds(matchId: string) { return pairRounds[matchId] ?? emptyRounds() }
  function getRoundIdx(matchId: string) { return activeRoundIdx[matchId] ?? 0 }

  async function addPair() {
    if (!pendingA || !pendingB || pendingA === pendingB) return
    await saveBracketMatch({
      game_id: game.id, round: 1, match_number: pairs.length + 1,
      team_a_id: pendingA, team_b_id: pendingB,
      score_a: null, score_b: null, winner_id: null, loser_bracket: false,
    })
    setPendingA(''); setPendingB('')
  }

  function updateRound(matchId: string, idx: number, patch: Partial<HthRound>) {
    setPairRounds(p => {
      const existing = getRounds(matchId)
      return { ...p, [matchId]: existing.map((rd, i) => i === idx ? { ...rd, ...patch } : rd) }
    })
  }

  function winsFor(matchId: string, teamId: string) {
    return getRounds(matchId).filter(r => r.winnerId === teamId).length
  }

  function getUnbeatable(matchId: string, aId: string, bId: string): string | null {
    const remaining = getRounds(matchId).filter(r => !r.winnerId).length
    const wA = winsFor(matchId, aId); const wB = winsFor(matchId, bId)
    if (wA > wB + remaining) return aId
    if (wB > wA + remaining) return bId
    return null
  }

  async function handleFinish() {
    setShowPin(false); setSaving(true)
    try {
      await clearCumulativeRounds(game.id)
      for (const pair of pairs) {
        const pA = teams.find(t => t.id === pair.team_a_id)
        const pB = teams.find(t => t.id === pair.team_b_id)
        if (!pA || !pB) continue
        for (const round of getRounds(pair.id).filter(r => r.winnerId)) {
          await addCumulativeRound(game.id, [
            { team_id: pA.id, score: round.winnerId === pA.id ? 1 : 0 },
            { team_id: pB.id, score: round.winnerId === pB.id ? 1 : 0 },
          ])
        }
        const namesA = getRounds(pair.id).map(r => r.nameA)
        const namesB = getRounds(pair.id).map(r => r.nameB)
        if (namesA.some(n => n)) await saveGameParticipants(game.id, pA.id, namesA)
        if (namesB.some(n => n)) await saveGameParticipants(game.id, pB.id, namesB)
      }
      await updateGame(game.id, { status: 'completed' })
    } catch (e) {
      console.error('HeadToHead save failed:', e)
    }
    setSaving(false)
  }

  const hasAnyResult = pairs.some(p => getRounds(p.id).some(r => r.winnerId))

  return (
    <div className="results-entry">
      {saving && <div className="re-saving-overlay"><div className="re-spinner" /><span>Saving results…</span></div>}
      {/* ── Add pair row ─────────────────────────────── */}
      {!isComplete && (
        <div className="hth-add-pair-row">
          <select className="mp-select" value={pendingA} onChange={e => setPendingA(e.target.value)}>
            <option value="">Select team…</option>
            {teams.filter(t => !usedIds.has(t.id) && t.id !== pendingB).map(t =>
              <option key={t.id} value={t.id}>{t.name}</option>
            )}
          </select>
          <span className="mp-vs">vs</span>
          <select className="mp-select" value={pendingB} onChange={e => setPendingB(e.target.value)}>
            <option value="">Select team…</option>
            {teams.filter(t => !usedIds.has(t.id) && t.id !== pendingA).map(t =>
              <option key={t.id} value={t.id}>{t.name}</option>
            )}
          </select>
          <button className="mp-set-btn" onClick={addPair} disabled={!pendingA || !pendingB || pendingA === pendingB}>
            + Add
          </button>
        </div>
      )}

      {/* ── Pair accordions ───────────────────────────── */}
      {pairs.map(pair => {
        const tA = teams.find(t => t.id === pair.team_a_id)
        const tB = teams.find(t => t.id === pair.team_b_id)
        if (!tA || !tB) return null
        const pid = pair.id
        const expanded = expandedPairId === pid
        const rounds = getRounds(pid)
        const roundIdx = getRoundIdx(pid)
        const currentRound = rounds[roundIdx]
        const unbeatable = getUnbeatable(pid, tA.id, tB.id)
        const wA = winsFor(pid, tA.id); const wB = winsFor(pid, tB.id)
        const pairDone = rounds.every(r => r.winnerId)

        return (
          <div key={pid} className={`hth-accordion ${expanded ? 'open' : ''} ${pairDone ? 'done' : ''}`}>
            {/* Accordion header */}
            <div className="hth-acc-header-row">
              <button className="hth-acc-header" onClick={() => setExpandedPairId(expanded ? null : pid)}>
                <div className="hth-acc-teams">
                  <span className="hth-tab-dot" style={{ background: tA.color }} />
                  <span className="hth-acc-name">{tA.name}</span>
                  <span className="hth-acc-score">{wA}W</span>
                  <span className="hth-acc-vs">vs</span>
                  <span className="hth-acc-score">{wB}W</span>
                  <span className="hth-acc-name">{tB.name}</span>
                  <span className="hth-tab-dot" style={{ background: tB.color }} />
                </div>
                <span className="hth-acc-status">
                  {pairDone ? '✓ Done' : `${rounds.filter(r => r.winnerId).length}/${totalRounds}`}
                  <span className="hth-acc-chevron">{expanded ? '▲' : '▼'}</span>
                </span>
              </button>
              {!isComplete && (
                <button className="mp-reset-btn" title="Remove this matchup" onClick={async () => {
                  await deleteBracketMatch(pid)
                  setPairRounds(p => { const n = { ...p }; delete n[pid]; return n })
                  setActiveRoundIdx(p => { const n = { ...p }; delete n[pid]; return n })
                  if (expandedPairId === pid) setExpandedPairId(null)
                }}>↺</button>
              )}
            </div>

            {/* Accordion body */}
            {expanded && (
              <div className="hth-acc-body">
                {unbeatable && (
                  <div className="hth-leader-banner">
                    🏆 {teams.find(t => t.id === unbeatable)?.name} cannot be beaten!
                  </div>
                )}

                <div className="hth-round-header">
                  <span className="hth-round-label">Round {roundIdx + 1} of {totalRounds}</span>
                  <div className="hth-round-dots">
                    {rounds.map((rd, i) => {
                      const cls = rd.winnerId === tA.id ? 'won-a' : rd.winnerId === tB.id ? 'won-b' : ''
                      return (
                        <button key={i}
                          className={`hth-round-dot ${cls} ${i === roundIdx ? 'active' : ''}`}
                          style={{ '--ca': tA.color, '--cb': tB.color } as React.CSSProperties}
                          onClick={() => setActiveRoundIdx(p => ({ ...p, [pid]: i }))} />
                      )
                    })}
                  </div>
                </div>

                <div className="hth-matchup">
                  <div className={`hth-side ${currentRound?.winnerId === tA.id ? 'winner' : currentRound?.winnerId ? 'loser' : ''}`}>
                    <div className="hth-side-header">
                      <span className="hth-side-dot" style={{ background: tA.color }} />
                      <span className="hth-side-name">{tA.name}</span>
                    </div>
                    <input className="hth-name-input" placeholder="Person's name (optional)"
                      value={currentRound?.nameA ?? ''}
                      onChange={e => updateRound(pid, roundIdx, { nameA: e.target.value })}
                      disabled={isComplete} />
                    {!isComplete && (
                      <button className={`hth-won-btn ${currentRound?.winnerId === tA.id ? 'selected' : ''}`}
                        onClick={() => updateRound(pid, roundIdx, { winnerId: tA.id })}>
                        {currentRound?.winnerId === tA.id ? '✓ Won this round' : 'Won this round'}
                      </button>
                    )}
                  </div>

                  <div className="hth-divider">vs</div>

                  <div className={`hth-side ${currentRound?.winnerId === tB.id ? 'winner' : currentRound?.winnerId ? 'loser' : ''}`}>
                    <div className="hth-side-header">
                      <span className="hth-side-dot" style={{ background: tB.color }} />
                      <span className="hth-side-name">{tB.name}</span>
                    </div>
                    <input className="hth-name-input" placeholder="Person's name (optional)"
                      value={currentRound?.nameB ?? ''}
                      onChange={e => updateRound(pid, roundIdx, { nameB: e.target.value })}
                      disabled={isComplete} />
                    {!isComplete && (
                      <button className={`hth-won-btn ${currentRound?.winnerId === tB.id ? 'selected' : ''}`}
                        onClick={() => updateRound(pid, roundIdx, { winnerId: tB.id })}>
                        {currentRound?.winnerId === tB.id ? '✓ Won this round' : 'Won this round'}
                      </button>
                    )}
                  </div>
                </div>

                {!isComplete && (
                  <div className="hth-nav">
                    <button className="hth-nav-btn" onClick={() => setActiveRoundIdx(p => ({ ...p, [pid]: Math.max(0, roundIdx - 1) }))} disabled={roundIdx === 0}>← Prev</button>
                    {roundIdx < totalRounds - 1
                      ? <button className="hth-nav-btn primary" disabled={!currentRound?.winnerId} onClick={() => setActiveRoundIdx(p => ({ ...p, [pid]: roundIdx + 1 }))}>Next →</button>
                      : pairDone && <button className="hth-nav-btn primary" onClick={() => setExpandedPairId(null)}>Done ✓</button>
                    }
                  </div>
                )}

                {rounds.some(r => r.winnerId) && (
                  <div className="hth-history">
                    <span className="hth-history-label">Results so far</span>
                    {rounds.map((r, i) => {
                      if (!r.winnerId) return null
                      const winner = r.winnerId === tA.id ? tA : tB
                      const loser = r.winnerId === tA.id ? tB : tA
                      const winnerName = r.winnerId === tA.id ? r.nameA : r.nameB
                      const loserName = r.winnerId === tA.id ? r.nameB : r.nameA
                      return (
                        <div key={i} className="hth-history-row">
                          <span className="hth-history-round">R{i + 1}</span>
                          <span className="hth-history-winner" style={{ color: winner.color }}>{winner.name}</span>
                          {winnerName && <span className="hth-history-person">({winnerName})</span>}
                          <span className="hth-history-beat">beat</span>
                          <span className="hth-history-loser" style={{ color: loser.color }}>{loser.name}</span>
                          {loserName && <span className="hth-history-person">({loserName})</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {!isComplete && hasAnyResult && (
        <button className="re-save" onClick={() => setShowPin(true)} disabled={saving}>
          {saving ? 'Saving…' : 'Finish Game'}
        </button>
      )}

      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={handleFinish} onCancel={() => setShowPin(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Tape Entry (Marathon + elimination games) ─────────────────
function TapeEntry({ game, teams }: { game: Game; teams: Team[] }) {
  const participantResults = useStore(s => s.participantResults)
  const saveParticipantResults = useStore(s => s.saveParticipantResults)
  const updateGame = useStore(s => s.updateGame)
  const logAudit = useStore(s => s.logAudit)

  const isElimination = game.scoring_direction === 'higher_is_better'
  const hint = isElimination
    ? 'Tap a team each time one of their participants gets eliminated'
    : 'Tap a team each time one of their participants crosses the finish line'
  const emptyLabel = isElimination ? 'No eliminations recorded yet' : 'No finishers recorded yet'
  const saveLabel = isElimination ? 'Finish Game' : 'Finish'
  const tapIcon = isElimination ? '💀' : '🏃'

  const [tapOrder, setTapOrder] = useState<string[]>(() => {
    const existing = participantResults
      .filter(r => r.game_id === game.id)
      .sort((a, b) => a.position - b.position)
    return existing.map(r => r.team_id)
  })

  const [showPin, setShowPin] = useState(false)
  const [showUndoAllPin, setShowUndoAllPin] = useState(false)
  const [saved, setSaved] = useState(false)
  const tapeRef = useRef<HTMLDivElement>(null)

  const countMap = tapOrder.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  function tapTeam(teamId: string) {
    setTapOrder(prev => {
      const next = [...prev, teamId]
      setTimeout(() => { tapeRef.current?.scrollTo({ top: tapeRef.current.scrollHeight, behavior: 'smooth' }) }, 30)
      return next
    })
  }

  function undo() { setTapOrder(prev => prev.slice(0, -1)) }
  function undoAll() { setTapOrder([]); setShowUndoAllPin(false) }

  async function handleConfirm() {
    setShowPin(false)
    const results = tapOrder.map((teamId, i) => ({
      team_id: teamId, participant_name: '', position: i + 1,
    }))
    await saveParticipantResults(game.id, results)
    await updateGame(game.id, { status: 'completed' })
    await logAudit('save_results', game.id, game.name, {
      type: game.type,
      participant_count: results.length,
      entries: results.map(r => ({
        position: r.position,
        team: teams.find(t => t.id === r.team_id)?.name ?? r.team_id,
      })),
    })
    setSaved(true)
  }

  const isComplete = game.status === 'completed'

  return (
    <div className="results-entry marathon-entry">
      <p className="re-hint">{hint}</p>

      <div className="marathon-tape" ref={tapeRef}>
        {tapOrder.length === 0
          ? <p className="marathon-tape-empty">{emptyLabel}</p>
          : tapOrder.map((teamId, i) => {
              const team = teams.find(t => t.id === teamId)
              return (
                <div key={i} className="marathon-tape-row">
                  <span className="marathon-pos">{tapIcon} #{i + 1}</span>
                  <span className="marathon-dot" style={{ background: team?.color }} />
                  <span className="marathon-team-name">{team?.name}</span>
                </div>
              )
            })
        }
      </div>

      {!isComplete && tapOrder.length > 0 && (
        <div className="marathon-undo-row">
          <button className="marathon-undo" onClick={undo}>↺ Undo last</button>
          <button className="marathon-undo marathon-undo-all" onClick={() => setShowUndoAllPin(true)}>✕ Undo all</button>
        </div>
      )}

      {!isComplete && (
        <div className="marathon-buttons">
          {teams.map(team => (
            <button
              key={team.id}
              className="marathon-team-btn"
              style={{ '--tc': team.color } as React.CSSProperties}
              onClick={() => tapTeam(team.id)}
            >
              <span className="marathon-btn-dot" />
              <span className="marathon-btn-name">{team.name}</span>
              {countMap[team.id] ? <span className="marathon-btn-count">{countMap[team.id]}</span> : null}
            </button>
          ))}
        </div>
      )}

      <div className="marathon-summary">
        {teams.map(team => (
          <span key={team.id} className="marathon-summary-chip" style={{ '--tc': team.color } as React.CSSProperties}>
            <span className="marathon-summary-dot" />
            {team.name}: <strong>{countMap[team.id] ?? 0}</strong>
          </span>
        ))}
      </div>

      {!isComplete && tapOrder.length > 0 && (
        <button className={`re-save ${saved ? 'saved' : ''}`} onClick={() => setShowPin(true)}>
          {saved ? '✓ Saved' : saveLabel}
        </button>
      )}

      <AnimatePresence>
        {showPin && <PinConfirmModal onConfirm={handleConfirm} onCancel={() => setShowPin(false)} />}
        {showUndoAllPin && <PinConfirmModal onConfirm={undoAll} onCancel={() => setShowUndoAllPin(false)} />}
      </AnimatePresence>
    </div>
  )
}
