import { getAllLegislators } from "@/app/actions"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function LegislatorsPage() {
    const legislators = await getAllLegislators()

    // Sort by total points descending
    const sortedLegislators = legislators.map(leg => ({
        ...leg,
        totalPoints: leg.scores.reduce((sum, s) => sum + s.points, 0)
    })).sort((a, b) => b.totalPoints - a.totalPoints)

    return (
        <div className="container mx-auto p-6">
            <h1 className="mb-6 text-3xl font-bold">Legislator Stats</h1>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Party</TableHead>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Total Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedLegislators.map((leg) => (
                            <TableRow key={leg.id}>
                                <TableCell>
                                    {leg.picUrl ? (
                                        <img
                                            src={leg.picUrl}
                                            alt={leg.nameCh}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                                            {leg.nameCh.charAt(0)}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{leg.nameCh}</TableCell>
                                <TableCell>{leg.party}</TableCell>
                                <TableCell>{leg.region}</TableCell>
                                <TableCell className="text-right font-bold">{leg.totalPoints.toFixed(1)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
