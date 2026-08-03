export type UserRole = 'super_admin' | 'client_admin' | 'data_collector'

export interface User {
  id: string
  client_id: string | null
  username: string
  pin: string
  role: UserRole
  display_name: string
}

export interface Client {
  id: string
  name: string
  slug: string
  logo_color: string
}

export interface TournamentEvent {
  id: string
  client_id: string
  name: string
  description: string
}

// Teams belong to the CLIENT, shared across all their events/editions
export interface Team {
  id: string
  client_id: string
  name: string
  color: string
}

export interface Edition {
  id: string
  event_id: string
  label: string
  date: string
  status: 'upcoming' | 'active' | 'completed'
}

export type GameType =
  | 'standard'
  | 'points'
  | 'multi_participant'
  | 'cumulative'
  | 'bracket_single'
  | 'bracket_double'
  | 'bracket_round_robin'

export type ScoringDirection = 'lower_is_better' | 'higher_is_better'

export interface Game {
  id: string
  edition_id: string
  name: string
  type: GameType
  scoring_direction: ScoringDirection
  weight: number
  status: 'pending' | 'active' | 'completed'
  order: number
}

export interface StandardResult {
  id: string
  game_id: string
  team_id: string
  position: number
}

export interface PointsResult {
  id: string
  game_id: string
  team_id: string
  raw_score: number
}

export interface ParticipantResult {
  id: string
  game_id: string
  team_id: string
  participant_name: string
  position: number
}

export interface CumulativeRound {
  id: string
  game_id: string
  round_number: number
  scores: { team_id: string; score: number }[]
}

export interface BracketMatch {
  id: string
  game_id: string
  round: number
  match_number: number
  team_a_id: string | null
  team_b_id: string | null
  score_a: number | null
  score_b: number | null
  winner_id: string | null
  loser_bracket: boolean
}

export interface LeaderboardEntry {
  team_id: string
  team_name: string
  team_color: string
  total_score: number
  rank: number
  prev_rank?: number
  game_scores: { game_id: string; game_name: string; score: number }[]
}
