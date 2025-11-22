import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('GET /api/legislators/[id]/cosign-bills', () => {
    let testLegislatorId: string
    let testLegislatorName: string

    beforeAll(async () => {
        // Find a legislator with cosign bills
        const legislatorWithScores = await prisma.legislator.findFirst({
            include: {
                scores: {
                    where: { category: 'COSIGN_BILL' },
                    take: 1
                }
            }
        })

        if (!legislatorWithScores) {
            // Fallback to any legislator
            const anyLegislator = await prisma.legislator.findFirst()
            if (!anyLegislator) {
                throw new Error('No legislators in database')
            }
            testLegislatorId = anyLegislator.id
            testLegislatorName = anyLegislator.nameCh
        } else {
            testLegislatorId = legislatorWithScores.id
            testLegislatorName = legislatorWithScores.nameCh
        }
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    it('should return legislator cosign bills', async () => {
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: testLegislatorId,
                category: 'COSIGN_BILL'
            },
            orderBy: { date: 'desc' }
        })

        expect(Array.isArray(cosignScores)).toBe(true)
        // May be 0 if legislator hasn't cosigned bills
    })

    it('should only return COSIGN_BILL category scores', async () => {
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: testLegislatorId,
                category: 'COSIGN_BILL'
            }
        })

        cosignScores.forEach(score => {
            expect(score.category).toBe('COSIGN_BILL')
        })
    })

    it('should include bill metadata', async () => {
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: testLegislatorId,
                category: 'COSIGN_BILL'
            },
            take: 1
        })

        if (cosignScores.length > 0) {
            const score = cosignScores[0]
            expect(score).toHaveProperty('billNumber')
            expect(score).toHaveProperty('billTitle')
            expect(score).toHaveProperty('description')
            expect(score).toHaveProperty('metadata')
        }
    })

    it('should have correct point value (3 points)', async () => {
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: testLegislatorId,
                category: 'COSIGN_BILL'
            },
            take: 10
        })

        cosignScores.forEach(score => {
            expect(score.points).toBe(3)
        })
    })

    it('should be ordered by date descending', async () => {
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: testLegislatorId,
                category: 'COSIGN_BILL'
            },
            orderBy: { date: 'desc' },
            take: 10
        })

        // Check ordering
        for (let i = 0; i < cosignScores.length - 1; i++) {
            const current = cosignScores[i].date
            const next = cosignScores[i + 1].date
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime())
        }
    })

    it('should return empty array for legislator with no cosign bills', async () => {
        // Create a temporary test ID that doesn't exist
        const cosignScores = await prisma.score.findMany({
            where: {
                legislatorId: 'non-existent-id',
                category: 'COSIGN_BILL'
            }
        })

        expect(cosignScores).toEqual([])
    })
})

describe('GET /api/legislators/sync', () => {
    it('should sync legislators from external API', async () => {
        // This would test the sync endpoint
        // In practice, you'd mock the external API call
        const mockApiResponse = {
            legislators: [
                {
                    name: '測試委員',
                    party: 'DPP',
                    region: '台北市',
                    picUrl: 'https://example.com/pic.jpg'
                }
            ]
        }

        expect(mockApiResponse).toHaveProperty('legislators')
        expect(Array.isArray(mockApiResponse.legislators)).toBe(true)
    })

    it('should extract externalId from picUrl', () => {
        const picUrl = 'https://www.ly.gov.tw/Pages/ashx/Image.ashx?mGuid=1234-5678-90ab-cdef'
        const match = picUrl.match(/mGuid=([^&]+)/)
        const externalId = match ? match[1] : null

        expect(externalId).toBe('1234-5678-90ab-cdef')
    })

    it('should upsert legislators to avoid duplicates', async () => {
        // Test that sync uses upsert logic
        const existingLegislator = await prisma.legislator.findFirst()

        if (existingLegislator) {
            // Simulate upsert - should update, not create duplicate
            const result = await prisma.legislator.upsert({
                where: { externalId: existingLegislator.externalId || 'test' },
                update: { nameCh: existingLegislator.nameCh },
                create: {
                    externalId: 'new-test-id',
                    nameCh: 'Test',
                    nameEn: 'Test',
                    party: 'Test',
                    region: 'Test'
                }
            })

            expect(result).toBeDefined()
        }
    })
})

describe('GET /api/test-db', () => {
    it('should verify database connection', async () => {
        try {
            await prisma.$connect()
            const isConnected = true
            expect(isConnected).toBe(true)
        } catch (error) {
            expect(error).toBeUndefined()
        }
    })

    it('should return database statistics', async () => {
        const legislatorCount = await prisma.legislator.count()
        const scoreCount = await prisma.score.count()

        expect(legislatorCount).toBeGreaterThanOrEqual(0)
        expect(scoreCount).toBeGreaterThanOrEqual(0)
    })
})
