import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  Client, TournamentEvent, Team, Edition, Game,
  StandardResult, PointsResult, ParticipantResult, ParticipantAttemptResult,
  CumulativeRound, BracketMatch, User, GameParticipant, Organization, GamePenalty,
} from '../types'

interface AppState {
  organizations: Organization[]
  clients: Client[]
  events: TournamentEvent[]
  teams: Team[]
  editions: Edition[]
  games: Game[]
  standardResults: StandardResult[]
  pointsResults: PointsResult[]
  participantResults: ParticipantResult[]
  participantAttemptResults: ParticipantAttemptResult[]
  cumulativeRounds: CumulativeRound[]
  bracketMatches: BracketMatch[]
  gameParticipants: GameParticipant[]
  users: User[]
  gamePenalties: GamePenalty[]

  loaded: boolean
  loadData: () => Promise<void>

  currentUserId: string | null
  currentOrgId: string | null
  currentRole: 'guest' | 'client_admin' | 'data_collector' | 'super_admin'

  login: (username: string, pin: string) => Promise<boolean>
  logout: () => void
  currentUser: () => User | null

  addOrganization: (data: Omit<Organization, 'id'>) => Promise<void>

  addClient: (data: Omit<Client, 'id'>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>

  addEvent: (data: Omit<TournamentEvent, 'id'>) => Promise<void>
  updateEvent: (id: string, data: Partial<TournamentEvent>) => Promise<void>

  addTeam: (data: Omit<Team, 'id'>) => Promise<void>
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>
  deleteTeam: (id: string) => Promise<void>

  addEdition: (data: Omit<Edition, 'id'>) => Promise<void>
  updateEdition: (id: string, data: Partial<Edition>) => Promise<void>

  addGame: (data: Omit<Game, 'id'>) => Promise<void>
  updateGame: (id: string, data: Partial<Game>) => Promise<void>
  deleteGame: (id: string) => Promise<void>
  copyGamesToEdition: (fromEditionId: string, toEditionId: string) => Promise<void>

  saveStandardResults: (gameId: string, results: { team_id: string; position: number }[]) => Promise<void>
  savePointsResults: (gameId: string, results: { team_id: string; raw_score: number }[]) => Promise<void>
  saveParticipantResults: (gameId: string, results: { team_id: string; participant_name: string; position: number }[]) => Promise<void>
  saveParticipantAttemptResults: (gameId: string, results: Omit<ParticipantAttemptResult, 'id'>[]) => Promise<void>
  addCumulativeRound: (gameId: string, scores: { team_id: string; score: number }[]) => Promise<void>
  clearCumulativeRounds: (gameId: string) => Promise<void>
  saveBracketMatch: (match: Omit<BracketMatch, 'id'>) => Promise<void>
  updateBracketMatch: (id: string, data: Partial<BracketMatch>) => Promise<void>
  deleteBracketMatch: (id: string) => Promise<void>

  addUser: (data: Omit<User, 'id'>) => Promise<void>
  updateUser: (id: string, data: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  saveGameParticipants: (gameId: string, teamId: string, names: string[]) => Promise<void>

  refreshEditionResults: (editionId: string) => Promise<void>
  clearEditionResults: (editionId: string) => Promise<void>
  logAudit: (action: string, gameId: string, gameName: string, details?: object) => Promise<void>

  addPenalty: (gameId: string, teamId: string, reason?: string) => Promise<void>
  removePenalty: (gameId: string, teamId: string) => Promise<void>
}

export type { AppState }

export const useStore = create<AppState>((set, get) => ({
  organizations: [],
  clients: [],
  events: [],
  teams: [],
  editions: [],
  games: [],
  standardResults: [],
  pointsResults: [],
  participantResults: [],
  participantAttemptResults: [],
  cumulativeRounds: [],
  bracketMatches: [],
  gameParticipants: [],
  users: [],
  gamePenalties: [],

  loaded: false,

  loadData: async () => {
    const [
      { data: organizations },
      { data: clients },
      { data: events },
      { data: teams },
      { data: editions },
      { data: games },
      { data: standardResults },
      { data: pointsResults },
      { data: participantResults },
      { data: participantAttemptResults },
      { data: cumulativeRounds },
      { data: bracketMatches },
      { data: gameParticipants },
      { data: users },
      { data: gamePenalties },
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('name'),
      supabase.from('clients').select('*'),
      supabase.from('events').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('editions').select('*'),
      supabase.from('games').select('*').order('order'),
      supabase.from('standard_results').select('*'),
      supabase.from('points_results').select('*'),
      supabase.from('participant_results').select('*'),
      supabase.from('participant_attempt_results').select('*'),
      supabase.from('cumulative_rounds').select('*').order('round_number'),
      supabase.from('bracket_matches').select('*'),
      supabase.from('game_participants').select('*').order('sort_order'),
      supabase.from('users').select('*'),
      supabase.from('game_penalties').select('*'),
    ])

    set({
      organizations: (organizations ?? []).map(r => ({ id: r.id, name: r.name, slug: r.slug })),
      clients: (clients ?? []).map(r => ({ id: r.id, organization_id: r.organization_id, name: r.name, slug: r.slug, logo_color: r.logo_color })),
      events: (events ?? []).map(r => ({ id: r.id, client_id: r.client_id, name: r.name, description: r.description })),
      teams: (teams ?? []).map(r => ({ id: r.id, event_id: r.event_id, name: r.name, color: r.color, is_fun: r.is_fun ?? false })),
      editions: (editions ?? []).map(r => ({ id: r.id, event_id: r.event_id, label: r.label, date: r.date, status: r.status, scoring_mode: r.scoring_mode ?? 'dynamic', scoring_system: r.scoring_system ?? undefined, scoring_gap: r.scoring_gap ?? undefined })),
      games: (games ?? []).map(r => ({ id: r.id, edition_id: r.edition_id, name: r.name, type: r.type, scoring_direction: r.scoring_direction, scoring_mode: r.scoring_mode ?? 'dynamic', weight: r.weight, status: r.status, order: r.order, participants_per_team: r.participants_per_team ?? 1, attempts_per_participant: r.attempts_per_participant ?? 1, is_fun: r.is_fun ?? false, started_at: r.started_at ?? undefined })),
      standardResults: (standardResults ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, position: r.position })),
      pointsResults: (pointsResults ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, raw_score: r.raw_score })),
      participantResults: (participantResults ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, position: r.position })),
      participantAttemptResults: (participantAttemptResults ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, attempt_number: r.attempt_number, success: r.success })),
      cumulativeRounds: (cumulativeRounds ?? []).map(r => ({ id: r.id, game_id: r.game_id, round_number: r.round_number, scores: r.scores })),
      bracketMatches: (bracketMatches ?? []).map(r => ({ id: r.id, game_id: r.game_id, round: r.round, match_number: r.match_number, team_a_id: r.team_a_id, team_b_id: r.team_b_id, score_a: r.score_a, score_b: r.score_b, winner_id: r.winner_id, loser_bracket: r.loser_bracket })),
      gameParticipants: (gameParticipants ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, name: r.name, sort_order: r.sort_order })),
      users: (users ?? []).map(r => ({ id: r.id, organization_id: r.organization_id, username: r.username, pin: r.pin, role: r.role, display_name: r.display_name })),
      gamePenalties: (gamePenalties ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, reason: r.reason ?? undefined })),
      loaded: true,
      // Restore session from localStorage if present
      ...(() => {
        try {
          const saved = localStorage.getItem('tt_session')
          if (saved) return JSON.parse(saved)
        } catch {}
        return {}
      })(),
    })
  },

  currentUserId: null,
  currentOrgId: null,
  currentRole: 'guest',

  login: async (username, pin) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('pin', pin)
      .single()
    if (!data) return false
    const session = { currentUserId: data.id, currentOrgId: data.organization_id, currentRole: data.role }
    localStorage.setItem('tt_session', JSON.stringify(session))
    set(session)
    return true
  },

  logout: () => {
    localStorage.removeItem('tt_session')
    set({ currentUserId: null, currentOrgId: null, currentRole: 'guest' })
  },

  currentUser: () => {
    const { currentUserId, users } = get()
    return users.find(u => u.id === currentUserId) ?? null
  },

  addOrganization: async (data) => {
    const { data: row } = await supabase.from('organizations').insert(data).select().single()
    if (row) set(s => ({ organizations: [...s.organizations, { id: row.id, name: row.name, slug: row.slug }] }))
  },

  addClient: async (data) => {
    const { data: row } = await supabase.from('clients').insert(data).select().single()
    if (row) set(s => ({ clients: [...s.clients, { id: row.id, organization_id: row.organization_id, name: row.name, slug: row.slug, logo_color: row.logo_color }] }))
  },

  updateClient: async (id, data) => {
    await supabase.from('clients').update(data).eq('id', id)
    set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }))
  },

  addEvent: async (data) => {
    const { data: row } = await supabase.from('events').insert(data).select().single()
    if (row) set(s => ({ events: [...s.events, { id: row.id, client_id: row.client_id, name: row.name, description: row.description }] }))
  },

  updateEvent: async (id, data) => {
    await supabase.from('events').update(data).eq('id', id)
    set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...data } : e) }))
  },

  addTeam: async (data) => {
    const { data: row } = await supabase.from('teams').insert(data).select().single()
    if (row) set(s => ({ teams: [...s.teams, { id: row.id, event_id: row.event_id, name: row.name, color: row.color, is_fun: row.is_fun ?? false }] }))
  },

  updateTeam: async (id, data) => {
    await supabase.from('teams').update(data).eq('id', id)
    set(s => ({ teams: s.teams.map(t => t.id === id ? { ...t, ...data } : t) }))
  },

  deleteTeam: async (id) => {
    await supabase.from('teams').delete().eq('id', id)
    set(s => ({ teams: s.teams.filter(t => t.id !== id) }))
  },

  addEdition: async (data) => {
    const { data: row } = await supabase.from('editions').insert(data).select().single()
    if (row) set(s => ({ editions: [...s.editions, { id: row.id, event_id: row.event_id, label: row.label, date: row.date, status: row.status, scoring_mode: row.scoring_mode ?? 'dynamic', scoring_system: row.scoring_system ?? undefined, scoring_gap: row.scoring_gap ?? undefined }] }))
  },

  updateEdition: async (id, data) => {
    await supabase.from('editions').update(data).eq('id', id)
    set(s => ({ editions: s.editions.map(e => e.id === id ? { ...e, ...data } : e) }))
  },

  addGame: async (data) => {
    const { data: row, error } = await supabase.from('games').insert(data).select().single()
    if (error) throw new Error(error.message)
    if (row) set(s => ({ games: [...s.games, { id: row.id, edition_id: row.edition_id, name: row.name, type: row.type, scoring_direction: row.scoring_direction, scoring_mode: row.scoring_mode ?? 'dynamic', weight: row.weight, status: row.status, order: row.order, participants_per_team: row.participants_per_team ?? 1, attempts_per_participant: row.attempts_per_participant ?? 1, is_fun: row.is_fun ?? false }] }))
  },

  updateGame: async (id, data) => {
    const { error } = await supabase.from('games').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    set(s => ({ games: s.games.map(g => g.id === id ? { ...g, ...data } : g) }))
  },

  deleteGame: async (id) => {
    await supabase.from('games').delete().eq('id', id)
    set(s => ({ games: s.games.filter(g => g.id !== id) }))
  },

  copyGamesToEdition: async (fromEditionId, toEditionId) => {
    const source = get().games.filter(g => g.edition_id === fromEditionId)
    const existing = get().games.filter(g => g.edition_id === toEditionId)
    const newGames = source
      .filter(g => !existing.some(e => e.name === g.name))
      .map(g => ({ edition_id: toEditionId, name: g.name, type: g.type, scoring_direction: g.scoring_direction, scoring_mode: g.scoring_mode, weight: g.weight, status: 'pending' as const, order: g.order, participants_per_team: g.participants_per_team ?? 1, attempts_per_participant: g.attempts_per_participant ?? 1 }))
    if (newGames.length === 0) return
    const { data: rows } = await supabase.from('games').insert(newGames).select()
    if (rows) set(s => ({ games: [...s.games, ...rows.map(r => ({ id: r.id, edition_id: r.edition_id, name: r.name, type: r.type, scoring_direction: r.scoring_direction, scoring_mode: r.scoring_mode ?? 'dynamic', weight: r.weight, status: r.status, order: r.order, participants_per_team: r.participants_per_team ?? 1, attempts_per_participant: r.attempts_per_participant ?? 1, is_fun: r.is_fun ?? false }))] }))
  },

  saveStandardResults: async (gameId, results) => {
    const rows = results.map(r => ({ game_id: gameId, team_id: r.team_id, position: r.position }))
    const { data, error } = await supabase.from('standard_results').upsert(rows, { onConflict: 'game_id,team_id' }).select()
    if (error) throw new Error(error.message)
    set(s => ({
      standardResults: [
        ...s.standardResults.filter(r => r.game_id !== gameId),
        ...(data ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, position: r.position })),
      ],
    }))
  },

  savePointsResults: async (gameId, results) => {
    const rows = results.map(r => ({ game_id: gameId, team_id: r.team_id, raw_score: r.raw_score }))
    const { data, error } = await supabase.from('points_results').upsert(rows, { onConflict: 'game_id,team_id' }).select()
    if (error) throw new Error(error.message)
    set(s => ({
      pointsResults: [
        ...s.pointsResults.filter(r => r.game_id !== gameId),
        ...(data ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, raw_score: r.raw_score })),
      ],
    }))
  },

  saveParticipantResults: async (gameId, results) => {
    const { error: delErr } = await supabase.from('participant_results').delete().eq('game_id', gameId)
    if (delErr) throw new Error(delErr.message)
    const rows = results.map(r => ({ game_id: gameId, team_id: r.team_id, participant_name: r.participant_name, position: r.position }))
    const { data, error } = await supabase.from('participant_results').insert(rows).select()
    if (error) throw new Error(error.message)
    set(s => ({
      participantResults: [
        ...s.participantResults.filter(r => r.game_id !== gameId),
        ...(data ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, position: r.position })),
      ],
    }))
  },

  saveParticipantAttemptResults: async (gameId, results) => {
    const { error: delErr } = await supabase.from('participant_attempt_results').delete().eq('game_id', gameId)
    if (delErr) throw new Error(delErr.message)
    if (results.length === 0) return
    const { data, error } = await supabase.from('participant_attempt_results').insert(results).select()
    if (error) throw new Error(error.message)
    set(s => ({
      participantAttemptResults: [
        ...s.participantAttemptResults.filter(r => r.game_id !== gameId),
        ...(data ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, attempt_number: r.attempt_number, success: r.success })),
      ],
    }))
  },

  addCumulativeRound: async (gameId, scores) => {
    const existing = get().cumulativeRounds.filter(r => r.game_id === gameId)
    const roundNumber = existing.length + 1
    const { data: row, error } = await supabase.from('cumulative_rounds').insert({ game_id: gameId, round_number: roundNumber, scores }).select().single()
    if (error) throw new Error(error.message)
    if (row) set(s => ({ cumulativeRounds: [...s.cumulativeRounds, { id: row.id, game_id: row.game_id, round_number: row.round_number, scores: row.scores }] }))
  },

  clearCumulativeRounds: async (gameId) => {
    await supabase.from('cumulative_rounds').delete().eq('game_id', gameId)
    set(s => ({ cumulativeRounds: s.cumulativeRounds.filter(r => r.game_id !== gameId) }))
  },

  saveBracketMatch: async (match) => {
    const { data: row } = await supabase.from('bracket_matches').insert(match).select().single()
    if (row) set(s => ({ bracketMatches: [...s.bracketMatches, { id: row.id, game_id: row.game_id, round: row.round, match_number: row.match_number, team_a_id: row.team_a_id, team_b_id: row.team_b_id, score_a: row.score_a, score_b: row.score_b, winner_id: row.winner_id, loser_bracket: row.loser_bracket }] }))
  },

  updateBracketMatch: async (id, data) => {
    await supabase.from('bracket_matches').update(data).eq('id', id)
    set(s => ({ bracketMatches: s.bracketMatches.map(m => m.id === id ? { ...m, ...data } : m) }))
  },

  deleteBracketMatch: async (id) => {
    await supabase.from('bracket_matches').delete().eq('id', id)
    set(s => ({ bracketMatches: s.bracketMatches.filter(m => m.id !== id) }))
  },

  addUser: async (data) => {
    const { data: row } = await supabase.from('users').insert(data).select().single()
    if (row) set(s => ({ users: [...s.users, { id: row.id, organization_id: row.organization_id, username: row.username, pin: row.pin, role: row.role, display_name: row.display_name }] }))
  },

  updateUser: async (id, data) => {
    await supabase.from('users').update(data).eq('id', id)
    set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u) }))
  },

  deleteUser: async (id) => {
    await supabase.from('users').delete().eq('id', id)
    set(s => ({ users: s.users.filter(u => u.id !== id) }))
  },

  saveGameParticipants: async (gameId, teamId, names) => {
    const { error: delErr } = await supabase.from('game_participants').delete().eq('game_id', gameId).eq('team_id', teamId)
    if (delErr) throw new Error(delErr.message)
    set(s => ({ gameParticipants: s.gameParticipants.filter(p => !(p.game_id === gameId && p.team_id === teamId)) }))
    if (!names.length) return
    const rows = names.map((name, i) => ({ game_id: gameId, team_id: teamId, name, sort_order: i + 1 }))
    const { data, error: insErr } = await supabase.from('game_participants').insert(rows).select()
    if (insErr) throw new Error(insErr.message)
    if (data) set(s => ({ gameParticipants: [...s.gameParticipants, ...data.map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, name: r.name, sort_order: r.sort_order }))] }))
  },

  refreshEditionResults: async (editionId) => {
    // Fetch games by edition first — deriving gameIds from the local store
    // would make newly-created games invisible to every subsequent refresh.
    const { data: gm } = await supabase
      .from('games').select('*').eq('edition_id', editionId).order('order')
    const gameIds = (gm ?? []).map(g => g.id)
    // Games this edition used to have, so removed games get cleared from the store.
    const staleIds = get().games.filter(g => g.edition_id === editionId).map(g => g.id)
    const allIds = Array.from(new Set([...gameIds, ...staleIds]))

    if (allIds.length === 0) {
      set(s => ({ games: s.games.filter(g => g.edition_id !== editionId) }))
      return
    }

    const [
      { data: sr },
      { data: pr },
      { data: part },
      { data: par },
      { data: cr },
      { data: bm },
      { data: gp },
    ] = await Promise.all([
      supabase.from('standard_results').select('*').in('game_id', gameIds),
      supabase.from('points_results').select('*').in('game_id', gameIds),
      supabase.from('participant_results').select('*').in('game_id', gameIds),
      supabase.from('participant_attempt_results').select('*').in('game_id', gameIds),
      supabase.from('cumulative_rounds').select('*').in('game_id', gameIds).order('round_number'),
      supabase.from('bracket_matches').select('*').in('game_id', gameIds),
      supabase.from('game_participants').select('*').in('game_id', gameIds).order('sort_order'),
    ])
    set(s => ({
      standardResults: [
        ...s.standardResults.filter(r => !allIds.includes(r.game_id)),
        ...(sr ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, position: r.position })),
      ],
      pointsResults: [
        ...s.pointsResults.filter(r => !allIds.includes(r.game_id)),
        ...(pr ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, raw_score: r.raw_score })),
      ],
      participantResults: [
        ...s.participantResults.filter(r => !allIds.includes(r.game_id)),
        ...(part ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, position: r.position })),
      ],
      participantAttemptResults: [
        ...s.participantAttemptResults.filter(r => !allIds.includes(r.game_id)),
        ...(par ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, participant_name: r.participant_name, attempt_number: r.attempt_number, success: r.success })),
      ],
      cumulativeRounds: [
        ...s.cumulativeRounds.filter(r => !allIds.includes(r.game_id)),
        ...(cr ?? []).map(r => ({ id: r.id, game_id: r.game_id, round_number: r.round_number, scores: r.scores })),
      ],
      bracketMatches: [
        ...s.bracketMatches.filter(r => !allIds.includes(r.game_id)),
        ...(bm ?? []).map(r => ({ id: r.id, game_id: r.game_id, round: r.round, match_number: r.match_number, team_a_id: r.team_a_id, team_b_id: r.team_b_id, score_a: r.score_a, score_b: r.score_b, winner_id: r.winner_id, loser_bracket: r.loser_bracket })),
      ],
      gameParticipants: [
        ...s.gameParticipants.filter(r => !allIds.includes(r.game_id)),
        ...(gp ?? []).map(r => ({ id: r.id, game_id: r.game_id, team_id: r.team_id, name: r.name, sort_order: r.sort_order })),
      ],
      games: [
        ...s.games.filter(g => g.edition_id !== editionId),
        ...(gm ?? []).map(r => ({ id: r.id, edition_id: r.edition_id, name: r.name, type: r.type, scoring_direction: r.scoring_direction, scoring_mode: r.scoring_mode ?? 'dynamic', weight: r.weight, status: r.status, order: r.order, participants_per_team: r.participants_per_team ?? 1, attempts_per_participant: r.attempts_per_participant ?? 1, is_fun: r.is_fun ?? false })),
      ],
    }))
  },

  clearEditionResults: async (editionId) => {
    const gameIds = get().games
      .filter(g => g.edition_id === editionId)
      .map(g => g.id)
    if (gameIds.length === 0) return

    await Promise.all([
      supabase.from('standard_results').delete().in('game_id', gameIds),
      supabase.from('points_results').delete().in('game_id', gameIds),
      supabase.from('participant_results').delete().in('game_id', gameIds),
      supabase.from('participant_attempt_results').delete().in('game_id', gameIds),
      supabase.from('cumulative_rounds').delete().in('game_id', gameIds),
      supabase.from('bracket_matches').delete().in('game_id', gameIds),
      supabase.from('games').update({ status: 'pending' }).in('id', gameIds),
    ])

    set(s => ({
      standardResults: s.standardResults.filter(r => !gameIds.includes(r.game_id)),
      pointsResults: s.pointsResults.filter(r => !gameIds.includes(r.game_id)),
      participantResults: s.participantResults.filter(r => !gameIds.includes(r.game_id)),
      participantAttemptResults: s.participantAttemptResults.filter(r => !gameIds.includes(r.game_id)),
      cumulativeRounds: s.cumulativeRounds.filter(r => !gameIds.includes(r.game_id)),
      bracketMatches: s.bracketMatches.filter(m => !gameIds.includes(m.game_id)),
      games: s.games.map(g => gameIds.includes(g.id) ? { ...g, status: 'pending' as const } : g),
    }))
  },

  logAudit: async (action, gameId, gameName, details) => {
    const { currentUserId, users } = get()
    const user = users.find(u => u.id === currentUserId)
    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      display_name: user?.display_name ?? 'Unknown',
      action,
      game_id: gameId,
      game_name: gameName,
      details: details ?? null,
    })
  },

  addPenalty: async (gameId, teamId, reason) => {
    const { data } = await supabase.from('game_penalties')
      .upsert({ game_id: gameId, team_id: teamId, reason: reason ?? null }, { onConflict: 'game_id,team_id' })
      .select().single()
    if (data) set(s => ({
      gamePenalties: [...s.gamePenalties.filter(p => !(p.game_id === gameId && p.team_id === teamId)),
        { id: data.id, game_id: data.game_id, team_id: data.team_id, reason: data.reason ?? undefined }]
    }))
  },

  removePenalty: async (gameId, teamId) => {
    await supabase.from('game_penalties').delete().eq('game_id', gameId).eq('team_id', teamId)
    set(s => ({ gamePenalties: s.gamePenalties.filter(p => !(p.game_id === gameId && p.team_id === teamId)) }))
  },
}))
