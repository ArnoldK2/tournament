import type {
  Game, Team, LeaderboardEntry,
  StandardResult, PointsResult, ParticipantResult,
  ParticipantAttemptResult, CumulativeRound, BracketMatch,
} from '../types'

interface ScoringData {
  games: Game[]
  teams: Team[]
  scoringMode?: 'dynamic' | 'fixed'
  standardResults: StandardResult[]
  pointsResults: PointsResult[]
  participantResults: ParticipantResult[]
  participantAttemptResults: ParticipantAttemptResult[]
  cumulativeRounds: CumulativeRound[]
  bracketMatches: BracketMatch[]
}

function rankPoints(rank: number, total: number, weight: number, fixed = false) {
  const base = Math.max(0, total - rank + 1)
  return fixed ? base : base * weight
}

function computeStandard(game: Game, teams: Team[], results: StandardResult[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  const n = teams.length
  for (const r of gameResults) out.set(r.team_id, rankPoints(r.position, n, game.weight, fixed))
  return out
}

function computePoints(game: Game, teams: Team[], results: PointsResult[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  if (!gameResults.length) return out

  if (!fixed) {
    // Dynamic: raw score is taken as fact, multiplied by weight
    for (const r of gameResults) out.set(r.team_id, r.raw_score * game.weight)
    return out
  }

  // Fixed mode: rank by score, assign fixed points (winner=n, last=1)
  const sorted = [...gameResults].sort((a, b) =>
    game.scoring_direction === 'higher_is_better' ? b.raw_score - a.raw_score : a.raw_score - b.raw_score
  )
  const n = teams.length
  sorted.forEach(r => {
    const rankIndex = sorted.reduce((last, x, i) => x.raw_score === r.raw_score ? i : last, 0)
    out.set(r.team_id, rankPoints(rankIndex + 1, n, game.weight, true))
  })
  return out
}

function computeMultiParticipant(game: Game, teams: Team[], results: ParticipantResult[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  const teamTotals = new Map<string, number>()
  for (const r of gameResults) teamTotals.set(r.team_id, (teamTotals.get(r.team_id) ?? 0) + r.position)
  const sorted = [...teamTotals.entries()].sort((a, b) =>
    game.scoring_direction === 'lower_is_better' ? a[1] - b[1] : b[1] - a[1]
  )
  const n = teams.length
  sorted.forEach(([teamId], i) => out.set(teamId, rankPoints(i + 1, n, game.weight, fixed)))
  return out
}

function computeParticipantAttempts(game: Game, teams: Team[], results: ParticipantAttemptResult[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  if (!gameResults.length) return out
  const teamSuccesses = new Map<string, number>()
  for (const r of gameResults) {
    if (r.success) teamSuccesses.set(r.team_id, (teamSuccesses.get(r.team_id) ?? 0) + 1)
  }
  const sorted = [...teamSuccesses.entries()].sort((a, b) => b[1] - a[1])
  const n = teams.length
  sorted.forEach(([teamId], i) => out.set(teamId, rankPoints(i + 1, n, game.weight, fixed)))
  return out
}

function computeCumulative(game: Game, teams: Team[], rounds: CumulativeRound[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameRounds = rounds.filter(r => r.game_id === game.id)
  const totals = new Map<string, number>()
  for (const round of gameRounds)
    for (const s of round.scores)
      totals.set(s.team_id, (totals.get(s.team_id) ?? 0) + s.score)
  const sorted = [...totals.entries()].sort((a, b) =>
    game.scoring_direction === 'higher_is_better' ? b[1] - a[1] : a[1] - b[1]
  )
  const n = teams.length
  sorted.forEach(([teamId], i) => out.set(teamId, rankPoints(i + 1, n, game.weight, fixed)))
  return out
}

function computeBracket(game: Game, teams: Team[], matches: BracketMatch[], fixed: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const gameMatches = matches.filter(m => m.game_id === game.id)
  if (!gameMatches.length) return out
  const wins = new Map<string, number>()
  for (const m of gameMatches) {
    if (!m.winner_id) continue
    wins.set(m.winner_id, (wins.get(m.winner_id) ?? 0) + 1)
  }
  const participating = teams.filter(t => gameMatches.some(m => m.team_a_id === t.id || m.team_b_id === t.id))
  const sorted = [...participating].sort((a, b) => (wins.get(b.id) ?? 0) - (wins.get(a.id) ?? 0))
  const n = participating.length
  sorted.forEach((team, i) => out.set(team.id, rankPoints(i + 1, n, game.weight, fixed)))
  return out
}

export function computeLeaderboard(data: ScoringData): LeaderboardEntry[] {
  const { games, teams } = data
  const fixed = data.scoringMode === 'fixed'
  const scorableGames = games.filter(g => g.status !== 'pending')
  const teamScores = new Map<string, { game_id: string; game_name: string; score: number }[]>()
  for (const team of teams) teamScores.set(team.id, [])

  for (const game of scorableGames) {
    let gameMap: Map<string, number>
    switch (game.type) {
      case 'standard':              gameMap = computeStandard(game, teams, data.standardResults, fixed); break
      case 'points':                gameMap = computePoints(game, teams, data.pointsResults, fixed); break
      case 'multi_participant':     gameMap = computeMultiParticipant(game, teams, data.participantResults, fixed); break
      case 'participant_attempts':  gameMap = computeParticipantAttempts(game, teams, data.participantAttemptResults, fixed); break
      case 'cumulative':            gameMap = computeCumulative(game, teams, data.cumulativeRounds, fixed); break
      default:                      gameMap = computeBracket(game, teams, data.bracketMatches, fixed); break
    }
    for (const team of teams) {
      const score = gameMap.get(team.id) ?? 0
      teamScores.get(team.id)!.push({ game_id: game.id, game_name: game.name, score })
    }
  }

  const entries = teams.map(team => ({
    team_id: team.id,
    team_name: team.name,
    team_color: team.color,
    total_score: teamScores.get(team.id)!.reduce((s, g) => s + g.score, 0),
    game_scores: teamScores.get(team.id)!,
  }))

  entries.sort((a, b) => b.total_score - a.total_score || a.team_name.localeCompare(b.team_name))
  return entries.map((e, i) => ({ ...e, rank: i + 1 }))
}
