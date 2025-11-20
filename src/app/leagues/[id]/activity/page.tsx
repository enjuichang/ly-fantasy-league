import { getLeagueActivities } from "@/app/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const activities = await getLeagueActivities(id, 100)

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">League Activity</h2>
                <p className="text-slate-500">Recent transactions and updates</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            No activity yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((activity: any) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{activity.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(activity.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${activity.type === 'PICKUP' ? 'bg-green-100 text-green-800' :
                                            activity.type === 'DROP' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                        }`}>
                                        {activity.type}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
