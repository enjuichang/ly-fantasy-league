'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import PointsBreakdown from './PointsBreakdown'
import PlayerHistoryModal from './PlayerHistoryModal'
import { toggleBenchStatus, dropPlayer } from '@/app/actions'
import { LeaveIndicator } from '@/components/ui/leave-indicator'
import { ErrorIndicator } from '@/components/ui/error-indicator'
import { PartyBadge } from '@/components/ui/party-badge'

interface Score {
    id: string
    date: Date
    points: number
    description: string
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
    errorFlag?: string | null
    errorReason?: string | null
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
    const t = useTranslations('teamRoster')
    const [selectedLegislator, setSelectedLegislator] = useState<Legislator | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSwapping, setIsSwapping] = useState(false)

    // Swap selection modal state
    const [showSwapModal, setShowSwapModal] = useState(false)
    const [playerToMove, setPlayerToMove] = useState<string | null>(null)
    const [selectedSwapTarget, setSelectedSwapTarget] = useState<string | null>(null)

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
                // Check if we need to show swap selection modal
                if ((result as any).needsSwapSelection) {
                    setPlayerToMove(legislatorId)
                    setSelectedSwapTarget(benchLegislators[0]?.id || null)
                    setShowSwapModal(true)
                } else {
                    alert(result.message)
                }
            }
        } catch (error) {
            console.error('Failed to toggle bench status:', error)
            alert('Failed to update roster')
        } finally {
            setIsSwapping(false)
        }
    }

    const handleConfirmSwap = async () => {
        if (!playerToMove || !selectedSwapTarget) return

        setIsSwapping(true)
        try {
            const result = await toggleBenchStatus(teamId, playerToMove, selectedSwapTarget)
            if (!result.success) {
                alert(result.message)
            }
            setShowSwapModal(false)
            setPlayerToMove(null)
            setSelectedSwapTarget(null)
        } catch (error) {
            console.error('Failed to swap players:', error)
            alert('Failed to swap players')
        } finally {
            setIsSwapping(false)
        }
    }

    const handleCancelSwap = () => {
        setShowSwapModal(false)
        setPlayerToMove(null)
        setSelectedSwapTarget(null)
    }

    const handleDrop = async (legislatorId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(t('confirmDrop'))) return

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
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
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
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
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
                            <ErrorIndicator
                                errorFlag={leg.errorFlag || null}
                                errorReason={leg.errorReason || null}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <PartyBadge party={leg.party} /> • {leg.region}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                            <PointsBreakdown
                                scores={leg.scores.filter(s => {
                                    const scoreDate = new Date(s.date)
                                    return scoreDate >= new Date(currentWeekStart) && scoreDate <= new Date(currentWeekEnd)
                                })}
                                totalPoints={currentScore}
                            /> {t('pts')}
                        </div>
                        {weeklyScore && weeklyScore.lastWeek.week > 0 && (
                            <div className="text-xs text-muted-foreground">
                                {t('last', { score: weeklyScore.lastWeek.score.toFixed(1) })}
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
                            {isBench ? t('moveToRoster') : t('moveToBench')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => handleDrop(leg.id, e)}
                            disabled={isSwapping}
                        >
                            {t('drop')}
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
                        <CardTitle>{t('startingRoster', { count: rosterLegislators.length })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rosterLegislators.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                {t('noStarting')}
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
                        <CardTitle>{t('bench', { count: benchLegislators.length })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {benchLegislators.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                {t('noBench')}
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

            {/* Swap Selection Modal */}
            <Dialog open={showSwapModal} onOpenChange={setShowSwapModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('swapModal.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t('swapModal.description')}
                        </p>
                        <div className="space-y-2">
                            {benchLegislators.map(leg => (
                                <div
                                    key={leg.id}
                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedSwapTarget === leg.id
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-accent'
                                        }`}
                                    onClick={() => setSelectedSwapTarget(leg.id)}
                                >
                                    <input
                                        type="radio"
                                        checked={selectedSwapTarget === leg.id}
                                        onChange={() => setSelectedSwapTarget(leg.id)}
                                        className="cursor-pointer"
                                    />
                                    {leg.picUrl ? (
                                        <img
                                            src={leg.picUrl}
                                            alt={leg.nameCh}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                                            {leg.nameCh.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium">{leg.nameCh}</div>
                                        <div className="text-sm text-muted-foreground">
                                            <PartyBadge party={leg.party} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelSwap} disabled={isSwapping}>
                            {t('swapModal.cancel')}
                        </Button>
                        <Button onClick={handleConfirmSwap} disabled={isSwapping || !selectedSwapTarget}>
                            {isSwapping ? 'Swapping...' : t('swapModal.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
