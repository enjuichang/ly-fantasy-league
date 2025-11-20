import Link from "next/link"
import { auth } from "@/auth"
import { getLeague } from "@/app/actions"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

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

    const league = await getLeague(id)
    if (!league) return <div>League not found</div>

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold">{league.name}</h1>
                    <p className="text-slate-500">Commissioner: {league.commissionerId === session.user?.id ? "You" : "Someone else"}</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard">
                        <Button variant="outline">Dashboard</Button>
                    </Link>
                    <form action={async () => {
                        'use server'
                        const { signOut } = await import("@/auth")
                        await signOut()
                    }}>
                        <Button variant="outline">Sign Out</Button>
                    </form>
                </div>
            </div>

            <nav className="mb-6 flex gap-4">
                <Link href={`/leagues/${id}`}>
                    <Button variant="ghost">Standings</Button>
                </Link>
                <Link href={`/leagues/${id}/matchups`}>
                    <Button variant="ghost">Matchups</Button>
                </Link>
                <Link href={`/leagues/${id}/team`}>
                    <Button variant="ghost">My Team</Button>
                </Link>
                <Link href={`/leagues/${id}/players`}>
                    <Button variant="ghost">Players</Button>
                </Link>
                <Link href={`/leagues/${id}/activity`}>
                    <Button variant="ghost">Activity</Button>
                </Link>
                <Link href={`/leagues/${id}/draft`}>
                    <Button variant="ghost">Draft</Button>
                </Link>
                {league.commissionerId === session.user?.id && (
                    <Link href={`/leagues/${id}/settings`}>
                        <Button variant="ghost">Settings</Button>
                    </Link>
                )}
            </nav>

            {children}
        </div>
    )
}
