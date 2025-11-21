import Link from "next/link"
import { auth } from "@/auth"
import { getLeague } from "@/app/actions"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { getTranslations } from 'next-intl/server'

export default async function LeagueLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await auth()
    if (!session) redirect("/api/auth/signin")
    const t = await getTranslations()

    const league = await getLeague(id)
    if (!league) return <div>{t('common.leagueNotFound')}</div>

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold">{league.name}</h1>
                    <p className="text-muted-foreground">{t('leagueLayout.commissioner.label', { name: league.commissionerId === session.user?.id ? t('leagueLayout.commissioner.you') : t('leagueLayout.commissioner.someoneElse') })}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <Link href="/rules">
                        <Button variant="outline">{t('common.rules')}</Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button variant="outline">{t('common.dashboard')}</Button>
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

            <nav className="mb-6 flex gap-4">
                <Link href={`/leagues/${id}`}>
                    <Button variant="ghost">{t('leagueLayout.nav.standings')}</Button>
                </Link>
                <Link href={`/leagues/${id}/matchups`}>
                    <Button variant="ghost">{t('leagueLayout.nav.matchups')}</Button>
                </Link>
                <Link href={`/leagues/${id}/team`}>
                    <Button variant="ghost">{t('leagueLayout.nav.myTeam')}</Button>
                </Link>
                <Link href={`/leagues/${id}/players`}>
                    <Button variant="ghost">{t('leagueLayout.nav.players')}</Button>
                </Link>
                <Link href={`/leagues/${id}/activity`}>
                    <Button variant="ghost">{t('leagueLayout.nav.activity')}</Button>
                </Link>
                <Link href={`/leagues/${id}/draft`}>
                    <Button variant="ghost">{t('leagueLayout.nav.draft')}</Button>
                </Link>
                {league.commissionerId === session.user?.id && (
                    <Link href={`/leagues/${id}/settings`}>
                        <Button variant="ghost">{t('leagueLayout.nav.settings')}</Button>
                    </Link>
                )}
            </nav>

            {children}
        </div>
    )
}
