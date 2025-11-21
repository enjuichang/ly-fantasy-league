import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getLeague, inviteUser, getLeagueInvitations, regenerateSchedule } from "@/app/actions"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getTranslations } from 'next-intl/server'

export default async function LeagueSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const league = await getLeague(id)
    const t = await getTranslations()

    if (!league) return <div>{t('common.leagueNotFound')}</div>
    if (league.commissionerId !== session?.user?.id) {
        return <div>{t('common.commissionerOnly')}</div>
    }

    const invitations = await getLeagueInvitations(id)

    // Get matchup count
    const matchupCount = await prisma.matchup.count({
        where: { leagueId: id }
    })

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{t('settings.title')}</h2>

            {/* Season Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.season.title')}</CardTitle>
                    <CardDescription>{t('settings.season.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async (formData) => {
                        'use server'
                        const totalWeeks = parseInt(formData.get("totalWeeks") as string)
                        if (totalWeeks < 1 || totalWeeks > 52) {
                            console.error('Total weeks must be between 1 and 52')
                            return
                        }
                        await prisma.league.update({
                            where: { id },
                            data: { totalWeeks }
                        })
                    }} className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="totalWeeks">{t('settings.season.labelTotalWeeks')}</Label>
                            <Input
                                type="number"
                                id="totalWeeks"
                                name="totalWeeks"
                                min="1"
                                max="52"
                                defaultValue={league.totalWeeks}
                                required
                                className="max-w-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('settings.season.helpTotalWeeks')}
                            </p>
                        </div>
                        <Button type="submit">{t('settings.season.update')}</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Schedule Management */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.schedule.title')}</CardTitle>
                    <CardDescription>
                        {matchupCount > 0
                            ? t('settings.schedule.description_count', { count: matchupCount })
                            : t('settings.schedule.description_none')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async () => {
                        'use server'
                        await regenerateSchedule(id)
                    }}>
                        <Button type="submit" variant={matchupCount > 0 ? "outline" : "default"}>
                            {matchupCount > 0 ? t('settings.schedule.regenerate') : t('settings.schedule.generate')}
                        </Button>
                        {matchupCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {t('settings.schedule.warning')}
                            </p>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Invite Players */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.invite.title')}</CardTitle>
                    <CardDescription>{t('settings.invite.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async (formData) => {
                        'use server'
                        const email = formData.get("email") as string
                        const result = await inviteUser(id, email)
                        if (!result.success) {
                            // In a real app, we'd use useFormState to show this error
                            console.error(result.message)
                        }
                    }} className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="email">{t('settings.invite.labelEmail')}</Label>
                            <Input type="email" id="email" name="email" placeholder={t('settings.invite.placeholderEmail')} required className="max-w-md" />
                        </div>
                        <Button type="submit">{t('settings.invite.submit')}</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.pending.title')}</CardTitle>
                    <CardDescription>{t('settings.pending.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('settings.pending.table.email')}</TableHead>
                                <TableHead>{t('settings.pending.table.status')}</TableHead>
                                <TableHead>{t('settings.pending.table.sentAt')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">{t('settings.pending.noInvites')}</TableCell>
                                </TableRow>
                            ) : (
                                invitations.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={invite.status === 'ACCEPTED' ? 'default' : 'secondary'}>
                                                {invite.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{invite.createdAt.toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
