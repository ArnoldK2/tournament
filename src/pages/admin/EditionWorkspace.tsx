import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import ResultsEntry from './ResultsEntry'
import type { Game, GameType, ScoringDirection } from '../../types'
import '../../styles/admin.css'
import '../../styles/workspace.css'

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'standard',            label: 'Standard',           desc: 'One position per team' },
  { value: 'points',              label: 'Points',             desc: 'Raw score per team' },
  { value: 'multi_participant',   label: 'Multi-Participant',  desc: 'Individual athletes per team' },
  { value: 'cumulative',          label: 'Cumulative Rounds',  desc: 'Scores add up across rounds' },
  { value: 'bracket_single',      label: 'Single Elimination', desc: 'Lose once and you\'re out' },
  { value: 'bracket_double',      label: 'Double Elimination', desc: 'Two losses to be eliminated' },
  { value: 'bracket_round_robin', label: 'Round Robin',        desc: 'Everyone plays everyone' },
]

export default function EditionWorkspace() {
  const { clientId, editionId } = useParams<{ clientId: string; editionId: string }>()
  const navigate = useNavigate()

  const clients = useStore(s => s.clients)
  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const allGames = useStore(s => s.games)
  const allEditions = useStore(s => s.editions)
  const role = useStore(s => s.currentRole)
  const updateEdition = useStore(s => s.updateEdition)
  const addGame = useStore(s => s.addGame)
  const updateGame = useStore(s => s.updateGame)
  const deleteGame = useStore(s => s.deleteGame)
  const copyGamesToEdition = useStore(s => s.copyGamesToEdition)

  const edition = editions.find(e => e.id === editionId)
  const event = events.find(e => e.id === edition?.event_id)
  const client = clients.find(c => c.id === clientId)
  const games = useMemo(
    () => allGames.filter(g => g.edition_id === editionId).sort((a, b) => a.order - b.order),
    [allGames, editionId]
  )

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

  // Game form state
  const [gameName, setGameName] = useState('')
  const [gameType, setGameType] = useState<GameType>('standard')
  const [direction, setDirection] = useState<ScoringDirection>('lower_is_better')
  const [weight, setWeight] = useState(1)
  const [gameStatus, setGameStatus] = useState<'pending' | 'active' | 'completed'>('pending')

  if (!edition || !event || !client) { navigate(`/admin/${clientId}`); return null }

  function openAddGame() {
    setEditingGame(null); setGameName(''); setGameType('standard')
    setDirection('lower_is_better'); setWeight(1); setGameStatus('pending')
    setShowGameForm(true)
  }

  function openEditGame(g: Game) {
    setEditingGame(g); setGameName(g.name); setGameType(g.type)
    setDirection(g.scoring_direction); setWeight(g.weight); setGameStatus(g.status)
    setShowGameForm(true)
  }

  function saveGame() {
    if (!gameName.trim()) return
    const base = { edition_id: editionId!, name: gameName.trim(), type: gameType, scoring_direction: direction, weight, status: gameStatus }
    if (editingGame) updateGame(editingGame.id, base)
    else addGame({ ...base, order: games.length + 1 })
    setShowGameForm(false)
  }

  const needsDirection = ['standard', 'multi_participant', 'cumulative'].includes(gameType)
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
                      <div className="ws-panel-actions">
                        {role === 'client_admin' && (
                          <>
                            <button className="alr-btn" onClick={() => openEditGame(game)}>Edit game</button>
                            <button className="alr-btn danger" onClick={() => { deleteGame(game.id); setActiveGameId(null) }}>Delete</button>
                          </>
                        )}
                        <button
                          className={`alr-btn ${game.status === 'active' ? 'success' : ''}`}
                          onClick={() => updateGame(game.id, { status: game.status === 'pending' ? 'active' : game.status === 'active' ? 'completed' : 'pending' })}
                        >
                          {game.status === 'pending' ? '▶ Start' : game.status === 'active' ? '✓ Complete' : '↩ Reopen'}
                        </button>
                      </div>

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
