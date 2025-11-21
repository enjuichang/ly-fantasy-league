import { auth } from "@/auth"
import { getLeague, createTeam, getLegislatorWeeklyScores } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TeamRoster from "@/components/team/TeamRoster"
import { getTranslations } from 'next-intl/server'

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const t = await getTranslations()
    if (!session?.user?.id) return <div>{t('common.pleaseSignIn')}</div>

    const league = await getLeague(id)
    if (!league) return <div>{t('common.leagueNotFound')}</div>

    const myTeam = league.teams.find((t: any) => t.ownerId === session.user?.id)

    if (!myTeam) {
        return (
            <Card className="max-w-md mx-auto mt-10">
                <CardHeader>
                    <CardTitle>{t('team.create.title')}</CardTitle>
                    <CardDescription>{t('team.create.description', { leagueName: league.name })}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createTeam.bind(null, id)} className="flex flex-col gap-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="name">{t('team.create.labelName')}</Label>
                            <Input type="text" id="name" name="name" placeholder={t('team.create.placeholderName')} required />
                        </div>
                        <Button type="submit" className="w-full">{t('team.create.submit')}</Button>
                    </form>
                </CardContent>
            </Card>
        )
    }

    // Get weekly scores for all legislators on the team
    const legislatorIds = myTeam.legislators.map((leg: any) => leg.id)
    const weeklyScores = legislatorIds.length > 0
        ? await getLegislatorWeeklyScores(legislatorIds, league.seasonStart)
        : []

    // Calculate current week date range for breakdown
    const { getCurrentWeek, getWeekDateRange } = await import("@/lib/scoring-utils")
    const currentWeek = getCurrentWeek(league.seasonStart)
    const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekDateRange(league.seasonStart, currentWeek)

    // Calculate total points for the current week (excluding bench)
    const benchIds = new Set(myTeam.benchLegislatorIds ? myTeam.benchLegislatorIds.split(',') : [])
    const teamTotalPoints = weeklyScores.reduce((sum, ws) => {
        if (benchIds.has(ws.legislatorId)) return sum
        return sum + ws.currentWeek.score
    }, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{myTeam.name}</h2>
                <div className="text-lg font-semibold text-slate-600">
                    {t('team.totalPoints', { points: teamTotalPoints.toFixed(1) })}
                </div>
            </div>

            <TeamRoster
                teamId={myTeam.id}
                legislators={myTeam.legislators}
                weeklyScores={weeklyScores}
                currentWeekStart={currentWeekStart}
                currentWeekEnd={currentWeekEnd}
                benchLegislatorIds={Array.from(benchIds)}
                isOwner={myTeam.ownerId === session.user.id}
            />
        </div>
    )
}
