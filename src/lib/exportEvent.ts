import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { computeLeaderboard } from '../store/scoring'
import type {
  Client, TournamentEvent, Edition, Team, Game,
  StandardResult, PointsResult, ParticipantResult, ParticipantAttemptResult,
  CumulativeRound, BracketMatch, AudienceRegistration, Feedback,
  LeaderboardEntry, GameParticipant, GamePenalty,
} from '../types'

interface ExportData {
  client: Client
  event: TournamentEvent
  edition: Edition
  teams: Team[]
  games: Game[]
  standardResults: StandardResult[]
  pointsResults: PointsResult[]
  participantResults: ParticipantResult[]
  participantAttemptResults: ParticipantAttemptResult[]
  cumulativeRounds: CumulativeRound[]
  bracketMatches: BracketMatch[]
  gameParticipants: GameParticipant[]
  leaderboard: LeaderboardEntry[]
  registrations: AudienceRegistration[]
  feedback: Feedback[]
}

async function fetchExportData(
  client: Client, event: TournamentEvent, edition: Edition,
  teams: Team[], games: Game[],
  standardResults: StandardResult[], pointsResults: PointsResult[],
  participantResults: ParticipantResult[], participantAttemptResults: ParticipantAttemptResult[],
  cumulativeRounds: CumulativeRound[], bracketMatches: BracketMatch[],
  gamePenalties: GamePenalty[],
): Promise<ExportData> {
  const leaderboard = computeLeaderboard({
    games, teams, edition,
    standardResults, pointsResults,
    participantResults, participantAttemptResults, cumulativeRounds, bracketMatches,
    gamePenalties,
  })

  const gameIds = games.map(g => g.id)
  const [{ data: regs }, { data: fb }, { data: gp }] = await Promise.all([
    supabase.from('audience_registrations').select('*').eq('edition_id', edition.id).order('created_at'),
    supabase.from('feedback').select('*').eq('edition_id', edition.id).order('created_at'),
    supabase.from('game_participants').select('*').in('game_id', gameIds).order('sort_order'),
  ])

  return {
    client, event, edition, teams, games,
    standardResults, pointsResults, participantResults, participantAttemptResults,
    cumulativeRounds, bracketMatches,
    gameParticipants: (gp ?? []) as GameParticipant[],
    leaderboard,
    registrations: (regs ?? []) as AudienceRegistration[],
    feedback: (fb ?? []) as Feedback[],
  }
}

