'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PlayerHistoryModal from '@/components/team/PlayerHistoryModal'

interface Legislator {
    id?: string
    nameCh: string
    party: string
    picUrl: string | null
    scores?: Array<{
        id: string
        date: Date
        points: number
        reason: string
        category: string
    }>
}

interface DraftPick {
    id: string
    pickNumber: number
    round: number
    legislatorId?: string
    legislator: Legislator
    team: {
        name: string
        owner: {
            name: string | null
            email: string | null
        }
    }
}

interface DraftResultsProps {
    picks: DraftPick[]
}

export default function DraftResults({ picks }: DraftResultsProps) {
    const t = useTranslations('draft.results')
    const [currentRound, setCurrentRound] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1000) // ms per round
    const [selectedLegislator, setSelectedLegislator] = useState<Legislator | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)

    const maxRound = Math.max(...picks.map(p => p.round))
    const visiblePicks = picks.filter(p => p.round <= currentRound)

    useEffect(() => {
        if (isPlaying && currentRound < maxRound) {
            const timer = setTimeout(() => {
                setCurrentRound(prev => prev + 1)
            }, speed)
            return () => clearTimeout(timer)
        } else if (currentRound >= maxRound) {
            setIsPlaying(false)
        }
    }, [isPlaying, currentRound, maxRound, speed])

    const startAnimation = () => {
        setCurrentRound(0)
        setIsPlaying(true)
    }

    const showAll = () => {
        setCurrentRound(maxRound)
        setIsPlaying(false)
    }

    async function handleLegislatorClick(pick: DraftPick) {
        // Try to get the legislator ID from the pick
        const legislatorId = pick.legislatorId || pick.legislator.id

        if (!legislatorId) {
            console.error("No legislator ID found")
            return
        }

        setIsLoadingDetails(true)
        try {
            const response = await fetch(`/api/legislators/${legislatorId}`)
            if (response.ok) {
                const fullData = await response.json()
                setSelectedLegislator(fullData)
                setIsModalOpen(true)
            }
        } catch (error) {
            console.error("Failed to fetch legislator details:", error)
        } finally {
            setIsLoadingDetails(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{t('title')}</CardTitle>
                    <div className="flex gap-2">
                        <Button onClick={startAnimation} disabled={isPlaying} size="sm">
                            {isPlaying ? t('playing') : `▶ ${t('replay')}`}
                        </Button>
                        <Button onClick={showAll} variant="outline" size="sm">
                            {t('showAll')}
                        </Button>
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="px-2 border rounded text-sm"
                        >
                            <option value={500}>{t('speedFast')}</option>
                            <option value={1000}>{t('speedNormal')}</option>
                            <option value={2000}>{t('speedSlow')}</option>
                        </select>
                    </div>
                </div>
                {currentRound > 0 && (
                    <div className="text-sm text-muted-foreground">
                        {t('round', { current: currentRound, total: maxRound })}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => {
                        const roundPicks = picks.filter(p => p.round === round)
                        const isVisible = round <= currentRound

                        return (
                            <div
                                key={round}
                                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="font-bold">
                                        Round {round}
                                    </Badge>
                                    {isVisible && (
                                        <div className="h-px flex-1 bg-border"></div>
                                    )}
                                </div>
                                {isVisible && (
                                    <div className="space-y-2 ml-4">
                                        {roundPicks.map((pick, idx) => (
                                            <div
                                                key={pick.id}
                                                className="flex items-center justify-between border-b pb-2 last:border-0 animate-in fade-in slide-in-from-left cursor-pointer hover:bg-accent rounded px-2 -mx-2"
                                                style={{
                                                    animationDelay: `${idx * 100}ms`,
                                                    animationDuration: '300ms',
                                                    animationFillMode: 'both'
                                                }}
                                                onClick={() => handleLegislatorClick(pick)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full shrink-0">
                                                        {pick.pickNumber}
                                                    </Badge>
                                                    {pick.legislator.picUrl ? (
                                                        <img
                                                            src={pick.legislator.picUrl}
                                                            alt={pick.legislator.nameCh}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                                                            {pick.legislator.nameCh.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{pick.legislator.nameCh}</p>
                                                        <p className="text-sm text-muted-foreground">{pick.legislator.party}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">{pick.team.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {pick.team.owner.name || pick.team.owner.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </CardContent>

            <PlayerHistoryModal
                legislator={selectedLegislator as any}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </Card>
    )
}
