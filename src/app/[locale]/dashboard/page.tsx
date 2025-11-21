import { auth } from "@/auth"
import { getLeagues, createLeague } from "@/app/actions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { getTranslations } from 'next-intl/server'

export default async function Dashboard() {
    const session = await auth()
    if (!session) redirect("/api/auth/signin")
    const t = await getTranslations()

    const leagues = await getLeagues()
    const { getPendingInvitations } = await import("@/app/actions")
    const invitations = await getPendingInvitations()

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
                <div className="flex gap-2 items-center">
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <Link href="/rules">
                        <Button variant="outline">{t('common.rules')}</Button>
                    </Link>
                    <form action={async () => {
                        'use server'
                        const { signOut } = await import("@/auth")
                        await signOut()
                    }}>
                        <Button variant="outline">{t('common.signOut')}</Button>
                    </form>
                </div>
            </div>

            {/* Top Section: Create and Join League */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Create League Card */}
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <CardHeader>
                        <CardTitle>{t('dashboard.createLeague.title')}</CardTitle>
                        <CardDescription>{t('dashboard.createLeague.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createLeague} className="flex flex-col gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="name">{t('dashboard.createLeague.labelName')}</Label>
                                <Input type="text" id="name" name="name" placeholder={t('dashboard.createLeague.placeholderName')} required />
                            </div>
                            <Button type="submit" className="w-full">{t('dashboard.createLeague.submit')}</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Join League Card */}
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <CardHeader>
                        <CardTitle>{t('dashboard.joinLeague.title')}</CardTitle>
                        <CardDescription>{t('dashboard.joinLeague.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            'use server'
                            const { joinLeague } = await import("@/app/actions")
                            await joinLeague(formData)
                        }} className="flex flex-col gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="leagueId">{t('dashboard.joinLeague.labelId')}</Label>
                                <Input type="text" id="leagueId" name="leagueId" placeholder={t('dashboard.joinLeague.placeholderId')} required />
                            </div>
                            <Button type="submit" variant="secondary" className="w-full">{t('dashboard.joinLeague.submit')}</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Section: Pending Invitations */}
            {invitations.length > 0 && (
                <div className="mb-8">
                    <h2 className="mb-4 text-2xl font-bold">{t('dashboard.invitations.title')}</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {invitations.map((invite: any) => (
                            <Card key={invite.id} className="border-2 border-amber-500/50 bg-amber-500/10">
                                <CardHeader>
                                    <CardTitle>{invite.league.name}</CardTitle>
                                    <CardDescription>{t('dashboard.invitations.invitedBy', { name: invite.league.commissioner.name || invite.league.commissioner.email })}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form action={async () => {
                                        'use server'
                                        const { acceptInvitation } = await import("@/app/actions")
                                        await acceptInvitation(invite.id)
                                    }}>
                                        <Button className="w-full">{t('dashboard.invitations.accept')}</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Section: Active Leagues */}
            <div>
                <h2 className="mb-4 text-2xl font-bold">{t('dashboard.yourLeagues')}</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {leagues.map((league: any) => (
                        <Link key={league.id} href={`/leagues/${league.id}`}>
                            <Card className="h-full transition-shadow hover:shadow-md">
                                <CardHeader>
                                    <CardTitle>{league.name}</CardTitle>
                                    <CardDescription>{t('dashboard.league.seasonStarts', { date: league.seasonStart.toLocaleDateString() })}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p>{t('dashboard.league.teamsCount', { count: league._count.teams })}</p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="secondary" className="w-full">{t('dashboard.league.view')}</Button>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