function buildWorkbook(d: ExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const teamName = (id: string) => d.teams.find(t => t.id === id)?.name ?? id

  // ── 1. Summary ───────────────────────────────────────
  const inPerson = d.registrations.filter(r => r.source === 'in_person').length
  const online = d.registrations.filter(r => r.source === 'online').length
  const summaryRows = [
    ['Event Report'],
    [],
    ['Client', d.client.name],
    ['Event', d.event.name],
    ['Edition', d.edition.label],
    ['Date', d.edition.date],
    [],
    ['Audience'],
    ['Total registrations', d.registrations.length],
    ['In-person (QR)', inPerson],
    ['Online', online],
    [],
    ['Games played', d.games.filter(g => g.status === 'completed').length],
    ['Total games', d.games.length],
    [],
    ['Feedback responses', d.feedback.length],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // ── 2. Leaderboard ──────────────────────────────────
  const lbHeader = ['Rank', 'Team', 'Total Points', ...d.games.filter(g => g.status !== 'pending').map(g => g.name)]
  const lbRows = d.leaderboard.map(e => [
    e.rank,
    e.team_name,
    e.total_score,
    ...d.games.filter(g => g.status !== 'pending').map(g => {
      const gs = e.game_scores.find(s => s.game_id === g.id)
      return gs ? gs.score : 0
    }),
  ])
  const lbSheet = XLSX.utils.aoa_to_sheet([lbHeader, ...lbRows])
  lbSheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, ...d.games.map(() => ({ wch: 16 }))]
  XLSX.utils.book_append_sheet(wb, lbSheet, 'Leaderboard')

  // ── 3. Game Results ─────────────────────────────────
  const grRows: (string | number)[][] = []
  for (const game of d.games.sort((a, b) => a.order - b.order)) {
    const funLabel = game.is_fun ? ' [FUN]' : ''
    const weightLabel = game.weight !== 1 ? ` · ×${game.weight}` : ''
    grRows.push([`${game.name}${funLabel}`, `Type: ${game.type}`, `Status: ${game.status}${weightLabel}`])
    grRows.push(['Rank', 'Team', 'Points', 'Notes'])

    const teamPoints = d.leaderboard
      .map(e => {
        const gs = e.game_scores.find(s => s.game_id === game.id)
        return gs ? { team: e.team_name, score: gs.score, rank: gs.game_rank, penalized: gs.penalized, reason: gs.penalty_reason } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.rank - b!.rank)

    for (const row of teamPoints) {
      const notes = row!.penalized ? `PENALTY${row!.reason ? `: ${row!.reason}` : ''}` : ''
      grRows.push([row!.rank, row!.team, row!.score, notes])
    }

    grRows.push([])
  }
  const grSheet = XLSX.utils.aoa_to_sheet(grRows)
  grSheet['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 10 }, { wch: 36 }]
  XLSX.utils.book_append_sheet(wb, grSheet, 'Game Results')

  // ── 4. Game Participants ─────────────────────────────
  if (d.gameParticipants.length > 0) {
    const gpRows: (string | number)[][] = [['Game', 'Team', 'Player', 'Order']]
    for (const game of d.games.sort((a, b) => a.order - b.order)) {
      const entries = d.gameParticipants
        .filter(p => p.game_id === game.id)
        .sort((a, b) => teamName(a.team_id).localeCompare(teamName(b.team_id)) || a.sort_order - b.sort_order)
      entries.forEach(p => gpRows.push([game.name, teamName(p.team_id), p.name, p.sort_order]))
    }
    const gpSheet = XLSX.utils.aoa_to_sheet(gpRows)
    gpSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 24 }, { wch: 8 }]
    XLSX.utils.book_append_sheet(wb, gpSheet, 'Game Participants')
  }

  // ── 5. Audience ─────────────────────────────────────
  const audHeader = ['Name', 'Email', 'Phone', 'House', 'Year From', 'Year To', 'Role', 'Source', 'Registered At']
  const audRows = d.registrations.map(r => [
    r.name, r.email, r.phone, r.house,
    r.year_from ?? '', r.year_to ?? '', r.role, r.source,
    new Date(r.created_at).toLocaleString(),
  ])
  const audSheet = XLSX.utils.aoa_to_sheet([audHeader, ...audRows])
  audSheet['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, audSheet, 'Audience')

  // ── 6. Audience Analysis ────────────────────────────
  const analysisRows: (string | number)[][] = [
    ['Audience Breakdown'],
    [],
    ['By Source'],
    ['In-person (QR)', inPerson],
    ['Online', online],
    [],
    ['By House'],
  ]
  const houseCounts = new Map<string, number>()
  d.registrations.forEach(r => {
    const h = r.house || '(none)'
    houseCounts.set(h, (houseCounts.get(h) ?? 0) + 1)
  })
  Array.from(houseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([house, count]) => analysisRows.push([house, count]))

  analysisRows.push([], ['By Role'])
  const participating = d.registrations.filter(r => r.role === 'participating').length
  const cheerleading = d.registrations.filter(r => r.role === 'cheerleading').length
  analysisRows.push(['Participating', participating], ['Cheerleading', cheerleading])

  analysisRows.push([], ['By Graduation Year (year left)'])
  const gradCounts = new Map<string, number>()
  d.registrations.forEach(r => {
    const y = r.year_to != null ? String(r.year_to) : '(not specified)'
    gradCounts.set(y, (gradCounts.get(y) ?? 0) + 1)
  })
  Array.from(gradCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([yr, count]) => analysisRows.push([yr, count]))

  const analysisSheet = XLSX.utils.aoa_to_sheet(analysisRows)
  analysisSheet['!cols'] = [{ wch: 22 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, analysisSheet, 'Audience Analysis')

  // ── 7. Feedback ─────────────────────────────────────
  if (d.feedback.length > 0) {
    const fbHeader = ['Name', 'Feedback', 'Submitted At']
    const fbRows = d.feedback.map(f => [
      f.name || '(anonymous)',
      f.message,
      new Date(f.created_at).toLocaleString(),
    ])
    const fbSheet = XLSX.utils.aoa_to_sheet([fbHeader, ...fbRows])
    fbSheet['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, fbSheet, 'Feedback')
  }

  return wb
}

export async function exportEventData(
  client: Client, event: TournamentEvent, edition: Edition,
  teams: Team[], games: Game[],
  standardResults: StandardResult[], pointsResults: PointsResult[],
  participantResults: ParticipantResult[], participantAttemptResults: ParticipantAttemptResult[],
  cumulativeRounds: CumulativeRound[], bracketMatches: BracketMatch[],
  gamePenalties: GamePenalty[] = [],
) {
  const data = await fetchExportData(
    client, event, edition, teams, games,
    standardResults, pointsResults, participantResults, participantAttemptResults,
    cumulativeRounds, bracketMatches, gamePenalties,
  )
  const wb = buildWorkbook(data)
  const filename = `${client.name} - ${event.name} - ${edition.label} (${edition.date}).xlsx`.replace(/[/\\?%*:|"<>]/g, '-')
  XLSX.writeFile(wb, filename)
}
