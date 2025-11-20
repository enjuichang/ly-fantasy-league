import { getLeague } from "@/app/actions"
import { prisma } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentWeek } from "@/lib/scoring-utils"
import { calculateWeekMatchups, updateTeamRecords } from "@/lib/matchup-logic"
import { redirect } from "next/navigation"

interface MatchupPageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ week?: string }>
}

export default async function MatchupsPage({ params, searchParams }: MatchupPageProps) {
    const { id } = await params
    const { week: weekParam } = await searchParams

    const league = await getLeague(id)
    if (!league) {
        return <div>League not found</div>
    }

    // Determine current week
    const currentWeek = getCurrentWeek(league.seasonStart)
    const selectedWeek = weekParam ? parseInt(weekParam) : Math.max(1, Math.min(currentWeek, league.totalWeeks))

    // Calculate week date range for score filtering
    const { getWeekDateRange } = await import("@/lib/scoring-utils")
    const { weekStart: matchWeekStart, weekEnd: matchWeekEnd } = getWeekDateRange(league.seasonStart, selectedWeek)

    // Get matchups for selected week
    const matchups = await prisma.matchup.findMany({
        where: {
            leagueId: id,
            week: selectedWeek
        },
        include: {
            team1: {
                include: {
                    owner: true,
                    legislators: {
                        include: {
                            scores: {
                                where: {
                                    date: {
                                        gte: matchWeekStart,
                                        lte: matchWeekEnd
                                    }
                                }
                            }
                        }
                    }
                }
            },
            team2: {
                include: {
                    owner: true,
                    legislators: {
                        include: {
                            scores: {
                                where: {
                                    date: {
                                        gte: matchWeekStart,
                                        lte: matchWeekEnd
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    // Check if week is completed (current date is after week end)
    const weekEnd = new Date(league.seasonStart)
    weekEnd.setDate(weekEnd.getDate() + (selectedWeek * 7))
    const isWeekCompleted = new Date() > weekEnd

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Matchups</h2>
                    <p className="text-muted-foreground">
                        Week {selectedWeek} of {league.totalWeeks}
                        {selectedWeek === currentWeek && " • Current Week"}
                    </p>
                </div>

                {/* Calculate Scores Button */}
                {isWeekCompleted && (
                    <form
                        action={async () => {
                            'use server'
                            await calculateWeekMatchups(id, selectedWeek)
                            await updateTeamRecords(id)
                        }}
                    >
                        <Button type="submit" variant="outline">
                            Calculate Scores
                        </Button>
                    </form>
                )}
            </div>

            {/* Week Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: league.totalWeeks }, (_, i) => i + 1).map((week) => (
                    <a
                        key={week}
                        href={`/leagues/${id}/matchups?week=${week}`}
                        className={`px-4 py-2 rounded-md border whitespace-nowrap ${selectedWeek === week
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-slate-100'
                            } ${week === currentWeek && selectedWeek !== week ? 'border-blue-600 border-2' : ''
                            }`}
                    >
                        Week {week}
                        {week === currentWeek && ' •'}
                    </a>
                ))}
            </div>

            {/* Matchups Display */}
            {matchups.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        <p>No matchups scheduled for this week yet.</p>
                        <p className="text-sm mt-2">
                            Matchups will be generated automatically after the draft completes.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {matchups.map((matchup: any) => {
                        const isBye = !matchup.team2
                        const hasScores = matchup.team1Score !== null

                        return (
                            <Card key={matchup.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-3 gap-4 p-6">
                                        {/* Team 1 */}
                                        <div className="flex flex-col items-end">
                                            <div className="text-right mb-4">
                                                <p className="font-bold text-lg">{matchup.team1.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {matchup.team1.owner.name || matchup.team1.owner.email}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {matchup.team1.wins}-{matchup.team1.losses}-{matchup.team1.ties}
                                                </p>
                                            </div>

                                            {/* Team 1 Roster */}
                                            <div className="w-full space-y-1">
                                                {(() => {
                                                    const benchIds = new Set(matchup.team1.benchLegislatorIds ? matchup.team1.benchLegislatorIds.split(',').filter(Boolean) : [])
                                                    const rosterLegislators = matchup.team1.legislators.filter((leg: any) => !benchIds.has(leg.id))

                                                    return (
                                                        <>
                                                            {rosterLegislators.map((leg: any) => {
                                                                const score = leg.scores.reduce((sum: number, s: any) => sum + s.points, 0)
                                                                return (
                                                                    <div key={leg.id} className="flex justify-between text-sm">
                                                                        <span className="text-muted-foreground">{leg.nameCh}</span>
                                                                        <span className="font-mono font-medium">{score > 0 ? score.toFixed(1) : '-'}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                            <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                                                                <span>Total</span>
                                                                <span className="font-mono">
                                                                    {rosterLegislators.reduce((total: number, leg: any) =>
                                                                        total + leg.scores.reduce((s: number, sc: any) => s + sc.points, 0), 0
                                                                    ).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>

                                        {/* Score/VS */}
                                        <div className="flex flex-col items-center justify-start pt-4">
                                            {hasScores ? (
                                                <>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-3xl font-bold ${matchup.winnerId === matchup.team1Id ? 'text-green-600' : ''
                                                            }`}>
                                                            {matchup.team1Score?.toFixed(1)}
                                                        </span>
                                                        <span className="text-muted-foreground">-</span>
                                                        <span className={`text-3xl font-bold ${matchup.winnerId === matchup.team2Id ? 'text-green-600' : ''
                                                            }`}>
                                                            {isBye ? '-' : matchup.team2Score?.toFixed(1)}
                                                        </span>
                                                    </div>
                                                    {matchup.winnerId && (
                                                        <Badge className="mt-2" variant={matchup.winnerId === matchup.team1Id ? "default" : "secondary"}>
                                                            {matchup.winnerId === matchup.team1Id ? 'W' : 'L'}
                                                        </Badge>
                                                    )}
                                                    {!matchup.winnerId && !isBye && (
                                                        <Badge className="mt-2" variant="outline">
                                                            TIE
                                                        </Badge>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-2xl font-semibold text-muted-foreground">
                                                    {isBye ? 'BYE' : 'VS'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Team 2 or BYE */}
                                        <div className="flex flex-col items-start">
                                            {isBye ? (
                                                <div className="text-center w-full pt-4">
                                                    <p className="text-muted-foreground italic">Bye Week</p>
                                                </div>
                                            ) : matchup.team2 ? (
                                                <>
                                                    <div className="text-left mb-4">
                                                        <p className="font-bold text-lg">{matchup.team2.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {matchup.team2.owner.name || matchup.team2.owner.email}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {matchup.team2.wins}-{matchup.team2.losses}-{matchup.team2.ties}
                                                        </p>
                                                    </div>

                                                    {/* Team 2 Roster */}
                                                    <div className="w-full space-y-1">
                                                        {(() => {
                                                            const benchIds = new Set(matchup.team2.benchLegislatorIds ? matchup.team2.benchLegislatorIds.split(',').filter(Boolean) : [])
                                                            const rosterLegislators = matchup.team2.legislators.filter((leg: any) => !benchIds.has(leg.id))

                                                            return (
                                                                <>
                                                                    {rosterLegislators.map((leg: any) => {
                                                                        const score = leg.scores.reduce((sum: number, s: any) => sum + s.points, 0)
                                                                        return (
                                                                            <div key={leg.id} className="flex justify-between text-sm">
                                                                                <span className="font-mono font-medium">{score > 0 ? score.toFixed(1) : '-'}</span>
                                                                                <span className="text-muted-foreground">{leg.nameCh}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                                                                        <span className="font-mono">
                                                                            {rosterLegislators.reduce((total: number, leg: any) =>
                                                                                total + leg.scores.reduce((s: number, sc: any) => s + sc.points, 0), 0
                                                                            ).toFixed(1)}
                                                                        </span>
                                                                        <span>Total</span>
                                                                    </div>
                                                                </>
                                                            )
                                                        })()}
                                                    </div>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Week info footer */}
                                    <div className="bg-slate-50 px-6 py-2 text-xs text-muted-foreground border-t">
                                        Week {matchup.week} • {new Date(matchup.weekStart).toLocaleDateString()}
                                        {hasScores && <span> • Scores calculated</span>}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
