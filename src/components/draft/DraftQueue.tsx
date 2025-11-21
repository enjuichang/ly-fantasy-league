'use client'

import { useState, useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { saveDraftPreferences } from '@/app/actions'
import PlayerHistoryModal from '@/components/team/PlayerHistoryModal'
import { calculateAverageScore } from '@/lib/scoring-client'
import { LeaveIndicator } from '@/components/ui/leave-indicator'
import LegislatorsList from '@/components/shared/LegislatorsList'
import { useTranslations } from 'next-intl'

import type { CategoryScores } from '@/lib/scoring-client'

interface Legislator {
    id: string
    nameCh: string
    nameEn?: string | null
    party: string
    region?: string | null
    picUrl: string | null
    leaveFlag?: string | null
    leaveDate?: string | null
    leaveReason?: string | null
    lastWeekScores?: CategoryScores
    averageScores?: CategoryScores
    scores?: Array<{
        id: string
        date: Date
        points: number
        description: string
        category: string
    }>
}

interface DraftQueueProps {
    leagueId: string
    initialPreferences: Legislator[]
    allLegislators: Legislator[]
    seasonStart: Date
}

function SortableItem({ id, legislator, onRemove, onViewHistory }: { id: string, legislator: Legislator, onRemove: (id: string) => void, onViewHistory: (legislator: Legislator) => void }) {
    const t = useTranslations('draft.queue')
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const avgScore = useMemo(() => {
        if (!legislator.scores || legislator.scores.length === 0) return 0
        return calculateAverageScore(legislator.scores)
    }, [legislator.scores])

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm mb-2 hover:border-primary">
            <div {...attributes} {...listeners} className="flex items-center gap-3 cursor-move flex-1">
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                    ::
                </div>
                {legislator.picUrl ? (
                    <img
                        src={legislator.picUrl}
                        alt={legislator.nameCh}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                        {legislator.nameCh.charAt(0)}
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{legislator.nameCh}</p>
                        <LeaveIndicator
                            leaveFlag={legislator.leaveFlag || null}
                            leaveDate={legislator.leaveDate || null}
                            leaveReason={legislator.leaveReason || null}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">{legislator.party}</p>
                </div>
                <div className="text-right mr-2">
                    <p className="text-sm font-semibold text-blue-600">{avgScore.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{t('avgPerWeek')}</p>
                </div>
            </div>
            <div className="flex gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onViewHistory(legislator)
                    }}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    title={t('viewHistory')}
                >
                    📊
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove(id)
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title={t('remove')}
                >
                    ✕
                </Button>
            </div>
        </div>
    )
}

export default function DraftQueue({ leagueId, initialPreferences, allLegislators, seasonStart }: DraftQueueProps) {
    const t = useTranslations('draft.queue')
    const [preferences, setPreferences] = useState<Legislator[]>(initialPreferences)
    const [search, setSearch] = useState("")

    const [isSaving, setIsSaving] = useState(false)
    const [selectedLegislator, setSelectedLegislator] = useState<Legislator | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    async function handleLegislatorClick(legislator: Legislator) {
        setIsLoadingDetails(true)
        try {
            const response = await fetch(`/api/legislators/${legislator.id}`)
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

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setPreferences((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    function addToQueue(legislator: Legislator) {
        if (!preferences.find(p => p.id === legislator.id)) {
            setPreferences([...preferences, legislator])
        }
    }

    function removeFromQueue(id: string) {
        setPreferences(preferences.filter(p => p.id !== id))
    }

    async function handleSave() {
        setIsSaving(true)
        try {
            await saveDraftPreferences(leagueId, preferences.map(p => p.id))
            // Optional: Show toast success
        } catch (error) {
            console.error("Failed to save", error)
            // Optional: Show toast error
        } finally {
            setIsSaving(false)
        }
    }

    const availableLegislators = allLegislators
        .filter(l => !preferences.find(p => p.id === l.id))
        .filter(l => l.nameCh.toLowerCase().includes(search.toLowerCase()) || l.party.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="grid gap-6 md:grid-cols-2 h-[600px]">
            {/* Left: Available Pool */}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle>{t('available')}</CardTitle>
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mt-2"
                    />
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <LegislatorsList
                        legislators={availableLegislators.map(leg => ({
                            ...leg,
                            nameEn: leg.nameEn || null,
                            region: leg.region || null,
                            leaveFlag: leg.leaveFlag || null,
                            leaveDate: leg.leaveDate || null,
                            leaveReason: leg.leaveReason || null,
                            picUrl: leg.picUrl || null,
                            areaName: leg.region || null,
                            lastWeekScores: leg.lastWeekScores || { PROPOSE_BILL: 0, COSIGN_BILL: 0, FLOOR_SPEECH: 0, WRITTEN_SPEECH: 0, ROLLCALL_VOTE: 0, MAVERICK_BONUS: 0, total: 0 },
                            averageScores: leg.averageScores || { PROPOSE_BILL: 0, COSIGN_BILL: 0, FLOOR_SPEECH: 0, WRITTEN_SPEECH: 0, ROLLCALL_VOTE: 0, MAVERICK_BONUS: 0, total: 0 }
                        }))}
                        onLegislatorClick={handleLegislatorClick}
                        onActionClick={(leg, e) => {
                            e.stopPropagation()
                            addToQueue(leg as Legislator)
                        }}
                        actionLabel={t('add')}
                        showActions={true}
                    />
                </CardContent>
            </Card>

            {/* Right: Preference Queue */}
            <Card className="flex flex-col h-full border-primary/30 bg-primary/10">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t('yourQueue', { count: preferences.length })}</CardTitle>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? t('saving') : t('save')}
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={preferences.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {preferences.map((leg) => (
                                <SortableItem
                                    key={leg.id}
                                    id={leg.id}
                                    legislator={leg}
                                    onRemove={removeFromQueue}
                                    onViewHistory={handleLegislatorClick}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {preferences.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-md">
                            <p>{t('empty')}</p>
                            <p className="text-sm">{t('emptyDescription')}</p>
                        </div>
                    )}
                    <div className="mt-4 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-md">
                        <strong>Note:</strong> {t('autoDraftNote')}
                    </div>
                </CardContent>
            </Card>

            <PlayerHistoryModal
                legislator={selectedLegislator as any}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    )
}
