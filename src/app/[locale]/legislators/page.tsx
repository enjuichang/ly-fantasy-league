import { getAllLegislators } from "@/app/actions"
import { getTranslations } from 'next-intl/server'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import LegislatorsGrid from "@/components/legislators/LegislatorsGrid"

export default async function LegislatorsPage() {
    const t = await getTranslations('legislatorsPage')
    const legislators = await getAllLegislators()

    // Calculate score breakdowns for each legislator
    const {
        getLastWeekScoresByCategory,
        getAverageScoresByCategory
    } = await import("@/lib/scoring-utils")

    // Use a default season start date (can be modified if needed)
    // This represents when the current legislative session started
    const defaultSeasonStart = new Date('2024-02-01')

    const legislatorsWithScoreBreakdowns = legislators.map(legislator => ({
        ...legislator,
        lastWeekScores: getLastWeekScoresByCategory(legislator.scores || [], defaultSeasonStart),
        averageScores: getAverageScoresByCategory(legislator.scores || [])
    }))

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <Link href="/">
                    <Button variant="outline">{t('backToHome')}</Button>
                </Link>
            </div>

            <LegislatorsGrid legislators={legislatorsWithScoreBreakdowns} />
        </div>
    )
}
