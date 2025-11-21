import { describe, it, expect } from 'vitest'

describe('Scoring Calculations', () => {
    interface Score {
        points: number
        date: Date
        category: string
    }

    describe('Weekly Score Aggregation', () => {
        function getWeekStart(date: Date): Date {
            const d = new Date(date)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            d.setDate(diff)
            d.setHours(0, 0, 0, 0)
            return d
        }

        function getWeekKey(date: Date): string {
            return getWeekStart(date).toISOString().split('T')[0]
        }

        function aggregateScoresByWeek(scores: Score[]): Map<string, number> {
            const weeklyScores = new Map<string, number>()

            scores.forEach(score => {
                const weekKey = getWeekKey(score.date)
                const current = weeklyScores.get(weekKey) || 0
                weeklyScores.set(weekKey, current + score.points)
            })

            return weeklyScores
        }

        it('aggregates scores by week correctly', () => {
            // Use dates that are clearly in different weeks
            const scores: Score[] = [
                { points: 5, date: new Date('2024-03-11'), category: 'PROPOSE_BILL' }, // Week 1 Monday
                { points: 3, date: new Date('2024-03-12'), category: 'COSIGN_BILL' },  // Week 1 Tuesday
                { points: 2, date: new Date('2024-03-18'), category: 'PROPOSE_BILL' }  // Week 2 Monday
            ]

            const weekly = aggregateScoresByWeek(scores)

            expect(weekly.size).toBe(2)

            const values = Array.from(weekly.values()).sort()
            expect(values).toContain(8) // Week 1: 5 + 3
            expect(values).toContain(2) // Week 2: 2
        })

        it('handles empty scores array', () => {
            const weekly = aggregateScoresByWeek([])
            expect(weekly.size).toBe(0)
        })

        it('handles single score', () => {
            const scores: Score[] = [
                { points: 10, date: new Date('2024-03-15'), category: 'PROPOSE_BILL' }
            ]

            const weekly = aggregateScoresByWeek(scores)
            expect(weekly.size).toBe(1)

            const values = Array.from(weekly.values())
            expect(values[0]).toBe(10)
        })

        it('groups scores from different days in same week', () => {
            const scores: Score[] = [
                { points: 1, date: new Date('2024-03-11'), category: 'PROPOSE_BILL' }, // Monday
                { points: 2, date: new Date('2024-03-13'), category: 'PROPOSE_BILL' }, // Wednesday
                { points: 3, date: new Date('2024-03-17'), category: 'PROPOSE_BILL' }  // Sunday
            ]

            const weekly = aggregateScoresByWeek(scores)
            expect(weekly.size).toBe(1)

            const values = Array.from(weekly.values())
            expect(values[0]).toBe(6) // All in same week
        })
    })

    describe('Category Score Caps', () => {
        function applyCategoryCap(scores: Score[], category: string, maxPoints: number): number {
            const categoryScores = scores.filter(s => s.category === category)
            const total = categoryScores.reduce((sum, s) => sum + s.points, 0)
            return Math.min(total, maxPoints)
        }

        it('applies cap when exceeded', () => {
            const scores: Score[] = [
                { points: 3, date: new Date(), category: 'FLOOR_SPEECH' },
                { points: 3, date: new Date(), category: 'FLOOR_SPEECH' },
                { points: 2, date: new Date(), category: 'FLOOR_SPEECH' }
            ]

            const capped = applyCategoryCap(scores, 'FLOOR_SPEECH', 5)
            expect(capped).toBe(5)
        })

        it('returns actual total when under cap', () => {
            const scores: Score[] = [
                { points: 2, date: new Date(), category: 'FLOOR_SPEECH' },
                { points: 1, date: new Date(), category: 'FLOOR_SPEECH' }
            ]

            const capped = applyCategoryCap(scores, 'FLOOR_SPEECH', 5)
            expect(capped).toBe(3)
        })

        it('ignores other categories', () => {
            const scores: Score[] = [
                { points: 3, date: new Date(), category: 'FLOOR_SPEECH' },
                { points: 10, date: new Date(), category: 'PROPOSE_BILL' }
            ]

            const capped = applyCategoryCap(scores, 'FLOOR_SPEECH', 5)
            expect(capped).toBe(3)
        })

        it('returns 0 when no scores in category', () => {
            const scores: Score[] = [
                { points: 10, date: new Date(), category: 'PROPOSE_BILL' }
            ]

            const capped = applyCategoryCap(scores, 'FLOOR_SPEECH', 5)
            expect(capped).toBe(0)
        })
    })

    describe('Average Score Calculation', () => {
        function getWeekStart(date: Date): Date {
            const d = new Date(date)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            d.setDate(diff)
            d.setHours(0, 0, 0, 0)
            return d
        }

        function getWeekKey(date: Date): string {
            return getWeekStart(date).toISOString().split('T')[0]
        }

        function calculateAverageScore(scores: Score[]): number {
            if (scores.length === 0) return 0

            const weeklyScores = new Map<string, number>()

            scores.forEach(score => {
                const weekKey = getWeekKey(score.date)
                const current = weeklyScores.get(weekKey) || 0
                weeklyScores.set(weekKey, current + score.points)
            })

            const totalPoints = Array.from(weeklyScores.values()).reduce((sum, points) => sum + points, 0)
            return totalPoints / weeklyScores.size
        }

        it('calculates average across multiple weeks', () => {
            const scores: Score[] = [
                { points: 10, date: new Date('2024-03-11'), category: 'PROPOSE_BILL' },
                { points: 5, date: new Date('2024-03-12'), category: 'COSIGN_BILL' },
                { points: 20, date: new Date('2024-03-18'), category: 'PROPOSE_BILL' }
            ]

            const avg = calculateAverageScore(scores)
            // Week 1: 15, Week 2: 20, Average: 17.5
            expect(avg).toBe(17.5)
        })

        it('returns 0 for empty array', () => {
            expect(calculateAverageScore([])).toBe(0)
        })

        it('handles single week', () => {
            const scores: Score[] = [
                { points: 5, date: new Date('2024-03-11'), category: 'PROPOSE_BILL' },
                { points: 3, date: new Date('2024-03-12'), category: 'COSIGN_BILL' }
            ]

            const avg = calculateAverageScore(scores)
            // Both in same week (March 11-17), total 8, average = 8
            expect(avg).toBe(8)
        })

        it('handles multiple weeks with varying scores', () => {
            const scores: Score[] = [
                { points: 10, date: new Date('2024-03-11'), category: 'PROPOSE_BILL' },
                { points: 20, date: new Date('2024-03-18'), category: 'PROPOSE_BILL' },
                { points: 30, date: new Date('2024-03-25'), category: 'PROPOSE_BILL' }
            ]

            const avg = calculateAverageScore(scores)
            // 3 weeks: 10, 20, 30, average = 20
            expect(avg).toBe(20)
        })
    })
})
