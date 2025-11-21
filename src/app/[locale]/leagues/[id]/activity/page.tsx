import { getLeagueActivities } from "@/app/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTranslations } from 'next-intl/server'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const activities = await getLeagueActivities(id, 100)

    const t = await getTranslations('activityPage')

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">{t('title')}</h2>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {t('noActivity')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((activity: any) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{activity.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(activity.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${activity.type === 'PICKUP' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                        activity.type === 'DROP' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                                            'bg-primary/20 text-primary'
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
