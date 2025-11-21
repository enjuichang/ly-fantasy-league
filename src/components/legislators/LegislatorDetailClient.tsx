'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'


interface Score {
  id: string
  points: number
  date: Date
  category: string
  description: string | null
}

interface Legislator {
  id: string
  nameCh: string
  nameEn: string | null
  party: string
  region: string | null
  picUrl: string | null
  scores?: Score[]
}

interface LegislatorDetailClientProps {
  legislator: Legislator
  locale: string
}

type ActivityTab = 'all' | 'legislation' | 'votes' | 'speeches' | 'interpellations'

// Category mappings
const LEGISLATION_CATEGORIES = ['PROPOSE_BILL', 'COSIGN_BILL']
const VOTE_CATEGORIES = ['ROLL_CALL_VOTE', 'MAVERICK_BONUS']
const SPEECH_CATEGORIES = ['FLOOR_SPEECH']
const INTERPELLATION_CATEGORIES = ['INTERPELLATION']

const getCategoryBadgeColor = (category: string): string => {
  if (LEGISLATION_CATEGORIES.includes(category)) return 'bg-blue-500 text-white'
  if (VOTE_CATEGORIES.includes(category)) return 'bg-purple-500 text-white'
  if (SPEECH_CATEGORIES.includes(category)) return 'bg-orange-500 text-white'
  if (INTERPELLATION_CATEGORIES.includes(category)) return 'bg-green-500 text-white'
  return 'bg-gray-500 text-white'
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'PROPOSE_BILL': 'Bill Proposal',
    'COSIGN_BILL': 'Cosign Bill',
    'FLOOR_SPEECH': 'Floor Speech',
    'INTERPELLATION': 'Interpellation',
    'ROLL_CALL_VOTE': 'Roll Call Vote',
    'MAVERICK_BONUS': 'Maverick Bonus'
  }
  return labels[category] || category
}

export default function LegislatorDetailClient({ legislator, locale }: LegislatorDetailClientProps) {
  const t = useTranslations('legislatorDetailPage')
  const [activeTab, setActiveTab] = useState<ActivityTab>('all')

  const scores = legislator.scores || []

  // Filter scores based on active tab
  const filteredScores = useMemo(() => {
    if (activeTab === 'all') return scores

    const categoryMap: Record<ActivityTab, string[]> = {
      all: [],
      legislation: LEGISLATION_CATEGORIES,
      votes: VOTE_CATEGORIES,
      speeches: SPEECH_CATEGORIES,
      interpellations: INTERPELLATION_CATEGORIES
    }

    const categories = categoryMap[activeTab]
    return scores.filter(score => categories.includes(score.category))
  }, [scores, activeTab])

  // Prepare chart data (group by week)
  const chartData = useMemo(() => {
    const weeklyData: Record<string, { week: string, points: number, date: Date }> = {}

    scores.forEach(score => {
      const scoreDate = new Date(score.date)
      // Get the Monday of the week for this score
      const weekStart = new Date(scoreDate)
      weekStart.setDate(scoreDate.getDate() - scoreDate.getDay() + (scoreDate.getDay() === 0 ? -6 : 1))
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { week: weekKey, points: 0, date: weekStart }
      }
      weeklyData[weekKey].points += score.points
    })

    // Convert to array and sort by date
    return Object.values(weeklyData)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-10) // Last 10 weeks
      .map(item => ({
        week: new Date(item.date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' }),
        points: item.points
      }))
  }, [scores, locale])

  return (
    <>
      {/* Points Graph */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pointsGraph')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="linear"
                  dataKey="points"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {chartData.length === 1 ? 'Need at least 2 weeks of data to show chart' : t('noActivity')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActivityTab)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
              <TabsTrigger value="legislation">{t('tabs.legislation')}</TabsTrigger>
              <TabsTrigger value="votes">{t('tabs.votes')}</TabsTrigger>
              <TabsTrigger value="speeches">{t('tabs.speeches')}</TabsTrigger>
              <TabsTrigger value="interpellations">{t('tabs.interpellations')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Activity Table */}
          {filteredScores.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">{t('tableHeaders.date')}</TableHead>
                    <TableHead>{t('tableHeaders.action')}</TableHead>
                    <TableHead className="text-right w-24">{t('tableHeaders.points')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScores
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 100) // Show last 100 activities (more since they're individual bills now)
                    .map((score) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(score.date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="max-w-2xl">
                          {score.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary whitespace-nowrap">
                          {score.points > 0 ? '+' : ''}{score.points} pts
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('noActivity')}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
