import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { getTranslations } from 'next-intl/server'

export default async function RulesPage() {
    const t = await getTranslations('rulesPage')

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-4">{t('backToHome')}</Button>
                </Link>
                <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
                <p className="text-lg text-slate-600">
                    {t('intro')}
                </p>
            </div>

            {/* Game Overview */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('overview.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">{t('overview.step1.title')}</h3>
                        <p className="text-slate-600">{t('overview.step1.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('overview.step2.title')}</h3>
                        <p className="text-slate-600">{t('overview.step2.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('overview.step3.title')}</h3>
                        <p className="text-slate-600">{t('overview.step3.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('overview.step4.title')}</h3>
                        <p className="text-slate-600">{t('overview.step4.description')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Scoring System */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('scoring.title')}</CardTitle>
                    <CardDescription>{t('scoring.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.billProposals.title')}</h3>
                                <Badge>{t('scoring.billProposals.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.billProposals.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.billProposals.cap')}</p>
                        </div>

                        <div className="border-l-4 border-green-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.billProposalsPassed.title')}</h3>
                                <Badge>{t('scoring.billProposalsPassed.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.billProposalsPassed.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.billProposalsPassed.cap')}</p>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.cosignedBills.title')}</h3>
                                <Badge>{t('scoring.cosignedBills.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.cosignedBills.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.cosignedBills.cap')}</p>
                        </div>

                        <div className="border-l-4 border-orange-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.floorSpeeches.title')}</h3>
                                <Badge>{t('scoring.floorSpeeches.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.floorSpeeches.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.floorSpeeches.cap')}</p>
                        </div>

                        <div className="border-l-4 border-pink-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.writtenInterpellations.title')}</h3>
                                <Badge>{t('scoring.writtenInterpellations.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.writtenInterpellations.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.writtenInterpellations.cap')}</p>
                        </div>

                        <div className="border-l-4 border-red-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.rollCallVotes.title')}</h3>
                                <Badge>{t('scoring.rollCallVotes.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.rollCallVotes.description')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('scoring.rollCallVotes.cap')}</p>
                        </div>

                        <div className="border-l-4 border-yellow-500 pl-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">{t('scoring.maverickBonus.title')}</h3>
                                <Badge variant="secondary">{t('scoring.maverickBonus.points')}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{t('scoring.maverickBonus.description')}</p>
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                <p>{t('scoring.maverickBonus.details.p3')}</p>
                                <p>{t('scoring.maverickBonus.details.p6')}</p>
                                <p>{t('scoring.maverickBonus.details.p9')}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Roster Rules */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('roster.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">{t('roster.size.title')}</h3>
                        <p className="text-slate-600">{t('roster.size.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('roster.scoring.title')}</h3>
                        <p className="text-slate-600">{t('roster.scoring.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('roster.leave.title')}</h3>
                        <p className="text-slate-600">{t.rich('roster.leave.description', {
                            badge: (chunks) => <Badge variant="destructive" className="mx-1">L</Badge>
                        })}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('roster.moves.title')}</h3>
                        <p className="text-slate-600">{t('roster.moves.description')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Draft Rules */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('draft.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">{t('draft.snake.title')}</h3>
                        <p className="text-slate-600">{t('draft.snake.description')}</p>
                        <ul className="list-disc list-inside text-sm text-slate-600 mt-2 space-y-1">
                            <li>{t('draft.snake.example.r1')}</li>
                            <li>{t('draft.snake.example.r2')}</li>
                            <li>{t('draft.snake.example.r3')}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('draft.queue.title')}</h3>
                        <p className="text-slate-600">{t('draft.queue.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('draft.auto.title')}</h3>
                        <p className="text-slate-600">{t('draft.auto.description')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Matchups */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('matchups.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">{t('matchups.schedule.title')}</h3>
                        <p className="text-slate-600">{t('matchups.schedule.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('matchups.winning.title')}</h3>
                        <p className="text-slate-600">{t('matchups.winning.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('matchups.standings.title')}</h3>
                        <p className="text-slate-600">{t('matchups.standings.description')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Strategy Tips */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('strategy.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                        <span className="text-2xl">📊</span>
                        <div>
                            <h3 className="font-semibold">{t('strategy.average.title')}</h3>
                            <p className="text-sm text-slate-600">{t('strategy.average.description')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-2xl">🔄</span>
                        <div>
                            <h3 className="font-semibold">{t('strategy.bench.title')}</h3>
                            <p className="text-sm text-slate-600">{t('strategy.bench.description')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-2xl">📈</span>
                        <div>
                            <h3 className="font-semibold">{t('strategy.activity.title')}</h3>
                            <p className="text-sm text-slate-600">{t('strategy.activity.description')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-2xl">🎯</span>
                        <div>
                            <h3 className="font-semibold">{t('strategy.diversify.title')}</h3>
                            <p className="text-sm text-slate-600">{t('strategy.diversify.description')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center py-8">
                <Link href="/dashboard">
                    <Button size="lg">{t('goToDashboard')}</Button>
                </Link>
            </div>
        </div>
    )
}
