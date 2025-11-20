'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PointsBreakdown from './PointsBreakdown'
import PlayerHistoryModal from './PlayerHistoryModal'
import { toggleBenchStatus, dropPlayer } from '@/app/actions'
import { LeaveIndicator } from '@/components/ui/leave-indicator'

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
    region: string | null
    picUrl: string | null
    leaveFlag: string | null
    leaveDate: string | null
    leaveReason: string | null
    scores: Score[]
}

interface WeeklyScore {
    legislatorId: string
    currentWeek: { week: number; score: number }
    lastWeek: { week: number; score: number }
}

interface TeamRosterProps {
    teamId: string
    legislators: Legislator[]
    weeklyScores: WeeklyScore[]
    currentWeekStart: Date
    currentWeekEnd: Date
    benchLegislatorIds: string[]
    isOwner: boolean
}

export default function TeamRoster({
    teamId,
    legislators,
    weeklyScores,
    currentWeekStart,
    currentWeekEnd,
    benchLegislatorIds,
    isOwner
}: TeamRosterProps) {
    const [selectedLegislator, setSelectedLegislator] = useState<Legislator | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSwapping, setIsSwapping] = useState(false)

    const benchIds = new Set(benchLegislatorIds)
    const rosterLegislators = legislators.filter(leg => !benchIds.has(leg.id))
    const benchLegislators = legislators.filter(leg => benchIds.has(leg.id))

    const handleLegislatorClick = (legislator: Legislator) => {
        setSelectedLegislator(legislator)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setTimeout(() => setSelectedLegislator(null), 150)
    }

    const handleToggleBench = async (legislatorId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setIsSwapping(true)
        try {
            const result = await toggleBenchStatus(teamId, legislatorId)
            if (!result.success) {
                alert(result.message)
            }
        } catch (error) {
            console.error('Failed to toggle bench status:', error)
            alert('Failed to update roster')
        } finally {
            setIsSwapping(false)
        }
    }

    const handleDrop = async (legislatorId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to drop this player?')) return

        setIsSwapping(true)
        try {
            await dropPlayer(teamId, legislatorId)
        } catch (error) {
            console.error('Failed to drop player:', error)
            alert('Failed to drop player')
        } finally {
            setIsSwapping(false)
        }
    }

    const renderLegislatorRow = (leg: Legislator, isBench: boolean) => {
        const weeklyScore = weeklyScores.find(ws => ws.legislatorId === leg.id)
        const currentScore = weeklyScore?.currentWeek.score || 0

        return (
            <div
                key={leg.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
            >
                <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleLegislatorClick(leg)}
                >
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
                    <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                            {leg.nameCh}
                            <LeaveIndicator
                                leaveFlag={leg.leaveFlag}
                                leaveDate={leg.leaveDate}
                                leaveReason={leg.leaveReason}
                            />
                        </div>
                        <div className="text-sm text-slate-500">{leg.party} • {leg.region}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                            <PointsBreakdown
                                scores={leg.scores.filter(s => {
                                    const scoreDate = new Date(s.date)
                                    return scoreDate >= new Date(currentWeekStart) && scoreDate <= new Date(currentWeekEnd)
                                })}
                                totalPoints={currentScore}
                            /> pts
                        </div>
                        {weeklyScore && weeklyScore.lastWeek.week > 0 && (
                            <div className="text-xs text-slate-500">
                                Last: {weeklyScore.lastWeek.score.toFixed(1)}
                            </div>
                        )}
                    </div>
                </div>
                {isOwner && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleToggleBench(leg.id, e)}
                            disabled={isSwapping}
                        >
                            {isBench ? '→ Roster' : '→ Bench'}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => handleDrop(leg.id, e)}
                            disabled={isSwapping}
                        >
                            Drop
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6">
                {/* Starting Roster */}
                <Card>
                    <CardHeader>
                        <CardTitle>Starting Roster ({rosterLegislators.length}/6)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rosterLegislators.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">
                                No players in starting roster
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {rosterLegislators.map(leg => renderLegislatorRow(leg, false))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bench */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bench ({benchLegislators.length}/3)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {benchLegislators.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">
                                No players on bench
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {benchLegislators.map(leg => renderLegislatorRow(leg, true))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <PlayerHistoryModal
                legislator={selectedLegislator}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </>
    )
}
