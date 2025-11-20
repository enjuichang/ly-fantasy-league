import { getUndraftedLegislators, getLeague, getLegislatorWeeklyScores } from "@/app/actions"
import { auth } from "@/auth"
import PlayersGrid from "@/components/players/PlayersGrid"

export default async function PlayersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const league = await getLeague(id)
    if (!league) return <div>League not found</div>

    const players = await getUndraftedLegislators(id)

    // Get user's team
    const myTeam = (session?.user?.id
        ? league.teams.find((t: any) => t.ownerId === session?.user?.id)
        : null) ?? null

    // Get weekly scores for all players
    const playerIds = players.map((p: any) => p.id)
    const weeklyScores = playerIds.length > 0
        ? await getLegislatorWeeklyScores(playerIds, league.seasonStart)
        : []

    // Calculate current week date range and score breakdowns
    const {
        getCurrentWeek,
        getWeekDateRange,
        getLastWeekScoresByCategory,
        getAverageScoresByCategory
    } = await import("@/lib/scoring-utils")
    const currentWeek = getCurrentWeek(league.seasonStart)
    const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekDateRange(league.seasonStart, currentWeek)

    // Calculate score breakdowns for each player
    const playersWithScoreBreakdowns = players.map((player: any) => ({
        ...player,
        lastWeekScores: getLastWeekScoresByCategory(player.scores || [], league.seasonStart),
        averageScores: getAverageScoresByCategory(player.scores || [])
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Undrafted Legislators</h2>
                <p className="text-slate-500">Available to pick up • Click a player to view history</p>
            </div>

            <PlayersGrid
                players={playersWithScoreBreakdowns}
                weeklyScores={weeklyScores}
                currentWeekStart={currentWeekStart}
                currentWeekEnd={currentWeekEnd}
                myTeam={myTeam}
                leagueId={id}
                seasonStart={league.seasonStart}
            />
        </div>
    )
}
