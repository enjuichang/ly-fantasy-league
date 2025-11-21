import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PartyBadge } from '@/components/ui/party-badge'
import { ChevronLeft } from 'lucide-react'
import LegislatorDetailClient from '@/components/legislators/LegislatorDetailClient'
import { getLegislatorById } from '@/app/actions'


interface LegislatorDetailPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default async function LegislatorDetailPage({ params }: LegislatorDetailPageProps) {
  const { id, locale } = await params
  const t = await getTranslations('legislatorDetailPage')

  // Fetch legislator data
  const legislator = await getLegislatorById(id)

  if (!legislator) {
    notFound()
  }

  // Calculate weekly average
  const scores = legislator.scores || []
  const totalPoints = scores.reduce((sum, score) => sum + score.points, 0)
  const weeksCount = scores.length > 0 ?
    Math.ceil((new Date().getTime() - new Date(scores[scores.length - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000)) || 1 : 1
  const weeklyAverage = weeksCount > 0 ? (totalPoints / weeksCount).toFixed(1) : '0.0'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Link href={`/${locale}/legislators`}>
        <Button variant="ghost" className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {legislator.picUrl ? (
                <img
                  src={legislator.picUrl}
                  alt={legislator.nameCh}
                  className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center border-2 border-border">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {legislator.nameCh.substring(0, 1)}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {legislator.nameCh}
                </h1>
                {legislator.nameEn && (
                  <p className="text-lg text-muted-foreground">{legislator.nameEn}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Party Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('partyLabel')}:</span>
                  <PartyBadge party={legislator.party} />
                </div>

                {/* Region */}
                {legislator.areaName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('regionLabel')}:</span>
                    <Badge variant="outline">{legislator.areaName}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Average Card */}
            <Card className="w-48">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('weeklyAverage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {weeklyAverage}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pointsPerWeek')}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section - Client Component for interactivity */}
      <LegislatorDetailClient
        legislator={legislator}
        locale={locale}
      />
    </div>
  )
}
