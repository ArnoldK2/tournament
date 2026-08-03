import type {
  Client, TournamentEvent, Team, Edition, Game,
  StandardResult, PointsResult, ParticipantResult,
  CumulativeRound, BracketMatch, User,
} from '../types'

export const USERS: User[] = [
  { id: 'u0', client_id: null, username: '0785805056', pin: '0701418644', role: 'super_admin', display_name: 'Super Admin' },
  { id: 'u1', client_id: 'c1', username: 'nabbingo_admin', pin: '1234', role: 'client_admin', display_name: 'Nabbingo Admin' },
  { id: 'u2', client_id: 'c1', username: 'nabbingo_dc', pin: '0000', role: 'data_collector', display_name: 'Nabbingo Collector' },
  { id: 'u3', client_id: 'c2', username: 'waga_admin', pin: '4321', role: 'client_admin', display_name: 'Waga Admin' },
  { id: 'u4', client_id: 'c2', username: 'waga_dc', pin: '1111', role: 'data_collector', display_name: 'Waga Collector' },
]

export const CLIENTS: Client[] = [
  { id: 'c1', name: 'Nabbingo Old Girls Association', slug: 'nabbingo', logo_color: '#a855f7' },
  { id: 'c2', name: 'Waga Staff', slug: 'waga', logo_color: '#f97316' },
]

export const EVENTS: TournamentEvent[] = [
  { id: 'e1', client_id: 'c1', name: 'Sports Gala', description: 'Annual inter-house sports competition' },
  { id: 'e2', client_id: 'c2', name: 'Waga Olympics', description: 'Staff fun games day' },
]

// Teams now belong to the CLIENT
export const TEAMS: Team[] = [
  { id: 't1', client_id: 'c1', name: 'House Nile',     color: '#06b6d4' },
  { id: 't2', client_id: 'c1', name: 'House Kagera',   color: '#f97316' },
  { id: 't3', client_id: 'c1', name: 'House Victoria', color: '#a855f7' },
  { id: 't4', client_id: 'c1', name: 'House Kyoga',    color: '#22c55e' },
  { id: 't5', client_id: 'c2', name: 'Team Alpha',     color: '#ef4444' },
  { id: 't6', client_id: 'c2', name: 'Team Bravo',     color: '#eab308' },
  { id: 't7', client_id: 'c2', name: 'Team Charlie',   color: '#3b82f6' },
]

export const EDITIONS: Edition[] = [
  { id: 'ed1', event_id: 'e1', label: '2024', date: '2024-08-10', status: 'completed' },
  { id: 'ed2', event_id: 'e1', label: '2025', date: '2025-08-02', status: 'active' },
  { id: 'ed3', event_id: 'e2', label: '2025', date: '2025-07-20', status: 'active' },
]

export const GAMES: Game[] = [
  { id: 'g1', edition_id: 'ed2', name: '100m Sprint',         type: 'multi_participant',   scoring_direction: 'lower_is_better',  weight: 1,   status: 'completed', order: 1 },
  { id: 'g2', edition_id: 'ed2', name: 'Tug of War',          type: 'standard',            scoring_direction: 'lower_is_better',  weight: 1,   status: 'completed', order: 2 },
  { id: 'g3', edition_id: 'ed2', name: 'General Knowledge',   type: 'cumulative',          scoring_direction: 'higher_is_better', weight: 1.5, status: 'active',    order: 3 },
  { id: 'g4', edition_id: 'ed2', name: 'Football',            type: 'bracket_round_robin', scoring_direction: 'higher_is_better', weight: 2,   status: 'pending',   order: 4 },
  { id: 'g5', edition_id: 'ed3', name: 'Sack Race',           type: 'standard',            scoring_direction: 'lower_is_better',  weight: 1,   status: 'completed', order: 1 },
  { id: 'g6', edition_id: 'ed3', name: 'Trivia',              type: 'points',              scoring_direction: 'higher_is_better', weight: 1,   status: 'completed', order: 2 },
  { id: 'g7', edition_id: 'ed3', name: 'Table Tennis',        type: 'bracket_single',      scoring_direction: 'higher_is_better', weight: 1.5, status: 'active',    order: 3 },
]

export const STANDARD_RESULTS: StandardResult[] = [
  { id: 'sr1', game_id: 'g2', team_id: 't3', position: 1 },
  { id: 'sr2', game_id: 'g2', team_id: 't1', position: 2 },
  { id: 'sr3', game_id: 'g2', team_id: 't4', position: 3 },
  { id: 'sr4', game_id: 'g2', team_id: 't2', position: 4 },
  { id: 'sr5', game_id: 'g5', team_id: 't6', position: 1 },
  { id: 'sr6', game_id: 'g5', team_id: 't5', position: 2 },
  { id: 'sr7', game_id: 'g5', team_id: 't7', position: 3 },
]

export const POINTS_RESULTS: PointsResult[] = [
  { id: 'pr1', game_id: 'g6', team_id: 't5', raw_score: 88 },
  { id: 'pr2', game_id: 'g6', team_id: 't6', raw_score: 72 },
  { id: 'pr3', game_id: 'g6', team_id: 't7', raw_score: 95 },
]

export const PARTICIPANT_RESULTS: ParticipantResult[] = [
  { id: 'part1', game_id: 'g1', team_id: 't1', participant_name: 'Alice',  position: 2 },
  { id: 'part2', game_id: 'g1', team_id: 't1', participant_name: 'Betty',  position: 5 },
  { id: 'part3', game_id: 'g1', team_id: 't2', participant_name: 'Carol',  position: 1 },
  { id: 'part4', game_id: 'g1', team_id: 't2', participant_name: 'Diana',  position: 7 },
  { id: 'part5', game_id: 'g1', team_id: 't3', participant_name: 'Eve',    position: 3 },
  { id: 'part6', game_id: 'g1', team_id: 't3', participant_name: 'Faith',  position: 6 },
  { id: 'part7', game_id: 'g1', team_id: 't4', participant_name: 'Grace',  position: 4 },
  { id: 'part8', game_id: 'g1', team_id: 't4', participant_name: 'Hannah', position: 8 },
]

export const CUMULATIVE_ROUNDS: CumulativeRound[] = [
  { id: 'cr1', game_id: 'g3', round_number: 1, scores: [
    { team_id: 't1', score: 18 }, { team_id: 't2', score: 12 },
    { team_id: 't3', score: 20 }, { team_id: 't4', score: 15 },
  ]},
  { id: 'cr2', game_id: 'g3', round_number: 2, scores: [
    { team_id: 't1', score: 16 }, { team_id: 't2', score: 19 },
    { team_id: 't3', score: 14 }, { team_id: 't4', score: 17 },
  ]},
]

export const BRACKET_MATCHES: BracketMatch[] = [
  { id: 'bm1', game_id: 'g7', round: 1, match_number: 1, team_a_id: 't5', team_b_id: 't6', score_a: 11, score_b: 7,    winner_id: 't5', loser_bracket: false },
  { id: 'bm2', game_id: 'g7', round: 1, match_number: 2, team_a_id: 't7', team_b_id: null, score_a: null, score_b: null, winner_id: 't7', loser_bracket: false },
  { id: 'bm3', game_id: 'g7', round: 2, match_number: 1, team_a_id: 't5', team_b_id: 't7', score_a: null, score_b: null, winner_id: null, loser_bracket: false },
]
