'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import PlayerHistoryModal from "@/components/team/PlayerHistoryModal"
import PointsBreakdown from "@/components/team/PointsBreakdown"
import { pickupPlayer } from '@/app/actions'
import { LeaveIndicator } from "@/components/ui/leave-indicator"
import LegislatorsList from '@/components/shared/LegislatorsList'
import { useTranslations } from 'next-intl'

import type { CategoryScores } from '@/lib/scoring-client'

interface Score {
    id: string
    date: Date
    points: number
    description: string
    category: string
}

interface Player {
    id: string
    nameCh: string
    nameEn: string | null
    party: string
    region: string | null
    areaName: string | null
    picUrl: string | null
    leaveFlag: string | null
    leaveDate: string | null
    leaveReason: string | null
    scores: Score[]
    lastWeekScores: CategoryScores
    averageScores: CategoryScores
}

interface WeeklyScore {
    legislatorId: string
    currentWeek: { week: number; score: number }
    lastWeek: { week: number; score: number }
}

interface Team {
    id: string
    name: string
    legislators: Player[]
    benchLegislatorIds: string
}

interface PlayersGridProps {
    players: Player[]
    weeklyScores: WeeklyScore[]
    currentWeekStart: Date
    currentWeekEnd: Date
    myTeam: Team | null
    leagueId: string
    seasonStart: Date
}

export default function PlayersGrid({ players, weeklyScores, currentWeekStart, currentWeekEnd, myTeam, leagueId, seasonStart }: PlayersGridProps) {
    const t = useTranslations('playersGrid')

    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [pickupModalPlayer, setPickupModalPlayer] = useState<Player | null>(null)
    const [selectedDropPlayer, setSelectedDropPlayer] = useState<string | null>(null)
    const [isPickingUp, setIsPickingUp] = useState(false)

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayer(player)
        setIsModalOpen(true)
    }

    const handlePickupClick = (player: Player, e: React.MouseEvent) => {
        e.stopPropagation()
        setPickupModalPlayer(player)
        setSelectedDropPlayer(null)
    }

    const handleConfirmPickup = async () => {
        if (!pickupModalPlayer || !myTeam) return

        setIsPickingUp(true)
        try {
            const result = await pickupPlayer(myTeam.id, pickupModalPlayer.id, selectedDropPlayer || undefined)
            if (!result.success) {
                alert(result.message)
            } else {
                setPickupModalPlayer(null)
                setSelectedDropPlayer(null)
            }
        } catch (error) {
            console.error('Failed to pickup player:', error)
            alert('Failed to pickup player')
        } finally {
            setIsPickingUp(false)
        }
    }

    const benchIds = new Set(myTeam?.benchLegislatorIds ? myTeam.benchLegislatorIds.split(',').filter(Boolean) : [])
    const teamIsFull = myTeam && myTeam.legislators.length >= 9
    const needsReplacement = teamIsFull

    const getPlayerMostRecentScore = (playerId: string) => {
        const player = players.find(p => p.id === playerId) || myTeam?.legislators.find(l => l.id === playerId)
        if (!player || player.scores.length === 0) return 0

        // Group scores by week (Monday-Sunday)
        const getWeekKey = (date: Date) => {
            const d = new Date(date)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
            const monday = new Date(d.setDate(diff))
            monday.setHours(0, 0, 0, 0)
            return monday.toISOString().split('T')[0]
        }

        const weeklyTotals = new Map<string, { total: number, date: Date }>()
        player.scores.forEach(score => {
            const weekKey = getWeekKey(new Date(score.date))
            const existing = weeklyTotals.get(weekKey) || { total: 0, date: new Date(score.date) }
            existing.total += score.points
            weeklyTotals.set(weekKey, existing)
        })

        // Get most recent week
        const sortedWeeks = Array.from(weeklyTotals.entries()).sort((a, b) =>
            b[1].date.getTime() - a[1].date.getTime()
        )

        return sortedWeeks[0]?.[1].total || 0
    }

    return (
        <>
            {/* List View */}
            <LegislatorsList
                legislators={players}
                onLegislatorClick={(l) => handlePlayerClick(l as Player)}
                onActionClick={myTeam ? (l, e) => handlePickupClick(l as Player, e) : undefined}
                actionLabel={t('add')}
                showActions={!!myTeam}
            />

            {/* Pickup Modal */}
            <Dialog open={!!pickupModalPlayer} onOpenChange={(open) => !open && setPickupModalPlayer(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('pickupModal.title')}</DialogTitle>
                        <DialogDescription>
                            {needsReplacement
                                ? t('pickupModal.descriptionFull')
                                : t('pickupModal.description')}
                        </DialogDescription>
                    </DialogHeader>

                    {pickupModalPlayer && (
                        <div className="space-y-4">
                            {/* Player to add */}
                            <div className="border rounded-lg p-4 bg-green-50">
                                <div className="text-sm font-medium text-green-800 mb-2">{t('pickupModal.adding')}</div>
                                <div className="flex items-center gap-3">
                                    {pickupModalPlayer.picUrl ? (
                                        <img src={pickupModalPlayer.picUrl} alt={pickupModalPlayer.nameCh} className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                            {pickupModalPlayer.nameCh.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-semibold">
                                            {pickupModalPlayer.nameCh}
                                            <LeaveIndicator
                                                leaveFlag={pickupModalPlayer.leaveFlag}
                                                leaveDate={pickupModalPlayer.leaveDate}
                                                leaveReason={pickupModalPlayer.leaveReason}
                                            />
                                        </div>
                                        <div className="text-sm text-muted-foreground">{pickupModalPlayer.party}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">{t('pickupModal.lastWeek')}</div>
                                        <div className="text-lg font-bold text-blue-600">
                                            {getPlayerMostRecentScore(pickupModalPlayer.id).toFixed(1)} pts
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Roster selection if full */}
                            {needsReplacement && myTeam && (
                                <div>
                                    <div className="text-sm font-medium mb-2">{t('pickupModal.selectDrop')}</div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {myTeam.legislators.map(leg => {
                                            const isSelected = selectedDropPlayer === leg.id
                                            const isBench = benchIds.has(leg.id)

                                            return (
                                                <div
                                                    key={leg.id}
                                                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'border-red-500 bg-red-500/10' : 'hover:bg-accent'
                                                        }`}
                                                    onClick={() => setSelectedDropPlayer(leg.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {leg.picUrl ? (
                                                            <img src={leg.picUrl} alt={leg.nameCh} className="w-10 h-10 rounded-full" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm">
                                                                {leg.nameCh.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 font-medium">
                                                                {leg.nameCh}
                                                                <LeaveIndicator
                                                                    leaveFlag={leg.leaveFlag}
                                                                    leaveDate={leg.leaveDate}
                                                                    leaveReason={leg.leaveReason}
                                                                />
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {leg.party} {isBench && `• ${t('pickupModal.bench')}`}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-muted-foreground">{t('pickupModal.lastWeek')}</div>
                                                            <div className="font-semibold text-blue-600">
                                                                {getPlayerMostRecentScore(leg.id).toFixed(1)} pts
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 justify-end pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setPickupModalPlayer(null)}
                                    disabled={isPickingUp}
                                >
                                    {t('pickupModal.cancel')}
                                </Button>
                                <Button
                                    onClick={handleConfirmPickup}
                                    disabled={isPickingUp || (needsReplacement && !selectedDropPlayer) || false}
                                >
                                    {isPickingUp ? t('pickupModal.processing') : t('pickupModal.confirm')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PlayerHistoryModal
                legislator={selectedPlayer}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}
