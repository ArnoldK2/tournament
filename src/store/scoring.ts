import type {
  Game, Team, LeaderboardEntry, Edition,
  StandardResult, PointsResult, ParticipantResult,
  ParticipantAttemptResult, CumulativeRound, BracketMatch,
  ScoringSystem, GamePenalty,
} from '../types'

// F1 points for positions 1–10; beyond 10 gets 1pt
const F1_BASE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

export function basePointsForRank(rank: number, total: number, system: ScoringSystem, gap: number): number {
  if (system === 'f1') return F1_BASE[rank - 1] ?? 1
  if (system === 'degressive') return Math.max(1, total - rank + 1)
  // classic: top place = gap * (n-1) + 1, each step down loses `gap`
  return Math.max(1, (total - rank) * gap + 1)
}

interface ScoringData {
  games: Game[]
  teams: Team[]
  edition?: Edition
  standardResults: StandardResult[]
  pointsResults: PointsResult[]
  participantResults: ParticipantResult[]
  participantAttemptResults: ParticipantAttemptResult[]
  cumulativeRounds: CumulativeRound[]
  bracketMatches: BracketMatch[]
  gamePenalties?: GamePenalty[]
}

function rankPoints(rank: number, total: number, weight: number, fixed: boolean, system: ScoringSystem, gap: number) {
  const base = basePointsForRank(rank, total, system, gap)
  return fixed ? base : base * weight
}

type RP = { system: ScoringSystem; gap: number }

function computeStandard(game: Game, teams: Team[], results: StandardResult[], fixed: boolean, rp: RP): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  const n = teams.length
  for (const r of gameResults) out.set(r.team_id, rankPoints(r.position, n, game.weight, fixed, rp.system, rp.gap))
  return out
}

function computePoints(game: Game, teams: Team[], results: PointsResult[], fixed: boolean, rp: RP): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  if (!gameResults.length) return out

  if (!fixed) {
    for (const r of gameResults) out.set(r.team_id, r.raw_score * game.weight)
    return out
  }

  const sorted = [...gameResults].sort((a, b) =>
    game.scoring_direction === 'higher_is_better' ? b.raw_score - a.raw_score : a.raw_score - b.raw_score
  )
  const n = teams.length
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].raw_score !== sorted[i - 1].raw_score) rank = i + 1
    out.set(sorted[i].team_id, rankPoints(rank, n, game.weight, true, rp.system, rp.gap))
  }
  return out
}

function computeMultiParticipant(game: Game, teams: Team[], results: ParticipantResult[], fixed: boolean, rp: RP): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  const N = gameResults.length
  const teamTotals = new Map<string, number>()
  for (const r of gameResults) {
    const contribution = game.scoring_direction === 'lower_is_better' ? N - r.position + 1 : r.position
    teamTotals.set(r.team_id, (teamTotals.get(r.team_id) ?? 0) + contribution)
  }
  const sorted = [...teamTotals.entries()].sort((a, b) => b[1] - a[1])
  const n = teams.length
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i][1] !== sorted[i - 1][1]) rank = i + 1
    out.set(sorted[i][0], rankPoints(rank, n, game.weight, fixed, rp.system, rp.gap))
  }
  return out
}

function computeParticipantAttempts(game: Game, teams: Team[], results: ParticipantAttemptResult[], fixed: boolean, rp: RP): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  if (!gameResults.length) return out
  const teamSuccesses = new Map<string, number>()
  for (const r of gameResults) {
    if (r.success) teamSuccesses.set(r.team_id, (teamSuccesses.get(r.team_id) ?? 0) + 1)
  }
  const sorted = [...teamSuccesses.entries()].sort((a, b) => b[1] - a[1])
  const n = teams.length
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i][1] !== sorted[i - 1][1]) rank = i + 1
    out.set(sorted[i][0], rankPoints(rank, n, game.weight, fixed, rp.system, rp.gap))
  }
  return out
}

function computeCumulative(game: Game, teams: Team[], rounds: CumulativeRound[], fixed: boolean, rp: RP): Map<string, number> {
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
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i][1] !== sorted[i - 1][1]) rank = i + 1
    out.set(sorted[i][0], rankPoints(rank, n, game.weight, fixed, rp.system, rp.gap))
  }
  return out
}

function computeLives(game: Game, teams: Team[], results: PointsResult[], rp: RP): Map<string, number> {
  const out = new Map<string, number>()
  const gameResults = results.filter(r => r.game_id === game.id)
  if (!gameResults.length) return out
  const n = teams.length
  const surviving = [...gameResults.filter(r => r.raw_score > 0)]
    .sort((a, b) => b.raw_score - a.raw_score)
  const eliminated = gameResults.filter(r => r.raw_score === 0)
  let denseRank = 0
  for (let i = 0; i < surviving.length; i++) {
    if (i === 0 || surviving[i].raw_score !== surviving[i - 1].raw_score) denseRank++
    out.set(surviving[i].team_id, rankPoints(denseRank, n, game.weight, false, rp.system, rp.gap))
  }
  for (const r of eliminated) {
    out.set(r.team_id, rankPoints(n, n, game.weight, false, rp.system, rp.gap))
  }
  return out
}

function computeCompletion(game: Game, results: PointsResult[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of results.filter(r => r.game_id === game.id)) out.set(r.team_id, r.raw_score)
  return out
}

