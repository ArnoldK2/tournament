import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { computeLeaderboard } from '../store/scoring'
import type {
  Client, TournamentEvent, Edition, Team, Game,
  StandardResult, PointsResult, ParticipantResult,
  CumulativeRound, BracketMatch, AudienceRegistration, Feedback,
  LeaderboardEntry,
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
  cumulativeRounds: CumulativeRound[]
  bracketMatches: BracketMatch[]
  leaderboard: LeaderboardEntry[]
  registrations: AudienceRegistration[]
  feedback: Feedback[]
}

async function fetchExportData(
  client: Client, event: TournamentEvent, edition: Edition,
  teams: Team[], games: Game[],
  standardResults: StandardResult[], pointsResults: PointsResult[],
  participantResults: ParticipantResult[], cumulativeRounds: CumulativeRound[],
  bracketMatches: BracketMatch[],
): Promise<ExportData> {
  const leaderboard = computeLeaderboard({
    games, teams, standardResults, pointsResults,
    participantResults, cumulativeRounds, bracketMatches,
  })

  const [{ data: regs }, { data: fb }] = await Promise.all([
    supabase.from('audience_registrations').select('*').eq('edition_id', edition.id).order('created_at'),
    supabase.from('feedback').select('*').eq('edition_id', edition.id).order('created_at'),
  ])

  return {
    client, event, edition, teams, games,
    standardResults, pointsResults, participantResults,
    cumulativeRounds, bracketMatches, leaderboard,
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
    grRows.push([game.name, `Type: ${game.type}`, `Status: ${game.status}`, `Weight: ${game.weight}`])

    if (game.type === 'standard') {
      grRows.push(['Team', 'Position'])
      d.standardResults
        .filter(r => r.game_id === game.id)
        .sort((a, b) => a.position - b.position)
        .forEach(r => grRows.push([teamName(r.team_id), r.position]))
    } else if (game.type === 'points') {
      grRows.push(['Team', 'Score'])
      d.pointsResults
        .filter(r => r.game_id === game.id)
        .sort((a, b) => b.raw_score - a.raw_score)
        .forEach(r => grRows.push([teamName(r.team_id), r.raw_score]))
    } else if (game.type === 'multi_participant') {
      grRows.push(['Team', 'Participant', 'Position'])
      d.participantResults
        .filter(r => r.game_id === game.id)
        .sort((a, b) => a.position - b.position)
        .forEach(r => grRows.push([teamName(r.team_id), r.participant_name || '(unnamed)', r.position]))
    } else if (game.type === 'cumulative') {
      const rounds = d.cumulativeRounds.filter(r => r.game_id === game.id).sort((a, b) => a.round_number - b.round_number)
      grRows.push(['Round', ...d.teams.map(t => t.name)])
      for (const round of rounds) {
        const row: (string | number)[] = [`Round ${round.round_number}`]
        for (const team of d.teams) {
          const s = round.scores.find((sc: { team_id: string; score: number }) => sc.team_id === team.id)
          row.push(s ? s.score : 0)
        }
        grRows.push(row)
      }
    }

    grRows.push([])
  }
  const grSheet = XLSX.utils.aoa_to_sheet(grRows)
  grSheet['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, grSheet, 'Game Results')

  // ── 4. Audience ─────────────────────────────────────
  const audHeader = ['Name', 'Email', 'Phone', 'House', 'Years at School', 'Role', 'Source', 'Registered At']
  const audRows = d.registrations.map(r => [
    r.name, r.email, r.phone, r.house,
    r.years_at_school ?? '', r.role, r.source,
    new Date(r.created_at).toLocaleString(),
  ])
  const audSheet = XLSX.utils.aoa_to_sheet([audHeader, ...audRows])
  audSheet['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, audSheet, 'Audience')

  // ── 5. Audience Analysis ────────────────────────────
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

  analysisRows.push([], ['By Years at School'])
  const yearCounts = new Map<string, number>()
  d.registrations.forEach(r => {
    const y = r.years_at_school != null ? `${r.years_at_school} years` : '(not specified)'
    yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
  })
  Array.from(yearCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([yr, count]) => analysisRows.push([yr, count]))

  const analysisSheet = XLSX.utils.aoa_to_sheet(analysisRows)
  analysisSheet['!cols'] = [{ wch: 22 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, analysisSheet, 'Audience Analysis')

  // ── 6. Feedback ─────────────────────────────────────
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
  participantResults: ParticipantResult[], cumulativeRounds: CumulativeRound[],
  bracketMatches: BracketMatch[],
) {
  const data = await fetchExportData(
    client, event, edition, teams, games,
    standardResults, pointsResults, participantResults,
    cumulativeRounds, bracketMatches,
  )
  const wb = buildWorkbook(data)
  const filename = `${event.name} - ${edition.label}.xlsx`.replace(/[/\\?%*:|"<>]/g, '-')
  XLSX.writeFile(wb, filename)
}
