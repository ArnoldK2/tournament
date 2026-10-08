import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { editionStatus } from '../../lib/editionStatus'
import AdminShell from './AdminShell'
import type { GameType, ScoringDirection } from '../../types'
import '../../styles/admin.css'

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'standard',            label: 'Standard',            desc: 'One position per team (1st, 2nd, 3rd…)' },
  { value: 'points',              label: 'Points',              desc: 'Enter raw scores — system ranks automatically' },
  { value: 'multi_participant',   label: 'Multi-Participant',   desc: 'Individual athletes within each team' },
  { value: 'tape',                label: 'Tape',                desc: 'Finish-line tape — tap team buttons as participants cross' },
  { value: 'cumulative',          label: 'Cumulative Rounds',   desc: 'Same game played multiple times — scores add up' },
  { value: 'bracket_single',      label: 'Single Elimination',  desc: 'Lose once and you\'re out' },
  { value: 'bracket_double',      label: 'Double Elimination',  desc: 'Two losses to be eliminated' },
  { value: 'bracket_round_robin', label: 'Round Robin',         desc: 'Every team plays every other team' },
]

const STATUS_OPTIONS = ['pending', 'active', 'completed'] as const

export default function AdminGames() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()

  const events = useStore(s => s.events)
  const editions = useStore(s => s.editions)
  const allGames = useStore(s => s.games)
  const addGame = useStore(s => s.addGame)
  const updateGame = useStore(s => s.updateGame)
  const deleteGame = useStore(s => s.deleteGame)

  const clientEvents = events.filter(e => e.client_id === clientId)
  const [selectedEditionId, setSelectedEditionId] = useState<string>(() => {
    const active = editions.find(e => clientEvents.some(ev => ev.id === e.event_id) && editionStatus(e.date) === 'active')
    return active?.id ?? editions.find(e => clientEvents.some(ev => ev.id === e.event_id))?.id ?? ''
  })

  const clientEditions = editions.filter(e => clientEvents.some(ev => ev.id === e.event_id))
  const games = allGames.filter(g => g.edition_id === selectedEditionId).sort((a, b) => a.order - b.order)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [gameName, setGameName] = useState('')
  const [gameType, setGameType] = useState<GameType>('standard')
  const [direction, setDirection] = useState<ScoringDirection>('lower_is_better')
  const [weight, setWeight] = useState(1)
  const [status, setStatus] = useState<'pending' | 'active' | 'completed'>('pending')

  function openAdd() {
    setEditId(null); setGameName(''); setGameType('standard')
    setDirection('lower_is_better'); setWeight(1); setStatus('pending')
    setShowForm(true)
  }

  function openEdit(id: string) {
    const g = games.find(g => g.id === id)
    if (!g) return
    setEditId(id); setGameName(g.name); setGameType(g.type)
    setDirection(g.scoring_direction); setWeight(g.weight); setStatus(g.status)
    setShowForm(true)
  }

  function save() {
    if (!gameName.trim()) return
    const base = {
      edition_id: selectedEditionId,
      name: gameName.trim(),
      type: gameType,
      scoring_direction: direction,
      scoring_mode: 'dynamic' as const,
      weight,
      status,
    }
    if (editId) {
      updateGame(editId, base)
    } else {
      addGame({ ...base, order: games.length + 1 })
    }
    setShowForm(false)
  }

  const needsDirection = ['standard', 'multi_participant', 'tape', 'cumulative'].includes(gameType)

  return (
    <AdminShell title="Games" clientId={clientId!} onBack={() => navigate(`/admin/${clientId}`)}>
      {clientEditions.length > 0 && (
        <div className="admin-tab-row">
          {clientEditions.map(ed => {
            const ev = clientEvents.find(e => e.id === ed.event_id)
            return (
              <button
                key={ed.id}
                className={`admin-tab ${selectedEditionId === ed.id ? 'active' : ''}`}
                onClick={() => setSelectedEditionId(ed.id)}
              >
                {ev?.name} {ed.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="admin-list">
        {games.map(game => (
          <motion.div
            key={game.id}
            className="admin-list-row"
            layout
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="alr-info">
              <span className="alr-name">{game.name}</span>
              <span className="alr-meta">
                {GAME_TYPES.find(t => t.value === game.type)?.label}
                {game.weight !== 1 && ` · ${game.weight}× weight`}
              </span>
            </div>
            <div className="alr-actions">
              <span className={`status-chip status-${game.status}`}>{game.status}</span>
              <button className="alr-btn" onClick={() => openEdit(game.id)}>Edit</button>
              <button className="alr-btn danger" onClick={() => deleteGame(game.id)}>Delete</button>
            </div>
          </motion.div>
        ))}
        {games.length === 0 && <p className="admin-empty">No games yet.</p>}
      </div>

      <button className="admin-add-btn" onClick={openAdd}>+ Add Game</button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="admin-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="admin-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="modal-title">{editId ? 'Edit Game' : 'Add Game'}</h2>

              <label className="modal-label">Game Name</label>
              <input className="modal-input" value={gameName} onChange={e => setGameName(e.target.value)} placeholder="e.g. 100m Sprint" autoFocus />

              <label className="modal-label">Game Type</label>
              <div className="game-type-grid">
                {GAME_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`game-type-btn ${gameType === t.value ? 'selected' : ''}`}
                    onClick={() => setGameType(t.value)}
                  >
                    <span className="gtb-label">{t.label}</span>
                    <span className="gtb-desc">{t.desc}</span>
                  </button>
                ))}
              </div>

              {needsDirection && (
                <>
                  <label className="modal-label">Scoring Direction</label>
                  <div className="direction-row">
                    <button
                      className={`direction-btn ${direction === 'lower_is_better' ? 'selected' : ''}`}
                      onClick={() => setDirection('lower_is_better')}
                    >
                      Lower is Better <span className="dir-eg">(e.g. racing)</span>
                    </button>
                    <button
                      className={`direction-btn ${direction === 'higher_is_better' ? 'selected' : ''}`}
                      onClick={() => setDirection('higher_is_better')}
                    >
                      Higher is Better <span className="dir-eg">(e.g. quiz)</span>
                    </button>
                  </div>
                </>
              )}

              <label className="modal-label">Score Weight <span className="modal-label-hint">(multiplier, default 1×)</span></label>
              <div className="weight-row">
                {[0.5, 1, 1.5, 2, 3, 5].map(w => (
                  <button key={w} className={`weight-btn ${weight === w ? 'selected' : ''}`} onClick={() => setWeight(w)}>
                    {w}×
                  </button>
                ))}
              </div>

              <label className="modal-label">Status</label>
              <div className="direction-row">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} className={`direction-btn ${status === s ? 'selected' : ''}`} onClick={() => setStatus(s)}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="modal-btn primary" onClick={save} disabled={!gameName.trim()}>
                  {editId ? 'Save Changes' : 'Add Game'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  )
}
