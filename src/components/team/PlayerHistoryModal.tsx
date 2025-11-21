'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Score {
    id: string
    date: Date
    points: number
    reason: string
    category: string
}

interface Legislator {
    id: string
    nameCh: string
    party: string
    picUrl: string | null
    scores: Score[]
}

interface PlayerHistoryModalProps {
    legislator: Legislator | null
    isOpen: boolean
    onClose: () => void
}

interface WeeklyScore {
    weekStart: Date
    weekEnd: Date
    totalPoints: number
    scores: Score[]
    categoryBreakdown: { category: string; points: number; count: number }[]
}

// Format date consistently for both server and client
function formatDate(date: Date): string {
    return new Date(date).toISOString().split('T')[0]
}

// Format date range for display
function formatDateRange(start: Date, end: Date): string {
    const startStr = formatDate(start)
    const endStr = formatDate(end)
    return `${startStr} - ${endStr}`
}

// Get the Monday of the week for a given date
function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

// Get the Sunday of the week for a given date
function getWeekEnd(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() + (day === 0 ? 0 : 7 - day)
    d.setDate(diff)
    d.setHours(23, 59, 59, 999)
    return d
}

// Group scores by week
function groupScoresByWeek(scores: Score[]): WeeklyScore[] {
    const weekMap = new Map<string, WeeklyScore>()

    scores.forEach((score) => {
        const scoreDate = new Date(score.date)
        const weekStart = getWeekStart(scoreDate)
        const weekEnd = getWeekEnd(scoreDate)
        const weekKey = weekStart.toISOString()

        if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
                weekStart,
                weekEnd,
                totalPoints: 0,
                scores: [],
                categoryBreakdown: []
            })
        }

        const weekData = weekMap.get(weekKey)!
        weekData.scores.push(score)
        weekData.totalPoints += score.points
    })

    // Calculate category breakdown for each week
    weekMap.forEach((weekData) => {
        const categoryMap = new Map<string, { points: number; count: number }>()

        weekData.scores.forEach((score) => {
            const existing = categoryMap.get(score.category) || { points: 0, count: 0 }
            categoryMap.set(score.category, {
                points: existing.points + score.points,
                count: existing.count + 1
            })
        })

        weekData.categoryBreakdown = Array.from(categoryMap.entries())
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.points - a.points)
    })

    // Sort weeks by date (most recent first)
    return Array.from(weekMap.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
}

export default function PlayerHistoryModal({ legislator, isOpen, onClose }: PlayerHistoryModalProps) {
    const [viewMode, setViewMode] = useState<'weekly' | 'all'>('weekly')
    const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

    if (!legislator) return null

    const totalPoints = legislator.scores.reduce((sum, s) => sum + s.points, 0)
    const weeklyScores = groupScoresByWeek(legislator.scores)

    const toggleWeek = (weekKey: string) => {
        const newExpanded = new Set(expandedWeeks)
        if (newExpanded.has(weekKey)) {
            newExpanded.delete(weekKey)
        } else {
            newExpanded.add(weekKey)
        }
        setExpandedWeeks(newExpanded)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {legislator.picUrl ? (
                                <img
                                    src={legislator.picUrl}
                                    alt={legislator.nameCh}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xl">
                                    {legislator.nameCh.charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="text-2xl font-bold">{legislator.nameCh}</p>
                                <p className="text-sm text-muted-foreground">{legislator.party}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">
                                {weeklyScores.length > 0 ? (totalPoints / weeklyScores.length).toFixed(1) : '0.0'}
                            </p>
                            <p className="text-xs text-muted-foreground">Avg Per Week</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* View Mode Toggle */}
                <div className="flex gap-2 mt-4 border-b">
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={`px-4 py-2 font-medium transition-colors ${viewMode === 'weekly'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Weekly Summary
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-2 font-medium transition-colors ${viewMode === 'all'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        All Events
                    </button>
                </div>

                <div className="mt-4">
                    {legislator.scores.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No scoring activity yet.</p>
                    ) : viewMode === 'weekly' ? (
                        /* Weekly Summary View */
                        <div className="space-y-2">
                            {weeklyScores.map((week) => {
                                const weekKey = week.weekStart.toISOString()
                                const isExpanded = expandedWeeks.has(weekKey)

                                return (
                                    <div key={weekKey} className="border rounded-md overflow-hidden">
                                        {/* Week Header */}
                                        <button
                                            onClick={() => toggleWeek(weekKey)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                                )}
                                                <div className="text-left">
                                                    <p className="font-semibold">
                                                        Week of {formatDate(week.weekStart)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDateRange(week.weekStart, week.weekEnd)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-bold ${week.totalPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {week.totalPoints >= 0 ? '+' : ''}{week.totalPoints}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{week.scores.length} activities</p>
                                            </div>
                                        </button>

                                        {/* Expanded Week Details */}
                                        {isExpanded && (
                                            <div className="border-t bg-muted/50 p-4">
                                                {/* Category Breakdown */}
                                                <div className="mb-3">
                                                    <p className="text-sm font-semibold mb-2 text-slate-700">Category Breakdown</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {week.categoryBreakdown.map((cat) => (
                                                            <div key={cat.category} className="flex items-center justify-between bg-card p-2 rounded border">
                                                                <div>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {cat.category}
                                                                    </Badge>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {cat.count} {cat.count === 1 ? 'activity' : 'activities'}
                                                                    </p>
                                                                </div>
                                                                <p className="font-bold text-blue-600">
                                                                    +{cat.points}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Individual Activities */}
                                                <div>
                                                    <p className="text-sm font-semibold mb-2 text-slate-700">Activities</p>
                                                    <div className="space-y-1">
                                                        {week.scores
                                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                            .map((score) => (
                                                                <div key={score.id} className="flex items-center justify-between bg-card p-2 rounded text-sm border">
                                                                    <div className="flex-1">
                                                                        <p className="text-sm">{score.reason}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatDate(score.date)}
                                                                        </p>
                                                                    </div>
                                                                    <p className={`font-semibold ${score.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {score.points >= 0 ? '+' : ''}{score.points}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* All Events View (Original) */
                        <div className="space-y-3">
                            {legislator.scores
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((score) => (
                                    <div key={score.id} className="flex items-start justify-between p-3 border rounded-md hover:bg-accent">
                                        <div className="flex-1">
                                            <p className="font-medium">{score.reason}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {score.category}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(score.date)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${score.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {score.points >= 0 ? '+' : ''}{score.points}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
