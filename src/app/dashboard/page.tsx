import { auth } from "@/auth"
import { getLeagues, createLeague } from "@/app/actions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function Dashboard() {
    const session = await auth()
    if (!session) redirect("/api/auth/signin")

    const leagues = await getLeagues()
    const { getPendingInvitations } = await import("@/app/actions")
    const invitations = await getPendingInvitations()

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Leagues</h1>
                <div className="flex gap-2">
                    <form action={async () => {
                        'use server'
                        const { signOut } = await import("@/auth")
                        await signOut()
                    }}>
                        <Button variant="outline">Sign Out</Button>
                    </form>
                </div>
            </div>

            {invitations.length > 0 && (
                <div className="mb-8">
                    <h2 className="mb-4 text-2xl font-bold">Pending Invitations</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {invitations.map((invite: any) => (
                            <Card key={invite.id} className="bg-yellow-50 border-yellow-200">
                                <CardHeader>
                                    <CardTitle>{invite.league.name}</CardTitle>
                                    <CardDescription>Invited by {invite.league.commissioner.name || invite.league.commissioner.email}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form action={async () => {
                                        'use server'
                                        const { acceptInvitation } = await import("@/app/actions")
                                        await acceptInvitation(invite.id)
                                    }}>
                                        <Button className="w-full">Accept Invitation</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Create League Card */}
                <Card className="border-dashed border-slate-300 bg-slate-50">
                    <CardHeader>
                        <CardTitle>Create New League</CardTitle>
                        <CardDescription>Start a new season with friends</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createLeague} className="flex flex-col gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="name">League Name</Label>
                                <Input type="text" id="name" name="name" placeholder="e.g. Taipei Politicos" required />
                            </div>
                            <Button type="submit" className="w-full">Create League</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Join League Card */}
                <Card className="border-dashed border-slate-300 bg-slate-50">
                    <CardHeader>
                        <CardTitle>Join a League</CardTitle>
                        <CardDescription>Enter a League ID to join</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            'use server'
                            const { joinLeague } = await import("@/app/actions")
                            await joinLeague(formData)
                        }} className="flex flex-col gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="leagueId">League ID</Label>
                                <Input type="text" id="leagueId" name="leagueId" placeholder="Paste League ID here" required />
                            </div>
                            <Button type="submit" variant="secondary" className="w-full">Join League</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Existing Leagues */}
                {leagues.map((league: any) => (
                    <Link key={league.id} href={`/leagues/${league.id}`}>
                        <Card className="h-full transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>{league.name}</CardTitle>
                                <CardDescription>Season starts: {league.seasonStart.toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>{league._count.teams} Teams</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" className="w-full">View League</Button>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