function computeMatchPlay(game: Game, matches: BracketMatch[]): Map<string, number> {
  const out = new Map<string, number>()
  const gameMatches = matches.filter(m => m.game_id === game.id)
  for (const m of gameMatches) {
    if (!m.winner_id || (!m.team_a_id && !m.team_b_id)) continue
    const winPts = m.score_a ?? 3
    const lossPts = m.score_b ?? 1
    const loserId = m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id
    out.set(m.winner_id, (out.get(m.winner_id) ?? 0) + winPts)
    if (loserId) out.set(loserId, (out.get(loserId) ?? 0) + lossPts)
  }
  return out
}

function computeBracket(game: Game, teams: Team[], matches: BracketMatch[], fixed: boolean, rp: RP): Map<string, number> {
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
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    const score = wins.get(sorted[i].id) ?? 0
    const prevScore = i > 0 ? (wins.get(sorted[i - 1].id) ?? 0) : score
    if (i > 0 && score !== prevScore) rank = i + 1
    out.set(sorted[i].id, rankPoints(rank, n, game.weight, fixed, rp.system, rp.gap))
  }
  return out
}

export function computeLeaderboard(data: ScoringData): LeaderboardEntry[] {
  const { games } = data
  const teams = data.teams.filter(t => !t.is_fun)
  const scorableGames = games.filter(g => g.status !== 'pending' && !g.is_fun)
  const teamScores = new Map<string, { game_id: string; game_name: string; score: number; game_rank: number; base_score?: number; bonus_score?: number; penalized?: boolean; penalty_reason?: string; weight?: number }[]>()
  for (const team of teams) teamScores.set(team.id, [])

  const rp: RP = {
    system: data.edition?.scoring_system ?? 'classic',
    gap: data.edition?.scoring_gap ?? 5,
  }

  for (const game of scorableGames) {
    const fixed = game.scoring_mode === 'fixed'
    let gameMap: Map<string, number>
    let bonusMap: Map<string, number> | undefined
    switch (game.type) {
      case 'standard':              gameMap = computeStandard(game, teams, data.standardResults, fixed, rp); break
      case 'points':                gameMap = computePoints(game, teams, data.pointsResults, fixed, rp); break
      case 'multi_participant':     gameMap = computeMultiParticipant(game, teams, data.participantResults, fixed, rp); break
      case 'tape': {
        gameMap = computeMultiParticipant(game, teams, data.participantResults, fixed, rp)
        const bonusPer = game.participants_per_team ?? 0
        if (bonusPer > 0) {
          bonusMap = new Map<string, number>()
          const counts = new Map<string, number>()
          for (const r of data.participantResults.filter(r => r.game_id === game.id))
            counts.set(r.team_id, (counts.get(r.team_id) ?? 0) + 1)
          for (const [teamId, count] of counts) {
            const b = count * bonusPer
            bonusMap.set(teamId, b)
            gameMap.set(teamId, (gameMap.get(teamId) ?? 0) + b)
          }
        }
        break
      }
      case 'participant_attempts':  gameMap = computeParticipantAttempts(game, teams, data.participantAttemptResults, fixed, rp); break
      case 'cumulative':            gameMap = computeCumulative(game, teams, data.cumulativeRounds, fixed, rp); break
      case 'tally':                 gameMap = computeCumulative(game, teams, data.cumulativeRounds, fixed, rp); break
      case 'lives':                 gameMap = computeLives(game, teams, data.pointsResults, rp); break
      case 'head_to_head': {
        const hthRounds = data.cumulativeRounds.filter(r => r.game_id === game.id)
        console.log(`[scoring] head_to_head "${game.name}": ${hthRounds.length} cumulative rounds, first:`, hthRounds[0])
        gameMap = computeCumulative(game, teams, data.cumulativeRounds, fixed, rp)
        console.log(`[scoring] head_to_head "${game.name}": gameMap size=${gameMap.size}`, Object.fromEntries(gameMap))
        break
      }
      case 'completion':            gameMap = computeCompletion(game, data.pointsResults); break
      case 'match_play':            gameMap = computeMatchPlay(game, data.bracketMatches); break
      default:                      gameMap = computeBracket(game, teams, data.bracketMatches, fixed, rp); break
    }
    // Compute per-game rank (ties share the same rank)
    const sorted = [...teams].sort((a, b) => (gameMap.get(b.id) ?? 0) - (gameMap.get(a.id) ?? 0))
    const gameRankMap = new Map<string, number>()
    let gr = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && (gameMap.get(sorted[i].id) ?? 0) !== (gameMap.get(sorted[i - 1].id) ?? 0)) gr = i + 1
      gameRankMap.set(sorted[i].id, gr)
    }
    const hasResults = gameMap.size > 0
    const gamePenaltyMap = new Map((data.gamePenalties ?? []).filter(p => p.game_id === game.id).map(p => [p.team_id, p.reason]))
    for (const team of teams) {
      const penalized = gamePenaltyMap.has(team.id)
      const raw = gameMap.get(team.id) ?? 0
      const score = penalized ? 1 : (hasResults ? Math.max(1, raw) : 0)
      const bonus_score = penalized ? undefined : bonusMap?.get(team.id)
      const base_score = bonus_score !== undefined ? score - bonus_score : undefined
      teamScores.get(team.id)!.push({
        game_id: game.id, game_name: game.name, score,
        game_rank: gameRankMap.get(team.id) ?? 0,
        base_score, bonus_score,
        penalized: penalized || undefined,
        penalty_reason: penalized ? (gamePenaltyMap.get(team.id) ?? undefined) : undefined,
        weight: game.weight !== 1 ? game.weight : undefined,
      })
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
  let rank = 1
  let denseRank = 0
  return entries.map((e, i, arr) => {
    if (i === 0 || e.total_score !== arr[i - 1].total_score) { denseRank++; rank = denseRank }
    return { ...e, rank }
  })
}
