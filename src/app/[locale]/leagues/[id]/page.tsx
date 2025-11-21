import { getLeague } from "@/app/actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { getTranslations } from 'next-intl/server'

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const league = await getLeague(id)
    const t = await getTranslations()

    if (!league) return null

    const { getWeekStart, getWeekDateRange } = await import("@/lib/scoring-utils")
    const effectiveSeasonStart = getWeekStart(league.seasonStart)

    // Fetch all matchups to calculate Points Against (PA)
    const matchups = await prisma.matchup.findMany({
        where: { leagueId: id },
        select: {
            week: true,
            team1Id: true,
            team2Id: true,
            team1Score: true,
            team2Score: true
        }
    })

    // Pre-calculate weekly scores for all teams to avoid repeated filtering
    const teamWeeklyScores = new Map<string, Map<number, number>>()

    // Initialize map
    league.teams.forEach((team: any) => {
        teamWeeklyScores.set(team.id, new Map())
    })

    // Calculate weekly scores for each team (excluding bench players)
    for (let week = 1; week <= league.totalWeeks; week++) {
        const { weekStart, weekEnd } = getWeekDateRange(league.seasonStart, week)

        league.teams.forEach((team: any) => {
            const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',').filter(Boolean) : [])
            const rosterLegislators = team.legislators.filter((leg: any) => !benchIds.has(leg.id))

            const weekScore = rosterLegislators.reduce((sum: number, leg: any) => {
                const validScores = leg.scores.filter((s: any) => {
                    const scoreDate = new Date(s.date)
                    return scoreDate >= weekStart && scoreDate <= weekEnd
                })
                return sum + validScores.reduce((s: number, score: any) => s + score.points, 0)
            }, 0)

            const teamMap = teamWeeklyScores.get(team.id)
            if (teamMap) {
                teamMap.set(week, weekScore)
            }
        })
    }

    // Calculate scores and sort by wins, then total points
    const teamsWithScores = league.teams.map((team: any) => {
        // Calculate Points For (PF) - exclude bench players
        const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',').filter(Boolean) : [])
        const rosterLegislators = team.legislators.filter((leg: any) => !benchIds.has(leg.id))

        const pointsFor = rosterLegislators.reduce((sum: number, leg: any) => {
            const validScores = leg.scores.filter((s: any) => new Date(s.date) >= effectiveSeasonStart)
            const legScore = validScores.reduce((s: number, score: any) => s + score.points, 0)
            return sum + legScore
        }, 0)

        // Calculate Points Against (PA)
        let pointsAgainst = 0
        matchups.forEach((m: any) => {
            if (m.team1Id === team.id && m.team2Id) {
                // I am Team 1, add Team 2's score for this week
                const opponentScores = teamWeeklyScores.get(m.team2Id)
                if (opponentScores) {
                    pointsAgainst += opponentScores.get(m.week) || 0
                }
            } else if (m.team2Id === team.id) {
                // I am Team 2, add Team 1's score for this week
                const opponentScores = teamWeeklyScores.get(m.team1Id)
                if (opponentScores) {
                    pointsAgainst += opponentScores.get(m.week) || 0
                }
            }
        })

        // Calculate Win Rate
        const totalGames = team.wins + team.losses + team.ties
        const winRate = totalGames > 0 ? (team.wins / totalGames) : 0

        return { ...team, pointsFor, pointsAgainst, winRate }
    }).sort((a: any, b: any) => {
        // Sort by wins first
        if (b.wins !== a.wins) return b.wins - a.wins
        // Then by total points (PF) as tiebreaker
        return b.pointsFor - a.pointsFor
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t('leaguePage.standings.title')}</h2>
                <div className="text-sm text-muted-foreground">
                    {t('leaguePage.standings.leagueId')} <span className="font-mono font-bold select-all">{league.id}</span>
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">{t('leaguePage.standings.rank')}</TableHead>
                            <TableHead>{t('leaguePage.standings.team')}</TableHead>
                            <TableHead>{t('leaguePage.standings.owner')}</TableHead>
                            <TableHead className="text-center">{t('leaguePage.standings.record')}</TableHead>
                            <TableHead className="text-center">{t('leaguePage.standings.winPercentage')}</TableHead>
                            <TableHead className="text-right">{t('leaguePage.standings.pf')}</TableHead>
                            <TableHead className="text-right">{t('leaguePage.standings.pa')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teamsWithScores.map((team, index) => (
                            <TableRow key={team.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell className="font-semibold">{team.name}</TableCell>
                                <TableCell>{team.owner.name || team.owner.email}</TableCell>
                                <TableCell className="text-center font-mono">
                                    {team.wins}-{team.losses}-{team.ties}
                                </TableCell>
                                <TableCell className="text-center font-mono">
                                    {(team.winRate * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-right font-bold">{team.pointsFor.toFixed(1)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{team.pointsAgainst.toFixed(1)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
