import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { computeLeaderboard } from '../../store/scoring'
import ResultsEntry from './ResultsEntry'
import type { Game, GameType, ScoringDirection, Team, GameParticipant } from '../../types'
import '../../styles/admin.css'
import '../../styles/workspace.css'

const MEDALS = ['🥇', '🥈', '🥉']

function GameTop3({ game, teams, scoringMode }: { game: Game; teams: Team[]; scoringMode: 'dynamic' | 'fixed' }) {
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const participantAttemptResults = useStore(s => s.participantAttemptResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const bracketMatches = useStore(s => s.bracketMatches)

  const top3 = useMemo(() => {
    const entries = computeLeaderboard({
      games: [game], teams, scoringMode,
      standardResults, pointsResults, participantResults,
      participantAttemptResults, cumulativeRounds, bracketMatches,
    })
    return entries.filter(e => e.total_score > 0).slice(0, 3)
  }, [game, teams, scoringMode, standardResults, pointsResults, participantResults, participantAttemptResults, cumulativeRounds, bracketMatches])

  if (!top3.length) return null
  return (
    <div className="ws-top3">
      {top3.map((e, i) => (
        <div key={e.team_id} className="ws-top3-row">
          <span className="ws-top3-medal">{MEDALS[i]}</span>
          <span className="ws-top3-name">{e.team_name}</span>
        </div>
      ))}
    </div>
  )
}

// ── Participant name entry per team ──────────────────────────
function TeamPlayerRow({ game, team, allParticipants, saveGameParticipants }: {
  game: Game
  team: Team
  allParticipants: GameParticipant[]
  saveGameParticipants: (gameId: string, teamId: string, names: string[]) => Promise<void>
}) {
  const existing = allParticipants
    .filter(p => p.game_id === game.id && p.team_id === team.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const [names, setNames] = useState<string[]>(() => existing.length ? existing.map(p => p.name) : [''])
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const stored = existing.map(p => p.name)
    setNames(stored.length ? stored : [''])
  }, [allParticipants.length, game.id, team.id])

  async function doSave(current: string[]) {
    await saveGameParticipants(game.id, team.id, current.map(n => n.trim()).filter(Boolean))
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  function update(i: number, val: string) {
    setNames(prev => { const n = [...prev]; n[i] = val; return n })
  }

  function remove(i: number) {
    const next = names.length > 1 ? names.filter((_, j) => j !== i) : ['']
    setNames(next)
    doSave(next)
  }

  return (
    <div className="ws-pl-team">
      <div className="ws-pl-team-label">
        <span className="ws-pl-dot" style={{ background: team.color }} />
        <span className="ws-pl-tname">{team.name.split(' ')[0]}</span>
        {flash && <span className="ws-pl-saved">✓</span>}
      </div>
      <div className="ws-pl-inputs">
        {names.map((name, i) => (
          <div key={i} className="ws-pl-row">
            <input
              className="ws-pl-input"
              value={name}
              placeholder={`Player ${i + 1}`}
              onChange={e => update(i, e.target.value)}
              onBlur={() => doSave(names)}
            />
            <button className="ws-pl-del" onClick={() => remove(i)} tabIndex={-1}>×</button>
          </div>
        ))}
        <button className="ws-pl-add" onClick={() => setNames(n => [...n, ''])}>+ player</button>
      </div>
    </div>
  )
}

function GameParticipantsPanel({ game, teams }: { game: Game; teams: Team[] }) {
  const allParticipants = useStore(s => s.gameParticipants)
  const saveGameParticipants = useStore(s => s.saveGameParticipants)
  const [open, setOpen] = useState(false)

  const hasAny = allParticipants.some(p => p.game_id === game.id)

  return (
    <div className="ws-pl-wrap">
      <button className="ws-pl-toggle" onClick={() => setOpen(o => !o)}>
        <span>Players</span>
        {hasAny && <span className="ws-pl-count">{allParticipants.filter(p => p.game_id === game.id).length}</span>}
        <span className="ws-pl-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ws-pl-grid">
          {teams.map(team => (
            <TeamPlayerRow
              key={team.id}
              game={game}
              team={team}
              allParticipants={allParticipants}
              saveGameParticipants={saveGameParticipants}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'standard',              label: 'Standard',           desc: 'One position per team' },
  { value: 'points',                label: 'Points',             desc: 'Raw score per team' },
  { value: 'multi_participant',     label: 'Multi-Participant',  desc: 'Individual athletes per team' },
  { value: 'participant_attempts',  label: 'Attempt Tracker',    desc: 'Track hits/misses per participant' },
  { value: 'cumulative',            label: 'Cumulative Rounds',  desc: 'Scores add up across rounds' },
  { value: 'bracket_single',        label: 'Single Elimination', desc: 'Lose once and you\'re out' },
  { value: 'bracket_double',        label: 'Double Elimination', desc: 'Two losses to be eliminated' },
  { value: 'bracket_round_robin',   label: 'Round Robin',        desc: 'Everyone plays everyone' },
]

export default function EditionWorkspace() {
  const { clientId, editionId } = useParams<{ clientId: string; editionId: string }>()
  const navigate = useNavigate()

  const clients = useStore(s => s.clients)
  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const allGames = useStore(s => s.games)
  const allEditions = useStore(s => s.editions)
  const allTeams = useStore(s => s.teams)
  const role = useStore(s => s.currentRole)
  const updateEdition = useStore(s => s.updateEdition)
  const addGame = useStore(s => s.addGame)
  const updateGame = useStore(s => s.updateGame)
  const deleteGame = useStore(s => s.deleteGame)
  const copyGamesToEdition = useStore(s => s.copyGamesToEdition)
  const clearEditionResults = useStore(s => s.clearEditionResults)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === clientId)
  const games = useMemo(
    () => allGames.filter(g => g.edition_id === editionId).sort((a, b) => a.order - b.order),
    [allGames, editionId]
  )
  const teams = useMemo(() => allTeams.filter(t => t.client_id === clientId), [allTeams, clientId])

  // Previous edition of same event (for copy)
  const prevEdition = useMemo(() => {
    if (!edition) return null
    return allEditions
      .filter(e => e.event_id === edition.event_id && e.id !== editionId)
      .sort((a, b) => b.label.localeCompare(a.label))[0] ?? null
  }, [allEditions, edition, editionId])

  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'completed'>('active')
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [showGameForm, setShowGameForm] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearConfirm, setClearConfirm] = useState('')
  const [clearing, setClearing] = useState(false)
  const [reopenGameId, setReopenGameId] = useState<string | null>(null)

  // Game form state
  const [gameName, setGameName] = useState('')
  const [gameType, setGameType] = useState<GameType>('standard')
  const [direction, setDirection] = useState<ScoringDirection>('lower_is_better')
  const [weight, setWeight] = useState(1)
  const [gameStatus, setGameStatus] = useState<'pending' | 'active' | 'completed'>('pending')
  const [participantsPerTeam, setParticipantsPerTeam] = useState(1)
  const [attemptsPerParticipant, setAttemptsPerParticipant] = useState(1)

  if (!edition || !event || !client) { navigate(`/admin/${clientId}`); return null }

  function openAddGame() {
    setEditingGame(null); setGameName(''); setGameType('standard')
    setDirection('lower_is_better'); setWeight(1); setGameStatus('pending')
    setParticipantsPerTeam(1); setAttemptsPerParticipant(1)
    setShowGameForm(true)
  }

  function openEditGame(g: Game) {
    setEditingGame(g); setGameName(g.name); setGameType(g.type)
    setDirection(g.scoring_direction); setWeight(g.weight); setGameStatus(g.status)
    setParticipantsPerTeam(g.participants_per_team ?? 1)
    setAttemptsPerParticipant(g.attempts_per_participant ?? 1)
    setShowGameForm(true)
  }

  function saveGame() {
    if (!gameName.trim()) return
    const base = {
      edition_id: editionId!, name: gameName.trim(), type: gameType,
      scoring_direction: gameType === 'participant_attempts' ? 'higher_is_better' as const : direction,
      weight, status: gameStatus,
      ...(gameType === 'participant_attempts' ? { participants_per_team: participantsPerTeam, attempts_per_participant: attemptsPerParticipant } : {}),
    }
    if (editingGame) updateGame(editingGame.id, base)
    else addGame({ ...base, order: games.length + 1 })
    setShowGameForm(false)
  }

  const needsDirection = ['standard', 'multi_participant', 'cumulative', 'points'].includes(gameType)
  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-breadcrumb">
          <button className="breadcrumb-btn" onClick={() => navigate(`/admin/${clientId}`)}>
            {client.name}
          </button>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{event.name} · {edition.label}</span>
        </div>
        <div className="admin-header-right">
          <div className="edition-status-wrap">
            {(role === 'client_admin' || role === 'super_admin') ? (
              <button className={`dec-status status-${edition.status} clickable`} onClick={() => setShowStatusPicker(s => !s)}>
                {edition.status} ▾
              </button>
            ) : (
              <span className={`dec-status status-${edition.status}`}>{edition.status}</span>
            )}
            <AnimatePresence>
              {showStatusPicker && (
                <motion.div
                  className="edition-status-dropdown"
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {(['upcoming', 'active', 'completed'] as const).map(s => (
                    <button
                      key={s}
                      className={`esd-option status-${s} ${edition.status === s ? 'current' : ''}`}
                      onClick={() => { updateEdition(editionId!, { status: s }); setShowStatusPicker(false) }}
                    >
                      {s === 'upcoming' && '○ '}
                      {s === 'active'   && '● '}
                      {s === 'completed' && '✓ '}
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {(role === 'client_admin' || role === 'super_admin') && (
            <button
              className={`scoring-mode-btn ${(edition.scoring_mode ?? 'dynamic') === 'fixed' ? 'fixed' : ''}`}
              onClick={() => updateEdition(editionId!, { scoring_mode: (edition.scoring_mode ?? 'dynamic') === 'fixed' ? 'dynamic' : 'fixed' })}
              title="Toggle scoring mode"
            >
              {(edition.scoring_mode ?? 'dynamic') === 'fixed' ? '★ Fixed Pts' : '○ Dynamic'}
            </button>
          )}
          {role === 'super_admin' && (
            <button
              className="icon-btn danger-btn"
              onClick={() => { setClearConfirm(''); setShowClearModal(true) }}
              title="Clear all results"
            >
              ⚠
            </button>
          )}
          <button className="icon-btn" onClick={() => navigate(`/leaderboard/${editionId}`)} title="View leaderboard">↗</button>
        </div>
      </header>

      <div className="workspace-body">
        {/* Header row */}
        <div className="ws-section-header">
          <div className="ws-header-actions">
            {prevEdition && games.length === 0 && (
              <button className="copy-btn" onClick={() => copyGamesToEdition(prevEdition.id, editionId!)}>
                Copy from {prevEdition.label}
              </button>
            )}
            {role !== 'guest' && (
              <button className="admin-add-btn sm" onClick={openAddGame}>+ Game</button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        {games.length > 0 && (
          <div className="ws-status-tabs">
            {(['active', 'pending', 'completed'] as const).map(s => {
              const count = games.filter(g => g.status === s).length
              return (
                <button
                  key={s}
                  className={`ws-status-tab ${statusFilter === s ? 'active' : ''} tab-${s}`}
                  onClick={() => { setStatusFilter(s); setActiveGameId(null) }}
                >
                  <span className={`status-dot dot-${s}`} />
                  <span className="wst-label">{s}</span>
                  {count > 0 && <span className="wst-count">{count}</span>}
                </button>
              )
            })}
          </div>
        )}

        {games.length === 0 && (
          <div className="ws-empty">
            <p>No games yet.</p>
            {prevEdition && (
              <button className="copy-btn" onClick={() => copyGamesToEdition(prevEdition.id, editionId!)}>
                Copy games from {prevEdition.label} edition
              </button>
            )}
          </div>
        )}

        {games.length > 0 && games.filter(g => g.status === statusFilter).length === 0 && (
          <div className="ws-empty">
            <p>No {statusFilter} games.</p>
          </div>
        )}

        <div className="ws-game-list">
          {games.filter(g => g.status === statusFilter).map(game => (
            <div key={game.id}>
              <button
                className={`ws-game-row ${activeGameId === game.id ? 'active' : ''}`}
                onClick={() => setActiveGameId(activeGameId === game.id ? null : game.id)}
              >
                <div className="wsgr-left">
                  <span className={`status-dot dot-${game.status}`} />
                  <div className="wsgr-info">
                    <span className="wsgr-name">{game.name}</span>
                    <span className="wsgr-type">
                      {GAME_TYPES.find(t => t.value === game.type)?.label}
                      {game.weight !== 1 && ` · ${game.weight}×`}
                    </span>
                  </div>
                </div>
                <div className="wsgr-right">
                  <span className={`status-chip status-${game.status}`}>{game.status}</span>
                  <span className="wsgr-chevron">{activeGameId === game.id ? '▲' : '▼'}</span>
                </div>
              </button>

              <AnimatePresence>
                {activeGameId === game.id && (
                  <motion.div
                    className="ws-game-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="ws-panel-inner">
                      <GameParticipantsPanel game={game} teams={teams} />

                      <div className="ws-panel-actions">
                        {role === 'client_admin' && (
                          <>
                            <button className="alr-btn" onClick={() => openEditGame(game)}>Edit game</button>
                            <button className="alr-btn danger" onClick={() => { deleteGame(game.id); setActiveGameId(null) }}>Delete</button>
                          </>
                        )}
                        <button
                          className={`alr-btn ${game.status === 'active' ? 'success' : ''}`}
                          onClick={() => {
                            if (game.status === 'completed') { setReopenGameId(game.id); return }
                            updateGame(game.id, { status: game.status === 'pending' ? 'active' : 'completed' })
                          }}
                        >
                          {game.status === 'pending' ? '▶ Start' : game.status === 'active' ? '✓ Complete' : '↩ Reopen'}
                        </button>
                      </div>

                      {game.status === 'completed' && (
                        <GameTop3 game={game} teams={teams} scoringMode={edition.scoring_mode ?? 'dynamic'} />
                      )}

                      <ResultsEntry game={game} clientId={clientId!} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Game form bottom sheet */}
      {/* ── Reopen Game Modal ── */}
      <AnimatePresence>
        {reopenGameId && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setReopenGameId(null)}
          >
            <motion.div
              className="modal-card"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 400 }}
            >
              <p className="modal-title">↩ Reopen Game</p>
              <p className="modal-label" style={{ marginBottom: '1rem' }}>
                How do you want to reopen <strong>{games.find(g => g.id === reopenGameId)?.name}</strong>?
              </p>
              <button
                className="modal-btn primary"
                style={{ width: '100%', marginBottom: '0.6rem' }}
                onClick={() => { updateGame(reopenGameId, { status: 'active' }); setReopenGameId(null) }}
              >
                ▶ Active — results still count toward leaderboard
              </button>
              <button
                className="modal-btn"
                style={{ width: '100%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
                onClick={() => { updateGame(reopenGameId, { status: 'pending' }); setReopenGameId(null) }}
              >
                ⏸ Pending — removes this game from the leaderboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear Results Modal (super_admin only) ── */}
      <AnimatePresence>
        {showClearModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !clearing && setShowClearModal(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 420 }}
            >
              <p className="modal-title" style={{ color: '#ef4444' }}>⚠ Clear All Results</p>
              <p className="modal-label" style={{ marginBottom: '0.4rem' }}>
                This will permanently delete every result and reset all games to <strong>pending</strong> for <strong>{edition.label}</strong>.
              </p>
              <p className="modal-label" style={{ marginBottom: '1rem', opacity: 0.7 }}>
                Type <strong>RESET</strong> to confirm.
              </p>
              <input
                className="modal-input"
                value={clearConfirm}
                onChange={e => setClearConfirm(e.target.value)}
                placeholder="RESET"
                autoFocus
              />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowClearModal(false)} disabled={clearing}>
                  Cancel
                </button>
                <button
                  className="modal-btn danger"
                  disabled={clearConfirm !== 'RESET' || clearing}
                  onClick={async () => {
                    setClearing(true)
                    await clearEditionResults(editionId!)
                    setClearing(false)
                    setShowClearModal(false)
                    setStatusFilter('pending')
                  }}
                >
                  {clearing ? 'Clearing…' : 'Clear All Results'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGameForm && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGameForm(false)}>
            <motion.div
              className="admin-modal bottom-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <h2 className="modal-title">{editingGame ? 'Edit Game' : 'Add Game'}</h2>

              <label className="modal-label">Game Name</label>
              <input className="modal-input" value={gameName} onChange={e => setGameName(e.target.value)} placeholder="e.g. 100m Sprint" autoFocus />

              <label className="modal-label">Type</label>
              <div className="game-type-grid">
                {GAME_TYPES.map(t => (
                  <button key={t.value} className={`game-type-btn ${gameType === t.value ? 'selected' : ''}`} onClick={() => setGameType(t.value)}>
                    <span className="gtb-label">{t.label}</span>
                    <span className="gtb-desc">{t.desc}</span>
                  </button>
                ))}
              </div>

              {gameType === 'participant_attempts' && (
                <>
                  <label className="modal-label">Participants per team</label>
                  <div className="weight-row">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`weight-btn ${participantsPerTeam === n ? 'selected' : ''}`} onClick={() => setParticipantsPerTeam(n)}>{n}</button>
                    ))}
                  </div>
                  <label className="modal-label">Attempts per participant</label>
                  <div className="weight-row">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} className={`weight-btn ${attemptsPerParticipant === n ? 'selected' : ''}`} onClick={() => setAttemptsPerParticipant(n)}>{n}</button>
                    ))}
                  </div>
                </>
              )}

              {needsDirection && (
                <>
                  <label className="modal-label">Scoring Direction</label>
                  <div className="direction-row">
                    <button className={`direction-btn ${direction === 'lower_is_better' ? 'selected' : ''}`} onClick={() => setDirection('lower_is_better')}>
                      Lower is Better <span className="dir-eg">(racing)</span>
                    </button>
                    <button className={`direction-btn ${direction === 'higher_is_better' ? 'selected' : ''}`} onClick={() => setDirection('higher_is_better')}>
                      Higher is Better <span className="dir-eg">(quiz)</span>
                    </button>
                  </div>
                </>
              )}

              <label className="modal-label">Weight <span className="modal-label-hint">multiplier</span></label>
              <div className="weight-row">
                {[0.5, 1, 1.5, 2, 3].map(w => (
                  <button key={w} className={`weight-btn ${weight === w ? 'selected' : ''}`} onClick={() => setWeight(w)}>{w}×</button>
                ))}
              </div>

              <label className="modal-label">Status</label>
              <div className="direction-row">
                {(['pending', 'active', 'completed'] as const).map(s => (
                  <button key={s} className={`direction-btn ${gameStatus === s ? 'selected' : ''}`} onClick={() => setGameStatus(s)}>{s}</button>
                ))}
              </div>
              {editingGame?.status === 'completed' && gameStatus === 'pending' && (
                <p className="reopen-warning">⚠ Setting to pending removes this game from the leaderboard until it is active or completed again.</p>
              )}

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowGameForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={saveGame} disabled={!gameName.trim()}>
                  {editingGame ? 'Save' : 'Add Game'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
