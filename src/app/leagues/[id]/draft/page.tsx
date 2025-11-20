import { auth } from "@/auth"
import { getLeague, saveDraftPreferences, executeDraft } from "@/app/actions"
import { prisma } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import DraftQueue from "@/components/draft/DraftQueue"
import DraftResults from "@/components/draft/DraftResults"

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const league = await getLeague(id)

    if (!league) return <div>League not found</div>

    // Get user's team
    const userTeam = await prisma.team.findFirst({
        where: { leagueId: id, ownerId: session?.user?.id },
        include: {
            preferences: {
                orderBy: { rank: 'asc' },
                include: {
                    legislator: {
                        include: {
                            scores: true
                        }
                    }
                }
            }
        }
    })

    // Get all legislators for selection with their scores
    const allLegislators = await prisma.legislator.findMany({
        include: {
            scores: true
        },
        orderBy: { nameCh: 'asc' }
    })

    // Calculate score breakdowns for all legislators
    const {
        getLastWeekScoresByCategory,
        getAverageScoresByCategory
    } = await import("@/lib/scoring-utils")

    const legislatorsWithScoreBreakdowns = allLegislators.map((legislator: any) => ({
        ...legislator,
        lastWeekScores: getLastWeekScoresByCategory(legislator.scores || [], league.seasonStart),
        averageScores: getAverageScoresByCategory(legislator.scores || [])
    }))

    // Get draft picks if completed
    const draftPicks = await prisma.draftPick.findMany({
        where: { leagueId: id },
        include: {
            legislator: true,
            team: { include: { owner: true } }
        },
        orderBy: { pickNumber: 'asc' }
    })

    const isCommissioner = league.commissionerId === session?.user?.id

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Draft Room</h2>
                <Badge variant={league.draftStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                    Status: {league.draftStatus}
                </Badge>
            </div>

            {league.draftStatus === 'NOT_STARTED' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Draft Control (Commissioner) */}
                    {isCommissioner && (
                        <Card className="md:col-span-2 border-blue-200 bg-blue-50">
                            <CardHeader>
                                <CardTitle>Commissioner Controls</CardTitle>
                                <CardDescription>Start the draft when everyone is ready.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={async () => {
                                    'use server'
                                    await executeDraft(id)
                                }}>
                                    <Button size="lg" className="w-full">Run Snake Draft Now</Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Preference Queue */}
                    {userTeam ? (
                        <div className="md:col-span-2">
                            <DraftQueue
                                leagueId={id}
                                initialPreferences={userTeam.preferences.map((p: any) => {
                                    const legislator = p.legislator
                                    return {
                                        ...legislator,
                                        lastWeekScores: getLastWeekScoresByCategory(legislator.scores || [], league.seasonStart),
                                        averageScores: getAverageScoresByCategory(legislator.scores || [])
                                    }
                                })}
                                allLegislators={legislatorsWithScoreBreakdowns}
                                seasonStart={league.seasonStart}
                            />
                        </div>
                    ) : (
                        <Card className="md:col-span-2 bg-yellow-50">
                            <CardContent className="pt-6">
                                <p>You need to create a team before you can participate in the draft.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Draft Results */}
            {league.draftStatus === 'COMPLETED' && (
                <DraftResults picks={draftPicks as any} />
            )}
        </div>
    )
}
