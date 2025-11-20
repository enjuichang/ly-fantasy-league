import { auth, prisma } from "@/auth"
import { getLeague, inviteUser, getLeagueInvitations, regenerateSchedule } from "@/app/actions"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function LeagueSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const league = await getLeague(id)

    if (!league) return <div>League not found</div>
    if (league.commissionerId !== session?.user?.id) {
        return <div>Only the commissioner can access settings.</div>
    }

    const invitations = await getLeagueInvitations(id)

    // Get matchup count
    const matchupCount = await prisma.matchup.count({
        where: { leagueId: id }
    })

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">League Settings</h2>

            {/* Season Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Season Settings</CardTitle>
                    <CardDescription>Configure the length of your fantasy season.</CardDescription>
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
                    }} className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="totalWeeks">Total Weeks</Label>
                            <Input
                                type="number"
                                id="totalWeeks"
                                name="totalWeeks"
                                min="1"
                                max="52"
                                defaultValue={league.totalWeeks}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Number of weeks in the regular season (1-52)
                            </p>
                        </div>
                        <Button type="submit">Update</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Schedule Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Matchup Schedule</CardTitle>
                    <CardDescription>
                        {matchupCount > 0
                            ? `${matchupCount} matchups currently scheduled`
                            : 'No matchups generated yet'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async () => {
                        'use server'
                        await regenerateSchedule(id)
                    }}>
                        <Button type="submit" variant={matchupCount > 0 ? "outline" : "default"}>
                            {matchupCount > 0 ? 'Regenerate Schedule' : 'Generate Schedule'}
                        </Button>
                        {matchupCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Warning: This will delete all existing matchups and create new ones.
                            </p>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Invite Players */}
            <Card>
                <CardHeader>
                    <CardTitle>Invite Players</CardTitle>
                    <CardDescription>Send an email invitation to join this league.</CardDescription>
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
                    }} className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="email">Email Address</Label>
                            <Input type="email" id="email" name="email" placeholder="friend@example.com" required />
                        </div>
                        <Button type="submit">Send Invite</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>Track the status of sent invitations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sent At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-slate-500">No pending invitations</TableCell>
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
