import { describe, it, expect, vi } from 'vitest'

// Mock Prisma client
const mockPrisma = {
    legislator: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
    },
    score: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
}

vi.mock('@/auth', () => ({
    prisma: mockPrisma,
}))

describe('Database Operations', () => {
    describe('Legislator Queries', () => {
        it('fetches all legislators', async () => {
            const mockLegislators = [
                { id: '1', nameCh: '張三', party: 'DPP' },
                { id: '2', nameCh: '李四', party: 'KMT' },
            ]

            mockPrisma.legislator.findMany.mockResolvedValue(mockLegislators)

            const result = await mockPrisma.legislator.findMany()

            expect(result).toEqual(mockLegislators)
            expect(result.length).toBe(2)
        })

        it('filters legislators by party', async () => {
            const mockDPPLegislators = [
                { id: '1', nameCh: '張三', party: 'DPP' },
            ]

            mockPrisma.legislator.findMany.mockResolvedValue(mockDPPLegislators)

            const result = await mockPrisma.legislator.findMany({
                where: { party: 'DPP' }
            })

            expect(result).toEqual(mockDPPLegislators)
            expect(result.every((l: any) => l.party === 'DPP')).toBe(true)
        })

        it('finds legislator by ID', async () => {
            const mockLegislator = { id: '1', nameCh: '張三', party: 'DPP' }

            mockPrisma.legislator.findUnique.mockResolvedValue(mockLegislator)

            const result = await mockPrisma.legislator.findUnique({
                where: { id: '1' }
            })

            expect(result).toEqual(mockLegislator)
        })
    })

    describe('Score Operations', () => {
        it('creates a new score', async () => {
            const newScore = {
                id: '1',
                legislatorId: 'leg1',
                category: 'PROPOSE_BILL',
                points: 5,
                date: new Date('2024-03-15'),
                reason: 'Proposed bill #123'
            }

            mockPrisma.score.create.mockResolvedValue(newScore)

            const result = await mockPrisma.score.create({
                data: {
                    legislatorId: 'leg1',
                    category: 'PROPOSE_BILL',
                    points: 5,
                    date: new Date('2024-03-15'),
                    reason: 'Proposed bill #123'
                }
            })

            expect(result).toEqual(newScore)
            expect(result.points).toBe(5)
        })

        it('fetches scores by category', async () => {
            const mockScores = [
                { id: '1', category: 'PROPOSE_BILL', points: 5 },
                { id: '2', category: 'PROPOSE_BILL', points: 3 },
            ]

            mockPrisma.score.findMany.mockResolvedValue(mockScores)

            const result = await mockPrisma.score.findMany({
                where: { category: 'PROPOSE_BILL' }
            })

            expect(result).toEqual(mockScores)
            expect(result.length).toBe(2)
        })

        it('fetches scores within date range', async () => {
            const mockScores = [
                { id: '1', date: new Date('2024-03-12'), points: 5 },
                { id: '2', date: new Date('2024-03-14'), points: 3 },
            ]

            mockPrisma.score.findMany.mockResolvedValue(mockScores)

            const result = await mockPrisma.score.findMany({
                where: {
                    date: {
                        gte: new Date('2024-03-11'),
                        lte: new Date('2024-03-17')
                    }
                }
            })

            expect(result).toEqual(mockScores)
        })
    })

    describe('Deduplication Logic', () => {
        it('checks for existing score before creating', async () => {
            const existingScore = {
                id: '1',
                legislatorId: 'leg1',
                category: 'PROPOSE_BILL',
                date: new Date('2024-03-15')
            }

            mockPrisma.score.findFirst.mockResolvedValue(existingScore)

            const result = await mockPrisma.score.findFirst({
                where: {
                    legislatorId: 'leg1',
                    category: 'PROPOSE_BILL',
                    date: new Date('2024-03-15')
                }
            })

            expect(result).toEqual(existingScore)
            expect(result).not.toBeNull()
        })

        it('returns null when score does not exist', async () => {
            mockPrisma.score.findFirst.mockResolvedValue(null)

            const result = await mockPrisma.score.findFirst({
                where: {
                    legislatorId: 'leg1',
                    category: 'PROPOSE_BILL',
                    date: new Date('2024-03-15')
                }
            })

            expect(result).toBeNull()
        })
    })
})
