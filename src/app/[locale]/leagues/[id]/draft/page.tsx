import { auth } from "@/auth"
import { getLeague, saveDraftPreferences, executeDraft } from "@/app/actions"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import DraftQueue from "@/components/draft/DraftQueue"
import DraftResults from "@/components/draft/DraftResults"
import { getTranslations } from 'next-intl/server'

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const league = await getLeague(id)
    const t = await getTranslations()

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
                <h2 className="text-2xl font-bold">{t('draft.title')}</h2>
                <Badge variant={league.draftStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                    {t('draft.status', { status: league.draftStatus })}
                </Badge>
            </div>

            {league.draftStatus === 'NOT_STARTED' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Draft Control (Commissioner) */}
                    {isCommissioner && (
                        <Card className="md:col-span-2 border-2 border-primary/40 bg-primary/10">
                            <CardHeader>
                                <CardTitle>{t('draft.commissionerControls.title')}</CardTitle>
                                <CardDescription>{t('draft.commissionerControls.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={async () => {
                                    'use server'
                                    await executeDraft(id)
                                }}>
                                    <Button size="lg" className="w-full">{t('draft.commissionerControls.startSnakeDraft')}</Button>
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
                        <Card className="md:col-span-2 border-2 border-amber-500/40 bg-amber-500/10">
                            <CardContent className="pt-6">
                                <p>{t('draft.queue.noTeam')}</p>
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
