import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { computeLeaderboard } from '../../store/scoring'
import { editionStatus } from '../../lib/editionStatus'
import AdminHeader from '../../components/AdminHeader'
import ResultsEntry from './ResultsEntry'
import type { Game, GameType, ScoringDirection, Team, GameParticipant } from '../../types'
import '../../styles/admin.css'
import '../../styles/workspace.css'

const MEDALS = ['🥇', '🥈', '🥉']

function GameTop3({ game, teams }: { game: Game; teams: Team[] }) {
  const standardResults = useStore(s => s.standardResults)
  const pointsResults = useStore(s => s.pointsResults)
  const participantResults = useStore(s => s.participantResults)
  const participantAttemptResults = useStore(s => s.participantAttemptResults)
  const cumulativeRounds = useStore(s => s.cumulativeRounds)
  const bracketMatches = useStore(s => s.bracketMatches)

  const top3 = useMemo(() => {
    const entries = computeLeaderboard({
      games: [game], teams,
      standardResults, pointsResults, participantResults,
      participantAttemptResults, cumulativeRounds, bracketMatches,
    })
    return entries.filter(e => e.total_score > 0).slice(0, 3)
  }, [game, teams, standardResults, pointsResults, participantResults, participantAttemptResults, cumulativeRounds, bracketMatches])

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
function TeamPlayerRow({ game, team, count, allParticipants, onNamesChange }: {
  game: Game
  team: Team
  count: number
  allParticipants: GameParticipant[]
  onNamesChange: (teamId: string, names: string[]) => void
}) {
  const existing = allParticipants
    .filter(p => p.game_id === game.id && p.team_id === team.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(p => p.name)

  const [names, setNames] = useState<string[]>(() => {
    const base = existing.length ? existing : []
    return Array.from({ length: count }, (_, i) => base[i] ?? '')
  })

  useEffect(() => {
    const base = existing.length ? existing : []
    setNames(Array.from({ length: count }, (_, i) => base[i] ?? ''))
  }, [count, allParticipants.length, game.id, team.id])

  function update(i: number, val: string) {
    setNames(prev => {
      const n = [...prev]; n[i] = val
      onNamesChange(team.id, n)
      return n
    })
  }

  return (
    <div className="ws-pl-team">
      <div className="ws-pl-team-label">
        <span className="ws-pl-dot" style={{ background: team.color }} />
        <span className="ws-pl-tname">{team.name}</span>
      </div>
      <div className="ws-pl-inputs">
        {names.map((name, i) => (
          <div key={i} className="ws-pl-row">
            <input
              className="ws-pl-input"
              value={name}
              placeholder={`Player ${i + 1}`}
              onChange={e => update(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function GameParticipantsPanel({ game, teams }: { game: Game; teams: Team[] }) {
  const allParticipants = useStore(s => s.gameParticipants)
  const saveGameParticipants = useStore(s => s.saveGameParticipants)

  const maxExisting = teams.reduce((max, t) => {
    const n = allParticipants.filter(p => p.game_id === game.id && p.team_id === t.id).length
    return Math.max(max, n)
  }, 0)

  const [count, setCount] = useState(maxExisting || 1)
  const [teamNames, setTeamNames] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleNamesChange(teamId: string, names: string[]) {
    setTeamNames(prev => ({ ...prev, [teamId]: names }))
    setSaved(false)
  }

  async function saveAll() {
    setSaving(true)
    await Promise.all(teams.map(t => {
      const names = (teamNames[t.id] ?? Array.from({ length: count }, (_, i) => {
        const existing = allParticipants
          .filter(p => p.game_id === game.id && p.team_id === t.id)
          .sort((a, b) => a.sort_order - b.sort_order)
        return existing[i]?.name ?? ''
      })).map(n => n.trim()).filter(Boolean)
      return saveGameParticipants(game.id, t.id, names)
    }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="ws-pl-wrap">
      <div className="ws-pl-controls">
        <span className="ws-pl-label">Players per team</span>
        <input
          className="ws-pl-count-input"
          type="number"
          min={1}
          value={count}
          onChange={e => { const v = parseInt(e.target.value); if (v > 0) setCount(v) }}
        />
        <button className="ws-pl-save-all" onClick={saveAll} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save All'}
        </button>
      </div>
      <div className="ws-pl-grid">
        {teams.map(team => (
          <TeamPlayerRow
            key={team.id}
            game={game}
            team={team}
            count={count}
            allParticipants={allParticipants}
            onNamesChange={handleNamesChange}
          />
        ))}
      </div>
    </div>
  )
}

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'standard',              label: 'Standard',           desc: 'One position per team' },
  { value: 'points',                label: 'Points / Counts',    desc: 'Enter points scored by each team' },
  { value: 'multi_participant',     label: 'Multi-Participant',  desc: 'Individual athletes per team' },
  { value: 'participant_attempts',  label: 'Attempt Tracker',    desc: 'Track hits/misses per participant' },
  { value: 'cumulative',            label: 'Cumulative Rounds',  desc: 'Scores add up across rounds' },
  { value: 'match_play',            label: 'Match Play',         desc: 'Teams paired in matches, points for win/loss' },
  { value: 'completion',            label: 'Completion',         desc: 'Teams finish or don\'t — done scores, not done doesn\'t' },
  { value: 'tally',                 label: 'Tally',              desc: 'Tap to record each event live — buzzer, cans knocked, etc.' },
  { value: 'lives',                 label: 'Lives',              desc: 'Each team starts with N lives — tap BUZZ to lose one' },
  { value: 'head_to_head',         label: 'Head to Head',       desc: 'One winner per round — team with most round wins takes it' },
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
  const organizations = useStore(s => s.organizations)
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
  const org = organizations.find(o => o.id === client?.organization_id)
  const games = useMemo(
    () => allGames.filter(g => g.edition_id === editionId).sort((a, b) => a.order - b.order),
    [allGames, editionId]
  )
  const teams = useMemo(() => allTeams.filter(t => t.event_id === event?.id), [allTeams, event?.id])
  const gameParticipants = useStore(s => s.gameParticipants)

  // Previous edition of same event (for copy)
  const prevEdition = useMemo(() => {
    if (!edition) return null
    return allEditions
      .filter(e => e.event_id === edition.event_id && e.id !== editionId)
      .sort((a, b) => b.label.localeCompare(a.label))[0] ?? null
  }, [allEditions, edition, editionId])

  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'completed'>('active')
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [gameTab, setGameTab] = useState<'results' | 'players'>('results')
  const [showGameForm, setShowGameForm] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearConfirm, setClearConfirm] = useState('')
  const [clearing, setClearing] = useState(false)

  // Game form state
  const [gameName, setGameName] = useState('')
  const [gameType, setGameType] = useState<GameType>('standard')
  const [direction, setDirection] = useState<ScoringDirection>('lower_is_better')
  const [gameScoringMode, setGameScoringMode] = useState<'dynamic' | 'fixed'>('dynamic')
  const [weight, setWeight] = useState(1)
  const [gameStatus, setGameStatus] = useState<'pending' | 'active' | 'completed'>('pending')
  const [isFunGame, setIsFunGame] = useState(false)
  const [participantsPerTeam, setParticipantsPerTeam] = useState(1)
  const [attemptsPerParticipant, setAttemptsPerParticipant] = useState(1)

  if (!edition || !event || !client) { navigate(`/admin/${clientId}`); return null }

  function openAddGame() {
    setEditingGame(null); setGameName(''); setGameType('standard')
    setDirection('lower_is_better'); setGameScoringMode('dynamic'); setWeight(1); setGameStatus('pending')
    setIsFunGame(false); setParticipantsPerTeam(1); setAttemptsPerParticipant(1)
    setShowGameForm(true)
  }

  function openEditGame(g: Game) {
    setEditingGame(g); setGameName(g.name); setGameType(g.type)
    setDirection(g.scoring_direction); setGameScoringMode(g.scoring_mode ?? 'dynamic')
    setWeight(g.weight); setGameStatus(g.status)
    setIsFunGame(g.is_fun ?? false)
    setParticipantsPerTeam(g.participants_per_team ?? 1)
    setAttemptsPerParticipant(g.attempts_per_participant ?? 1)
    setShowGameForm(true)
  }

  function saveGame() {
    if (!gameName.trim()) return
    const base = {
      edition_id: editionId!, name: gameName.trim(), type: gameType,
      scoring_direction: (gameType === 'participant_attempts' || gameType === 'head_to_head') ? 'higher_is_better' as const : direction,
      scoring_mode: gameScoringMode,
      weight, status: gameStatus, is_fun: isFunGame,
      ...((gameType === 'participant_attempts') ? { participants_per_team: participantsPerTeam, attempts_per_participant: attemptsPerParticipant } : {}),
      ...((gameType === 'tally' || gameType === 'lives' || gameType === 'head_to_head') ? { participants_per_team: participantsPerTeam } : {}),
    }
    if (editingGame) updateGame(editingGame.id, base)
    else addGame({ ...base, order: games.length + 1 })
    setShowGameForm(false)
  }

  const needsDirection = ['standard', 'multi_participant', 'cumulative', 'points', 'tally'].includes(gameType)
  const needsScoringMode = ['standard', 'points', 'multi_participant', 'participant_attempts', 'cumulative', 'tally', 'lives', 'head_to_head'].includes(gameType)
  return (
    <div className="admin-root">
      <AdminHeader
        orgName={org?.name}
        crumbs={[
          { label: 'Clients', to: `/admin/orgs/${client.organization_id}` },
          { label: client.name, to: `/admin/${clientId}` },
          { label: event.name, to: `/admin/${clientId}` },
          { label: edition.label, badge: { text: editionStatus(edition.date), status: editionStatus(edition.date) } },
        ]}
      >
          {role === 'super_admin' && (
            <button
              className="icon-btn danger-btn"
              onClick={() => { setClearConfirm(''); setShowClearModal(true) }}
              title="Clear all results"
            >
              ⚠
            </button>
          )}
          <button className="ew-leaderboard-btn" onClick={() => navigate(`/leaderboard/${editionId}`)}>
            <span>Leaderboard</span> ↗
          </button>
      </AdminHeader>

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
          {games.filter(g => g.status === statusFilter).sort((a, b) => a.name.localeCompare(b.name)).map(game => (
            <div key={game.id}>
              <button
                className={`ws-game-row ${activeGameId === game.id ? 'active' : ''}`}
                onClick={() => { setActiveGameId(activeGameId === game.id ? null : game.id); setGameTab('results') }}
              >
                <div className="wsgr-left">
                  <span className={`status-dot dot-${game.status}`} />
                  <div className="wsgr-info">
                    <span className="wsgr-name">
                      {game.name}
                      {game.is_fun && <span className="wsgr-fun-badge">FUN</span>}
                    </span>
                    <span className="wsgr-type">
                      {GAME_TYPES.find(t => t.value === game.type)?.label}
                      {game.weight !== 1 && ` · ${game.weight}×`}
                    </span>
                  </div>
                </div>
                <div className="wsgr-right">
                  {gameParticipants.some(p => p.game_id === game.id) && (
                    <span className="wsgr-players-badge">
                      👤 {gameParticipants.filter(p => p.game_id === game.id).length}
                    </span>
                  )}
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
                      {/* Action bar */}
                      <div className="ws-panel-actions">
                        <button
                          className={`alr-btn ${game.status === 'active' ? 'success' : ''}`}
                          onClick={() => {
                            if (game.status === 'completed') { updateGame(game.id, { status: 'active' }); return }
                            const next = game.status === 'pending' ? 'active' : 'completed'
                            updateGame(game.id, { status: next, ...(next === 'active' && !game.started_at ? { started_at: new Date().toISOString() } : {}) })
                          }}
                        >
                          {game.status === 'pending' ? '▶ Start' : game.status === 'active' ? '✓ Complete' : '↩ Reopen'}
                        </button>
                        {(role === 'client_admin' || role === 'super_admin') && (
                          <>
                            <button className="alr-btn" onClick={() => openEditGame(game)}>Edit</button>
                          </>
                        )}
                      </div>

                      {/* Tab bar */}
                      <div className="ws-game-tabs">
                        <button className={`ws-game-tab ${gameTab === 'results' ? 'active' : ''}`} onClick={() => setGameTab('results')}>Results</button>
                        <button className={`ws-game-tab ${gameTab === 'players' ? 'active' : ''}`} onClick={() => setGameTab('players')}>Players</button>
                      </div>

                      {/* Tab content */}
                      {gameTab === 'results' && (
                        <>
                          {game.status === 'completed' && (
                            <GameTop3 game={game} teams={teams} />
                          )}
                          {game.status === 'pending' ? (
                            <div className="ws-pending-gate">
                              <span className="ws-pending-gate-icon">▶</span>
                              <p>Tap <strong>Start</strong> to activate this game and enter results.</p>
                            </div>
                          ) : (
                            <ResultsEntry game={game} eventId={event?.id ?? ''} />
                          )}
                        </>
                      )}
                      {gameTab === 'players' && (
                        game.status === 'pending' ? (
                          <div className="ws-pending-gate">
                            <span className="ws-pending-gate-icon">▶</span>
                            <p>Tap <strong>Start</strong> to activate this game and enter players.</p>
                          </div>
                        ) : (
                          <GameParticipantsPanel game={game} teams={teams} />
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Game form bottom sheet */}

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

              {gameType === 'tally' && (
                <>
                  <label className="modal-label">Tries per team</label>
                  <input
                    type="number" min={1} value={participantsPerTeam}
                    onChange={e => setParticipantsPerTeam(Number(e.target.value))}
                    className="modal-input"
                    style={{ width: '6rem' }}
                  />
                </>
              )}

              {gameType === 'lives' && (
                <>
                  <label className="modal-label">Lives per team</label>
                  <input
                    type="number" min={1} value={participantsPerTeam}
                    onChange={e => setParticipantsPerTeam(Number(e.target.value))}
                    className="modal-input" style={{ width: '6rem' }}
                  />
                </>
              )}

              {gameType === 'head_to_head' && (
                <>
                  <label className="modal-label">Number of rounds</label>
                  <input
                    type="number" min={1} value={participantsPerTeam}
                    onChange={e => setParticipantsPerTeam(Number(e.target.value))}
                    className="modal-input" style={{ width: '6rem' }}
                  />
                </>
              )}

              {gameType === 'participant_attempts' && (
                <>
                  <label className="modal-label">Participants per team</label>
                  <input
                    type="number" min={1} value={participantsPerTeam}
                    onChange={e => setParticipantsPerTeam(Number(e.target.value))}
                    className="modal-input" style={{ width: '6rem' }}
                  />
                  <label className="modal-label">Attempts per participant</label>
                  <input
                    type="number" min={1} value={attemptsPerParticipant}
                    onChange={e => setAttemptsPerParticipant(Number(e.target.value))}
                    className="modal-input" style={{ width: '6rem' }}
                  />
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

              {needsScoringMode && (
                <>
                  <label className="modal-label">Scoring Mode</label>
                  <div className="direction-row">
                    <button className={`direction-btn ${gameScoringMode === 'dynamic' ? 'selected' : ''}`} onClick={() => setGameScoringMode('dynamic')}>
                      Dynamic <span className="dir-eg">(raw score counts)</span>
                    </button>
                    <button className={`direction-btn ${gameScoringMode === 'fixed' ? 'selected' : ''}`} onClick={() => setGameScoringMode('fixed')}>
                      Fixed <span className="dir-eg">(re-rank by position)</span>
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

              {editingGame && (
                <>
                  <label className="modal-label">Status</label>
                  <div className="direction-row">
                    {(['pending', 'active', 'completed'] as const).map(s => (
                      <button key={s} className={`direction-btn ${gameStatus === s ? 'selected' : ''}`} onClick={() => setGameStatus(s)}>{s}</button>
                    ))}
                  </div>
                  {editingGame.status === 'completed' && gameStatus === 'pending' && (
                    <p className="reopen-warning">⚠ Setting to pending removes this game from the leaderboard until it is active or completed again.</p>
                  )}
                </>
              )}

              <label className="modal-label" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isFunGame} onChange={e => setIsFunGame(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#a78bfa', cursor: 'pointer' }} />
                <span>Fun game <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>— results not counted in leaderboard</span></span>
              </label>

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
