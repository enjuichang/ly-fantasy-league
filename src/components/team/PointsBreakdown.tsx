'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Score {
    description: string
    points: number
    category: string
}

interface PointsBreakdownProps {
    scores: Score[]
    totalPoints: number
}

export default function PointsBreakdown({ scores, totalPoints }: PointsBreakdownProps) {
    const byCategory = scores.reduce((acc, score) => {
        if (!acc[score.category]) {
            acc[score.category] = { count: 0, points: 0 }
        }
        acc[score.category].count++
        acc[score.category].points += score.points
        return acc
    }, {} as Record<string, { count: number, points: number }>)

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="font-bold text-blue-600 cursor-help underline decoration-dotted">
                        {totalPoints}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2">
                        <p className="font-semibold text-sm">Points Breakdown</p>
                        {Object.entries(byCategory).map(([category, data]) => (
                            <div key={category} className="flex justify-between gap-4 text-xs">
                                <span className="text-muted-foreground">
                                    {category} ({data.count})
                                </span>
                                <span className="font-medium">
                                    {data.points >= 0 ? '+' : ''}{data.points}
                                </span>
                            </div>
                        ))}
                        <div className="pt-2 mt-2 border-t flex justify-between text-sm font-bold">
                            <span>Total</span>
                            <span>{totalPoints}</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
